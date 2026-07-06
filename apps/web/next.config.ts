import type { NextConfig } from "next";

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_API_URL',
];

// NEXT_VALIDATE_ENV=1 のときのみ必須 env var をチェック（deploy-web.yml の vercel build ステップで設定）
if (process.env.NEXT_VALIDATE_ENV === '1') {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`[next.config] 必須環境変数が未設定です: ${missing.join(', ')}`);
  }
}

const nextConfig: NextConfig = {};

export default nextConfig;
