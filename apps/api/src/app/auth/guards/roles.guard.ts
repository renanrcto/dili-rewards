import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { User, UserRole } from '../../users/entities/user.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

// Deve rodar depois do JwtAuthGuard, que popula request.user. O role vem
// do banco (JwtStrategy.validate), não do token — então promover ou
// rebaixar um usuário vale na próxima requisição.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!roles?.length) return true;

    const { user } = context
      .switchToHttp()
      .getRequest<Request & { user?: User }>();
    return !!user && roles.includes(user.role);
  }
}
