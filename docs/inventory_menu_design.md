# 食材在庫管理・大人用献立提案：技術設計書

> 本ドキュメントは新スコープ（食材在庫管理・大人用献立提案・ぴよログ連携）の技術仕様・データモデルをまとめたものです。
> ユースケース・画面構成の詳細は `inventory_menu_usecase_ui.md` を参照してください。
> 週間献立表（`MenuPlan`／`MenuLog`）は旧スコープ（M2）からの継続機能です。型定義は `mealtracking_m2_design.md` 2章を参照してください（本ドキュメントでは再掲しません）。
> 旧スコープの`Food`・`MealRecord`等は廃止対象です（`mealtracking_usecase_ui.md` 10章、`scope_migration_claude_code_instructions.md`参照）。本ドキュメントの`Food`は在庫管理用に作り直した新しい定義です。

---

## 1. 前提条件

| 項目 | 内容 |
|---|---|
| 対象デバイス | iPad（Chrome）※旧スコープから変更なし |
| 技術スタック | React + Vite + TypeScript、Tailwind CSS、Dexie.js（IndexedDB）、PWA対応 ※旧スコープから変更なし |
| 継続するテーブル | `MenuPlan`、`MenuLog`（`mealtracking_m2_design.md` 2章） |
| 廃止するテーブル | `Food`（旧定義）、`MealRecord`、`MealRecordItem`、`SymptomRecord` |

---

## 2. データモデル

### 2.1 食材マスタ：`Food`（作り直し）

```typescript
export interface Food {
  id?: number;
  name: string;
  category: FoodCategory[];       // M1.6の種類軸カテゴリを流用
  managementType: ManagementType; // "quantity"（数量管理） | "level"（概略段階管理）
  createdAt: string;
}

export type FoodCategory =
  | "carbohydrate" | "vegetable" | "fruit" | "meat" | "fish"
  | "bean" | "dairy_egg" | "seasoning" | "beverage" | "other";

export type ManagementType = "quantity" | "level";
```

- `category`はM1.6で定義した種類軸カテゴリをそのまま踏襲する（`mealtracking_m1_design.md` 9章参照。ただし本テーブルは新規作成のため、旧`foods`テーブルのデータは引き継がない）
- `managementType`は食材登録時に選択し、以降の在庫入力UIを切り替える判定に使う

### 2.2 在庫：`Inventory`

```typescript
export interface Inventory {
  id?: number;
  foodId: number;
  quantityValue?: number;   // managementType: "quantity" の場合のみ使用（個数・グラム等）
  quantityUnit?: string;    // 単位（例："本"、"g"）
  level?: StockLevel;       // managementType: "level" の場合のみ使用
  updatedAt: string;
}

export type StockLevel = "plenty" | "low" | "none"; // 多い／少ない／なし
```

- `Food`1件につき`Inventory`は1件（状態を表すテーブルなので、更新は上書き）
- `managementType`に応じて`quantityValue`系または`level`のどちらかのみを使う（型レベルでは両方optionalとし、運用で使い分ける）

**設計判断の理由**：`mealtracking_m2_design.md` 3章で確立した「状態とイベントを分離する」原則に基づき、`Inventory`は「今の在庫状況」という状態を表す。消費・購入という出来事（イベント）は次の`InventoryEvent`で別途記録する。

### 2.3 在庫イベント：`InventoryEvent`

```typescript
export interface InventoryEvent {
  id?: number;
  foodId: number;
  eventType: "add" | "consume";  // 購入（追加） or 消費
  quantityValue?: number;         // 数量管理の場合、追加量（消費は"使い切った"のみのためnull）
  source: EventSource;            // 手動入力 or ぴよログ連携
  createdAt: string;
}

export type EventSource = "manual" | "piyolog_import";
```

- 状態（`Inventory`）とイベント（`InventoryEvent`）を分離することで、「いつ・何が起きたか」の履歴を保持しつつ、在庫一覧画面では`Inventory`のみを参照すればよい構成にする
- UC1（新規登録）は`eventType: "add"`、UC2（消費記録）は`eventType: "consume"`のイベントを作成し、同時に`Inventory`を更新する

### 2.4 Dexieスキーマ

```typescript
this.version(1).stores({
  foods: '++id, name, *category, managementType',
  inventory: '++id, foodId',
  inventoryEvents: '++id, foodId, eventType, createdAt',
  menuPlans: '++id, date, mealTiming',   // mealtracking_m2_design.md 2章から継続
  menuLogs: '++id, date, mealTiming'     // mealtracking_m2_design.md 2章から継続
});
```

- 新規リポジトリ構成として、DBを新しいバージョン1から開始する想定（旧`mealtracking-app`のDB定義を置き換える場合は、移行方針をステップとして別途検討する）
- `menuPlans`・`menuLogs`は既存のスキーマ定義をそのまま流用する

### 2.5 UC1（食材在庫の新規登録）の保存処理

```typescript
async function addInventory(foodId: number, managementType: ManagementType, value: number | StockLevel) {
  const now = new Date().toISOString();
  const existing = await db.inventory.where('foodId').equals(foodId).first();

  if (managementType === "quantity") {
    const addAmount = value as number;
    if (existing) {
      await db.inventory.update(existing.id!, {
        quantityValue: (existing.quantityValue ?? 0) + addAmount,
        updatedAt: now
      });
    } else {
      await db.inventory.add({ foodId, quantityValue: addAmount, updatedAt: now });
    }
    await db.inventoryEvents.add({ foodId, eventType: "add", quantityValue: addAmount, source: "manual", createdAt: now });
  } else {
    const level = value as StockLevel;
    if (existing) {
      await db.inventory.update(existing.id!, { level, updatedAt: now });
    } else {
      await db.inventory.add({ foodId, level, updatedAt: now });
    }
    await db.inventoryEvents.add({ foodId, eventType: "add", source: "manual", createdAt: now });
  }
}
```

### 2.6 UC2（食材の消費記録）の保存処理

```typescript
async function consumeInventory(foodId: number, managementType: ManagementType) {
  const now = new Date().toISOString();
  const existing = await db.inventory.where('foodId').equals(foodId).first();
  if (!existing) return;

  if (managementType === "quantity") {
    // 「使い切った」のみ対応。数量を0にする
    await db.inventory.update(existing.id!, { quantityValue: 0, updatedAt: now });
  } else {
    // 段階を一つ下げる（plenty→low→none）
    const nextLevel: Record<StockLevel, StockLevel> = { plenty: "low", low: "none", none: "none" };
    const current = existing.level ?? "none";
    await db.inventory.update(existing.id!, { level: nextLevel[current], updatedAt: now });
  }
  await db.inventoryEvents.add({ foodId, eventType: "consume", source: "manual", createdAt: now });
}
```

### 2.7 UC4（大人用献立提案）のロジック概要

```typescript
async function suggestMenus() {
  const inventory = await db.inventory.toArray();
  const foods = await db.foods.toArray();

  // 在庫が「なし・少ない」の食材を優先候補とする
  const priorityFoodIds = inventory
    .filter(i => i.level === "none" || i.level === "low" || (i.quantityValue !== undefined && i.quantityValue <= 1))
    .map(i => i.foodId);

  const priorityFoods = foods.filter(f => priorityFoodIds.includes(f.id!));

  // 主菜系・副菜系に分類（簡易版）
  const mainCategories: FoodCategory[] = ["meat", "fish", "bean"];
  const sideCategories: FoodCategory[] = ["vegetable", "fruit"];

  const mainCandidates = priorityFoods.filter(f => f.category.some(c => mainCategories.includes(c)));
  const sideCandidates = priorityFoods.filter(f => f.category.some(c => sideCategories.includes(c)));

  // 直近のMenuLogと重複しないメニューを組み合わせる（具体的なメニュー生成ロジックは別途検討）
  const recentLogs = await db.menuLogs.orderBy('createdAt').reverse().limit(7).toArray();
  const recentMenuNames = new Set(recentLogs.map(l => l.menuName));

  return { mainCandidates, sideCandidates, recentMenuNames };
}
```

- 本ロジックは骨格のみ。実際の「メニュー名の生成・提示」は食材の組み合わせパターンやレシピ的な知識が必要になるため、別途実装方針を検討する（ルールベースか、外部レシピ情報の参照か等）

### 2.8 UC5（提案の採用）とMenuLogへの反映

```typescript
async function adoptMenu(menuName: string, usedFoodIds: number[], date: string, mealTiming: MealTiming) {
  const now = new Date().toISOString();

  // 使用した食材を消費記録として反映
  for (const foodId of usedFoodIds) {
    const food = await db.foods.get(foodId);
    if (food) await consumeInventory(foodId, food.managementType);
  }

  // 週間献立表への実施記録（mealtracking_m2_design.md 2.6のロジックを流用）
  await db.menuLogs.add({ date, mealTiming, menuName, recordedBy: "father", createdAt: now }); // recordedByは実際の記録者に置き換える
}
```

### 2.9 UC6（ぴよログ連携）のパース方針

ぴよログのテキストエクスポート形式（`【ぴよログ】YYYY年M月` の見出しと、日付ごとの時刻＋行動の記録）を前提に、以下の方針でパースする。

```typescript
function parsePiyologText(text: string): { date: string; foodMentions: string[] }[] {
  // 1. 日付見出し（例："2026/8/25(火)"）で日ごとに分割
  // 2. 各日の行から、食事・離乳食に関する行を抽出する
  //    （行動の種類はぴよログのエクスポート形式に依存するため、実データを見て抽出パターンを確定する）
  // 3. 抽出した行から食材名らしき文字列を取り出す（自由記述のため、完全な自動認識は難しい前提で設計する）
  // 実装の詳細は、実際のエクスポートデータのサンプルを見てから確定する
  return [];
}
```

- ぴよログの離乳食記録は自由記述であることが多いため、完全自動での食材名抽出は精度に限界がある前提で設計する
- パース結果は必ず確認画面（UC6のステップ4）を経由させ、誤認識・不要項目を利用者が除外できるようにする。自動化の精度に依存しすぎない設計とする

---

## 3. 実装タスク（概要）

詳細なステップ分割は `inventory_menu_claude_code_instructions.md` を参照。

- [x] `Food`（新定義）・`Inventory`・`InventoryEvent`テーブルの実装
- [ ] ①在庫一覧画面の実装
- [ ] ②献立提案画面の実装（提案ロジックの骨格実装、メニュー生成方式は別途検討）
- [ ] ③週間献立表とUC5の接続（提案採用時の`MenuLog`反映）
- [ ] ④ぴよログ連携画面の実装（パース処理は実データサンプルを見て精緻化）

---

## 4. 実装メモ（Claude Code追記・本リポジトリでの実装時の差分）

本ドキュメントの2章はコードサンプルを含む設計方針だが、実際にこのリポジトリで実装する際、以下の点をリポジトリの現状に合わせて調整した。設計判断として記録する。

### 4.1 Dexieスキーマのバージョニング

2.4節は新規リポジトリとして`version(1)`から開始する想定で書かれているが、本リポジトリは離乳食トラッキング機能（M1〜M3）からの移行であり、`menuPlans`/`menuLogs`は既にDexie `version(6)`として運用中（`foods`/`records`/`symptomRecords`はv6でnull化済み）。そのため、新規に`version(1)`へ置き換えるのではなく、**`version(7)`として`foods`・`inventory`・`inventoryEvents`テーブルを追加**する形で実装した（`menuPlans`/`menuLogs`はスキーマ変更なし）。既存の週間献立表データを保持したまま新機能を追加できるため、こちらを採用している。

### 4.2 `suggestMenus`の直近ログ取得

2.7節のサンプルコードは`db.menuLogs.orderBy('createdAt')`を使っているが、`menuLogs`テーブルのDexieインデックスは`++id, date, mealTiming`のみで`createdAt`にインデックスがないため、`orderBy('createdAt')`は実行時エラーになる。実装では`orderBy('date')`（実施日の降順）に置き換えた。「直近の実施記録と重複しないか」という目的にはむしろ`date`の方が意味的に適切なため、この変更を採用している。

### 4.3 `consumeInventory`のsource引数

2.6節のサンプルコードは`InventoryEvent.source`を`"manual"`固定で記録しているが、ぴよログ連携（UC6）から呼び出す際は`"piyolog_import"`を記録する必要があるため、`consumeInventory(foodId, managementType, source: EventSource = "manual")`のようにsource引数を省略可能な形で追加した。呼び出し元（手動操作／ぴよログ連携）に応じて明示的に渡す。

### 4.4 `recordedBy`

2.8節の`adoptMenu`関数は`recordedBy`をコメントで「実際の記録者に置き換える」としているが、本リポジトリには既に`RecorderContext`（`useRecorder()`）による父/母のワンタップ切替が実装済みのため、そのまま利用する。
