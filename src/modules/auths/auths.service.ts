import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Users } from '../users/Entyties/users.entity';
import { UsersService } from '../users/users.service';
import { AuthResponse, GoogleUser, IUserAuthResponse } from './interface/IAuth.interface';
import { CreateUserDto } from '../users/Dtos/CreateUserDto';
import { ResponseUserDto } from '../users/interface/IUserResponseDto';
import { AuthValidations } from './validate/auth.validate';

@Injectable()
export class AuthsService {
  private readonly logger = new Logger(AuthsService.name);

  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async signin(email: string, password: string): Promise<AuthResponse> {
    AuthValidations.validateCredentials(email, password);

    const user = await this.findUserByEmail(email);
    AuthValidations.validateUserHasPassword(user);
    await AuthValidations.validatePassword(password, user.password);

    this.logger.log(`Usuario ${email} ha iniciado sesión exitosamente`);

    console.log(this.generateAuthResponse(user));

    return this.generateAuthResponse(user);
  }

  async signup(data: CreateUserDto): Promise<ResponseUserDto> {
    const { password, confirmPassword, ...userData } = data;

    AuthValidations.validatePasswordMatch(password, confirmPassword);

    const existingEmailUser = await this.userService.findByEmail(userData.email);
    AuthValidations.validateEmailIsNotTaken(existingEmailUser?.email);

    const existingUsernameUser = await this.usersRepository.findOne({
      where: { username: userData.username },
      select: ['id', 'username'],
    });

    if (existingUsernameUser) {
      AuthValidations.validateUserNameExist(userData.username, existingUsernameUser);
    }

    try {
      const hashedPassword = await AuthValidations.hashPassword(password);
      const newUser = await this.userService.createUserService({
        ...userData,
        password: hashedPassword,
        isAdmin: false,
        isSuperAdmin: false,
      });

      this.logger.log(`Usuario registrado exitosamente: ${newUser.email}`);

      return ResponseUserDto.toDTO(newUser);
    } catch (error) {
      AuthValidations.handleSignupError(error);
    }
  }

  async googleLogin(googleUser: GoogleUser): Promise<AuthResponse> {
    this.validateGoogleUser(googleUser);

    const existingUser = await this.userService.findByEmail(googleUser.email);
    let authenticatedUser: IUserAuthResponse;
    let isNewUser = false;

    if (!existingUser) {
      authenticatedUser = await this.createUserFromGoogleProfile(googleUser);
      isNewUser = true;
    } else {
      authenticatedUser = existingUser as IUserAuthResponse;
    }

    if (isNewUser) {
      this.logger.log(`Nuevo usuario creado via Google OAuth: ${googleUser.email}`);
    } else {
      this.logger.log(`Usuario existente autenticado via Google OAuth: ${googleUser.email}`);
    }

    return this.generateAuthResponse(authenticatedUser);
  }

  private async createUserFromGoogleProfile(googleUser: GoogleUser): Promise<IUserAuthResponse> {
    const randomPassword = await AuthValidations.generateRandomPassword();
    const username = AuthValidations.generateUsernameFromEmail(googleUser.email);

    const createdUser = await this.userService.createUserService({
      name: googleUser.name,
      email: googleUser.email,
      birthdate: new Date().toISOString().split('T')[0],
      username,
      password: randomPassword,
      phone: 0,
      address: 'Sin dirección',
      isAdmin: false,
      isSuperAdmin: false,
    });

    this.logger.log(`Usuario creado via Google OAuth: ${googleUser.email}`);

    return createdUser as IUserAuthResponse;
  }

  private generateAuthResponse(user: IUserAuthResponse): AuthResponse {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
    };

    console.log(payload);

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      expiresIn: 3600,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        birthdate: user.birthdate,
        address: user.address,
        username: user.username,
        phone: user.phone,
      },
    };
  }

  private async findUserByEmail(email: string): Promise<IUserAuthResponse & { password?: string }> {
    const foundUser = await this.userService.findByEmail(email);
    if (!foundUser) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return foundUser as IUserAuthResponse & { password?: string };
  }

  private validateGoogleUser(googleUser: GoogleUser): void {
    if (!googleUser?.email) {
      throw new BadRequestException('Email required for authentication with Google');
    }
  }
}
