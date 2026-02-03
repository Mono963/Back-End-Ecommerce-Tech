import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { Users } from '../users/entities/users.entity';
import { AuthCodeData, AuthResponse, GoogleUser } from './interface/IAuth.interface';
import { UserMapper } from '../users/mappers/user.mapper';
import { AuthValidations } from './validate/auth.validate';
import { Role } from '../roles/entities/role.entity';
import { ICreateUser, IUserResponse } from '../users/interfaces/user.interface';
import { MailQueueService } from '../mail/mail-queue_email.service';

@Injectable()
export class AuthsService {
  private readonly logger = new Logger(AuthsService.name);

  private authCodes = new Map<string, AuthCodeData>();

  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    private readonly jwtService: JwtService,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly configService: ConfigService,
    private readonly mailQueue: MailQueueService,
  ) {}

  async singin(email: string, password: string): Promise<AuthResponse> {
    AuthValidations.validateCredentials(email, password);

    const user = await this.usersRepository.findOne({
      where: { email },
      relations: ['role'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    AuthValidations.validateUserHasPassword(user);
    await AuthValidations.validatePassword(password, user.password);

    this.logger.log(`User ${email} signed in successfully`);

    void this.mailQueue.queueLoginNotification(user.email, user.name);

    return this.generateAuthResponse(user);
  }

  async signup(data: ICreateUser): Promise<IUserResponse> {
    const { password, confirmPassword, ...userData } = data;

    AuthValidations.validatePasswordMatch(password, confirmPassword);

    const existingEmailUser = await this.usersRepository.findOne({
      where: { email: userData.email },
    });
    AuthValidations.validateEmailIsNotTaken(existingEmailUser?.email);

    const existingUsernameUser = await this.usersRepository.findOne({
      where: { username: userData.username },
    });
    if (existingUsernameUser) {
      AuthValidations.validateUserNameExist(userData.username, existingUsernameUser);
    }

    try {
      let clientRole = await this.roleRepository.findOne({
        where: { name: 'CLIENT' },
      });

      if (!clientRole) {
        clientRole = await this.roleRepository.save({
          name: 'CLIENT',
          description: 'Client who books properties',
          permissions: {
            bookings: ['create', 'read'],
            reviews: ['create', 'read'],
          },
        });
      }

      const hashedPassword = await AuthValidations.hashPassword(password);

      const newUser = this.usersRepository.create({
        ...userData,
        password: hashedPassword,
        role: clientRole,
      });

      const savedUser = await this.usersRepository.save(newUser);

      this.logger.log(`User registered successfully: ${savedUser.email}`);

      if (savedUser) {
        void this.mailQueue.queueWelcomeEmail(savedUser.email, savedUser.name);
      }

      return UserMapper.toResponse(savedUser);
    } catch (error) {
      AuthValidations.handleSignupError(error);
    }
  }

  async googleLogin(googleUser: GoogleUser): Promise<AuthResponse> {
    this.validateGoogleUser(googleUser);

    const existingUser = await this.usersRepository.findOne({
      where: { email: googleUser.email },
      relations: ['role'],
    });

    let authenticatedUser: Users;
    let isNewUser = false;

    if (!existingUser) {
      authenticatedUser = await this.createUserFromGoogleProfile(googleUser);
      isNewUser = true;
    } else {
      authenticatedUser = existingUser;
    }

    if (isNewUser) {
      this.logger.log(`New user created via Google OAuth: ${googleUser.email}`);
    } else {
      this.logger.log(`Existing user authenticated via Google OAuth: ${googleUser.email}`);
    }

    return this.generateAuthResponse(authenticatedUser);
  }

  private async createUserFromGoogleProfile(googleUser: GoogleUser): Promise<Users> {
    const randomPassword = await AuthValidations.generateRandomPassword();
    const username = AuthValidations.generateUsernameFromEmail(googleUser.email);

    let clientRole = await this.roleRepository.findOne({
      where: { name: 'CLIENT' },
    });

    if (!clientRole) {
      clientRole = await this.roleRepository.save({
        name: 'CLIENT',
        description: 'Client who books properties',
        permissions: {
          bookings: ['create', 'read'],
          reviews: ['create', 'read'],
        },
      });
    }

    const createdUser = this.usersRepository.create({
      name: googleUser.name,
      email: googleUser.email,
      birthDate: new Date().toISOString().split('T')[0],
      username,
      password: randomPassword,
      phone: '+10000000000',
      role: clientRole,
    });

    const savedUser = await this.usersRepository.save(createdUser);

    this.logger.log(`User created via Google OAuth: ${googleUser.email}`);

    return savedUser;
  }

  private generateAuthResponse(entity: Users): AuthResponse {
    const payload = {
      sub: entity.id,
      email: entity.email,
      name: entity.name,
      role: entity.role?.name || 'CLIENT',
      permissions: entity.role?.permissions || {},
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      expiresIn: 3600,
      user: {
        id: entity.id,
        name: entity.name,
        email: entity.email,
        role: entity.role?.name || 'CLIENT',
        username: entity.username,
        phone: entity.phone,
        birthDate: entity.birthDate,
      },
    };
  }

  private validateGoogleUser(googleUser: GoogleUser): void {
    if (!googleUser?.email) {
      throw new BadRequestException('Email required for authentication with Google');
    }
  }

  generateAuthCode(userId: string, accessToken: string): string {
    const code = randomUUID();
    const expiresAt = Date.now() + 30000;

    this.authCodes.set(code, {
      token: accessToken,
      userId,
      expiresAt,
    });
    setTimeout(() => {
      this.authCodes.delete(code);
    }, 30000);

    this.logger.log(`Authorization code generated for user: ${userId}`);

    return code;
  }

  exchangeAuthCode(code: string): { accessToken: string; userId: string } {
    const data = this.authCodes.get(code);

    if (!data) {
      this.logger.warn(`Exchange attempt with invalid code: ${code}`);
      throw new UnauthorizedException('Invalid authorization code');
    }

    if (Date.now() > data.expiresAt) {
      this.authCodes.delete(code);
      this.logger.warn(`Exchange attempt with expired code: ${code}`);
      throw new UnauthorizedException('Authorization code expired');
    }

    this.authCodes.delete(code);

    this.logger.log(`Authorization code exchanged successfully for user: ${data.userId}`);

    return {
      accessToken: data.token,
      userId: data.userId,
    };
  }
}
