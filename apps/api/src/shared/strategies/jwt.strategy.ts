import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import jwksRsa from 'jwks-rsa';
import { JwtPayload } from '@fambiz/types';

/**
 * Supabase JWT を検証する Passport ストラテジー。
 * Supabase は ES256（ECDSA）を使用するため、JWKS エンドポイントから公開鍵を取得して検証する。
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const supabaseUrl = configService.getOrThrow<string>('SUPABASE_URL');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // JWKS エンドポイントから公開鍵を動的に取得（ES256 対応）
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
      }),
      algorithms: ['ES256'],
    });
  }

  /**
   * JWTペイロードを検証し、request.user にセットする値を返す。
   * Supabase JWT の sub は auth.users の UUID。
   */
  validate(payload: Record<string, unknown>): JwtPayload {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('不正なJWTペイロードです');
    }

    return {
      sub: payload.sub as string,
      email: payload.email as string,
      name: (payload['name'] as string) ?? '',
      role: (payload['role'] as JwtPayload['role']) ?? 'child',
      family_group_id: (payload['family_group_id'] as string) ?? '',
      iat: payload.iat as number | undefined,
      exp: payload.exp as number | undefined,
    };
  }
}
