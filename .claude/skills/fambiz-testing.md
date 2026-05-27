# fambiz-testing

FamBiz の NestJS Service ユニットテスト作成パターン。`family.service.spec.ts` の実装を基準にする。

## 使用タイミング

- 新しい Service に `*.service.spec.ts` を追加するとき
- 既存テストにケースを追加するとき

---

## ファイル配置

```
apps/api/src/modules/<domain>/
└── <domain>.service.spec.ts   # Service ロジックのみテスト対象
```

---

## テストファイルの基本構造

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { <Domain>Service } from './<domain>.service';
import { <Domain>Repository } from './<domain>.repository';
import type { <Type> } from '@fambiz/types';

// =========================================================================
// Repository のモック（全メソッドを jest.fn() で定義）
// =========================================================================

const mock<Domain>Repository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

// =========================================================================
// テスト本体
// =========================================================================

describe('<Domain>Service', () => {
  let service: <Domain>Service;

  // テスト用固定データ
  const mockItem: <Type> = {
    id: 'item-id-001',
    group_id: 'group-id-001',
    // ... 型に合わせて埋める
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const familyGroupId = 'group-id-001';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        <Domain>Service,
        {
          provide: <Domain>Repository,
          useValue: mock<Domain>Repository,
        },
      ],
    }).compile();

    service = module.get<<Domain>Service>(<Domain>Service);

    // 各テスト前にモックをリセット（必須）
    jest.clearAllMocks();
  });

  it('サービスが正常に生成されること', () => {
    expect(service).toBeDefined();
  });

  // 各メソッドのテスト群...
});
```

---

## テストケースパターン

### 正常系（正しい引数・期待値の確認）

```typescript
it('正常に<操作>できること', async () => {
  mock<Domain>Repository.<method>.mockResolvedValue(mockItem);

  const result = await service.<method>(familyGroupId, /* args */);

  expect(result).toEqual(mockItem);
  expect(mock<Domain>Repository.<method>).toHaveBeenCalledWith(
    familyGroupId, /* args */
  );
});
```

### 異常系（例外スロー確認）

```typescript
it('<条件>の場合は <ExceptionType> をスロー', async () => {
  mock<Domain>Repository.findById.mockResolvedValue(null);

  await expect(service.<method>(familyGroupId, 'not-exist')).rejects.toThrow(
    NotFoundException,
  );
  // 後続処理が呼ばれないことも確認
  expect(mock<Domain>Repository.update).not.toHaveBeenCalled();
});
```

### 実行順序の確認（副作用が複数ある場合）

```typescript
it('処理が正しい順序で実行されること', async () => {
  mock<Domain>Repository.create.mockResolvedValue(mockItem);
  mock<Domain>Repository.update.mockResolvedValue(undefined);

  await service.<method>(/* args */);

  const createOrder = mock<Domain>Repository.create.mock.invocationCallOrder[0];
  const updateOrder = mock<Domain>Repository.update.mock.invocationCallOrder[0];
  expect(createOrder).toBeLessThan(updateOrder);
});
```

---

## タスクステータス遷移テスト

ステータス遷移の不正チェックは必ずテストする。

```typescript
describe('<method>', () => {
  const validTransitions = [
    { from: 'pending', to: 'reported' },
    { from: 'reported', to: 'completed' },
  ];
  const invalidTransitions = [
    { from: 'completed', to: 'pending' },
    { from: 'cancelled', to: 'reported' },
  ];

  validTransitions.forEach(({ from, to }) => {
    it(`${from} → ${to} は許可されること`, async () => { ... });
  });

  invalidTransitions.forEach(({ from, to }) => {
    it(`${from} → ${to} は BadRequestException をスロー`, async () => { ... });
  });
});
```

---

## チェックリスト

- [ ] `jest.clearAllMocks()` を `beforeEach` に配置
- [ ] Repository の全メソッドをモックオブジェクトに定義
- [ ] 正常系: 戻り値 + 呼び出し引数を `expect` で確認
- [ ] 異常系: 例外の型を `rejects.toThrow(ExceptionType)` で確認
- [ ] 異常系: 後続処理が `not.toHaveBeenCalled()` であることを確認
- [ ] タスクステータス遷移の全パターン（正常・不正）をカバー

---

## 実行コマンド

```bash
# 単一ファイル
pnpm --filter api test family.service.spec.ts

# 全テスト
pnpm test

# カバレッジ付き
pnpm test:cov
```
