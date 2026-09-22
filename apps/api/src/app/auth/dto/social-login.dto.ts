import { IsString } from 'class-validator';

/**
 * O front autentica com o SDK do provedor (Google Identity Services / Sign
 * in with Apple JS) e envia apenas o id_token resultante — a API só precisa
 * validar a assinatura, nunca lida com client secret ou redirect OAuth.
 */
export class SocialLoginDto {
  @IsString()
  idToken!: string;
}
