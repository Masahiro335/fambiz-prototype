import type { StorybookConfig } from '@storybook/nextjs';
import path from 'path';

// Next.js 15.3.x の loadConfig が loadWebpackHook() を呼び出し、
// webpack require を Next.js のコンパイル済み webpack に置き換えてしまう問題を回避する。
// このフラグを立てることで loadWebpackHook の実行をスキップさせる。
process.env.__NEXT_PRIVATE_RENDER_WORKER = '1';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  staticDirs: ['../public'],
  docs: {
    autodocs: 'tag',
  },
  webpackFinal: async (config) => {
    // fork-ts-checker-webpack-plugin を無効化（環境のファイルシステム制約で動作不可）
    config.plugins = config.plugins?.filter(
      (p: any) => p?.constructor?.name !== 'ForkTsCheckerWebpackPlugin',
    );

    // tsconfig の @ エイリアスを絶対パスに変換する
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, '../src'),
    };

    // webpack context を apps/web に設定
    config.context = path.resolve(__dirname, '..');

    // entry が未設定の場合は仮エントリを設定（後で Storybook が上書きする）
    if (!config.entry) {
      config.entry = {};
    }

    return config;
  },
};

export default config;
