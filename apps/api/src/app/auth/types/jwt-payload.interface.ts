export interface JwtPayload {
  sub: string;
  email: string;
  // Preenchido pelo jsonwebtoken ao assinar (segundos desde a época).
  iat?: number;
}
