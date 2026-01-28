import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import { Users } from '../users/entities/users.entity';
import { AuthCodeData, AuthResponse, GoogleUser } from './interface/IAuth.interface';
import { CreateUserDto } from '../users/Dtos/CreateUserDto';
import { ResponseUserDto } from '../users/interface/IUserResponseDto';
import { AuthValidations } from './validate/auth.validate';
import { Role } from '../roles/entities/role.entity';

@Injectable()
export class AuthsService {
  private readonly logger = new Logger(AuthsService.name);

  // Almacén temporal de códigos de autorización (en producción considerar Redis)
  private authCodes = new Map<string, AuthCodeData>();

  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
    private readonly jwtService: JwtService,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    private readonly configService: ConfigService,
  ) {}

  async singin(email: string, password: string): Promise<AuthResponse> {
    AuthValidations.validateCredentials(email, password);

    const user = await this.usersRepository.findOne({
      where: { email },
      relations: ['role'],
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    AuthValidations.validateUserHasPassword(user);
    await AuthValidations.validatePassword(password, user.password);

    this.logger.log(`Usuario ${email} ha iniciado sesión exitosamente`);

    return this.generateAuthResponse(user);
  }

  async signup(data: CreateUserDto): Promise<ResponseUserDto> {
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
          description: 'Cliente que reserva propiedades',
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

      this.logger.log(`Usuario registrado exitosamente: ${savedUser.email}`);

      return ResponseUserDto.toDTO(savedUser);
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
      this.logger.log(`Nuevo usuario creado via Google OAuth: ${googleUser.email}`);
    } else {
      this.logger.log(`Usuario existente autenticado via Google OAuth: ${googleUser.email}`);
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
        description: 'Cliente que reserva propiedades',
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
      role: clientRole, // ✅ Asignar rol
    });

    const savedUser = await this.usersRepository.save(createdUser);

    this.logger.log(`Usuario creado via Google OAuth: ${googleUser.email}`);

    return savedUser;
  }

  private generateAuthResponse(entity: Users): AuthResponse {
    const payload = {
      sub: entity.id,
      email: entity.email,
      name: entity.name,
      role: entity.role?.name || 'CLIENT', // ✅ ROL desde la entidad
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

  /**
   * Genera un código de autorización temporal para el flujo OAuth seguro.
   * El código expira en 30 segundos y solo puede usarse una vez.
   */
  generateAuthCode(userId: string, accessToken: string): string {
    const code = randomUUID();
    const expiresAt = Date.now() + 30000; // 30 segundos

    this.authCodes.set(code, {
      token: accessToken,
      userId,
      expiresAt,
    });

    // Limpiar código expirado automáticamente
    setTimeout(() => {
      this.authCodes.delete(code);
    }, 30000);

    this.logger.log(`Código de autorización generado para usuario: ${userId}`);

    return code;
  }

  /**
   * Intercambia un código de autorización por el token de acceso.
   * El código solo puede usarse una vez y debe estar dentro del tiempo de expiración.
   */
  exchangeAuthCode(code: string): { accessToken: string; userId: string } {
    const data = this.authCodes.get(code);

    if (!data) {
      this.logger.warn(`Intento de intercambio con código inválido: ${code}`);
      throw new UnauthorizedException('Código de autorización inválido');
    }

    if (Date.now() > data.expiresAt) {
      this.authCodes.delete(code);
      this.logger.warn(`Intento de intercambio con código expirado: ${code}`);
      throw new UnauthorizedException('Código de autorización expirado');
    }

    // Eliminar código después de usarlo (un solo uso)
    this.authCodes.delete(code);

    this.logger.log(`Código intercambiado exitosamente para usuario: ${data.userId}`);

    return {
      accessToken: data.token,
      userId: data.userId,
    };
  }
}
