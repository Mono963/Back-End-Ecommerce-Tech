import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthRequest } from 'src/common/auths/auth-request.interface';
import { JwtPayload } from 'src/common/auths/auth.payload';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const authHeader = request.headers['authorization'];

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de autenticación requerido');
    }

    const token = authHeader.split(' ')[1];

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: process.env.SUPABASE_JWT_SECRET,
      });

      request.user = {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        username: payload.username,
        isSuperAdmin: payload.isSuperAdmin || false,
        isAdmin: payload.isAdmin || false,
        exp: payload.exp,
        iat: payload.iat,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
