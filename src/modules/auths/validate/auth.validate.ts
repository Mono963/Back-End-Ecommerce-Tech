import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { GoogleUser, IUserAuthResponse } from '../interface/IAuth.interface';
import { Users } from 'src/modules/users/Entyties/users.entity';

export class AuthValidations {
  private static readonly BCRYPT_ROUNDS = 12;

  static validateCredentials(email: string, password: string): void {
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }
  }

  static validatePasswordMatch(password: string, confirmPassword: string): void {
    if (!password || !confirmPassword) {
      throw new BadRequestException('You must provide both passwords');
    }

    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }
  }

  static generateUsernameFromEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      throw new BadRequestException('Valid email required to generate username');
    }
    return email.split('@')[0];
  }

  static async generateRandomPassword(): Promise<string> {
    const bcrypt = await import('bcrypt');
    const randomString = `${Math.random().toString(36).slice(-8)}Aa1!`;
    return await bcrypt.hash(randomString, this.BCRYPT_ROUNDS);
  }

  static handleSignupError(error: any): never {
    console.error('[AuthsService:signup] →', error);

    if (error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code === '23505') {
      throw new BadRequestException('The email or username already exists');
    }

    throw new InternalServerErrorException('Error registering user');
  }

  static validateUserExists(user: any): asserts user is IUserAuthResponse {
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  static validateUserNameExist(userName: string, user: Users): void {
    if (user.username === userName) {
      throw new ConflictException(`Username '${userName}' already exists`);
    }
  }

  static validateEmailIsNotTaken(email?: string | null): void {
    if (email) {
      throw new UnauthorizedException('El email ya está registrado');
    }
  }

  static validateUserHasPassword(
    user: IUserAuthResponse & { password?: string },
  ): asserts user is IUserAuthResponse & { password: string } {
    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  static async validatePassword(inputPassword: string, hashedPassword: string): Promise<void> {
    const bcrypt = await import('bcrypt');
    const isValidPassword = await bcrypt.compare(inputPassword, hashedPassword);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  static async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcrypt');
    return await bcrypt.hash(password, this.BCRYPT_ROUNDS);
  }

  static validateGoogleUser(googleUser: GoogleUser): void {
    if (!googleUser?.email) {
      throw new BadRequestException('Email required for authentication with Google');
    }
  }

  static getUserDisplayName(user: IUserAuthResponse | { name?: string; username?: string }): string {
    if (!user) return 'User';
    return user.name || user.username || 'User';
  }

  static async validateNewPasswordIsDifferent(newPassword: string, currentHashedPassword: string): Promise<void> {
    const bcrypt = await import('bcrypt');
    const isSame = await bcrypt.compare(newPassword, currentHashedPassword);
    if (isSame) {
      throw new BadRequestException('La nueva contraseña no puede ser igual a la actual');
    }
  }
}
