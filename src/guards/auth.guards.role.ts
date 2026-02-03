import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guards';
import { UserRole } from 'src/decorator/role.decorator';
import { AuthRequest } from 'src/common/auths/auth-request.interface';

@Injectable()
export class RoleGuard extends AuthGuard implements CanActivate {
  private readonly roleHierarchy: Record<string, string[]> = {
    SUPER_ADMIN: ['SUPER_ADMIN', 'ADMIN', 'CLIENT'],
    ADMIN: ['ADMIN', 'CLIENT'],
    CLIENT: ['CLIENT'],
  };

  constructor(
    private reflector: Reflector,
    jwtService: JwtService,
  ) {
    super(jwtService);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const canActivate = await super.canActivate(context);
    if (!canActivate) return false;
    const roles = this.reflector.get<UserRole[]>('roles', context.getHandler());

    if (!roles || roles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthRequest>();
    const user = request.user;

    const userEffectiveRoles = this.roleHierarchy[user.role] || [user.role];

    const requiredRoles = roles.map((role) => String(role));

    const hasRequiredRole = requiredRoles.some((requiredRole) => userEffectiveRoles.includes(requiredRole));

    if (!hasRequiredRole) {
      throw new ForbiddenException(
        `Access restricted. This action requires one of the following roles: ${requiredRoles.join(', ')}. ` +
          `Your role: ${user.role}`,
      );
    }

    return true;
  }
}
