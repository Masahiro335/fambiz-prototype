import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '@fambiz/types';

/**
 * Supabase JWT をパース・検証する Passport ストラテジー。
 * Authorization: Bearer <token> ヘッダーからトークンを取得し、
 * SUPABASE_JWT_SECRET（HS256）で署名を検証する。
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      // Authorization: Bearer ヘッダーからトークンを抽出
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // 有効期限切れのトークンを拒否
      ignoreExpiration: false,
      // Supabase の JWT 署名シークレット（HS256）
      secretOrKey: configService.getOrThrow<string>('SUPABASE_JWT_SECRET'),
    });
  }

  /**
   * JWTペイロードを検証し、request.user にセットする値を返す。
   * Supabase JWT の sub は auth.users の UUID。
   */
  validate(payload: Record<string, unknown>): JwtPayload {
    // 必須クレームの存在確認
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('不正なJWTペイロードです');
    }

    return {
      sub: payload.sub as string,
      email: payload.email as string,
      // Supabase JWT の app_metadata / user_metadata から role と family_group_id を取得
      name: (payload['name'] as string) ?? '',
      role: (payload['role'] as JwtPayload['role']) ?? 'child',
      family_group_id: (payload['family_group_id'] as string) ?? '',
      iat: payload.iat as number | undefined,
      exp: payload.exp as number | undefined,
    };
  }
}
