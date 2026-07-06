import type { NextConfig } from "next";

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_API_URL',
];

// 本番ビルド時に必須 env var が未設定ならビルドを失敗させる
if (process.env.NODE_ENV === 'production') {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`[next.config] 必須環境変数が未設定です: ${missing.join(', ')}`);
  }
}

const nextConfig: NextConfig = {};

export default nextConfig;
