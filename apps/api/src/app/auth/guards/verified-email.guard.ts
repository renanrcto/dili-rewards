import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { User } from '../../users/entities/user.entity';

// Deve rodar depois do JwtAuthGuard. Barra contas com o e-mail ainda não
// confirmado — usar na troca de pontos.
@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context
      .switchToHttp()
      .getRequest<Request & { user?: User }>();
    if (!user?.emailVerifiedAt) {
      throw new ForbiddenException(
        'Confirme seu e-mail no perfil para trocar pontos.',
      );
    }
    return true;
  }
}
