# 離乳食トラッキング M1：技術設計書

> 本ドキュメントは離乳食トラッキング機能のM1・M1.5・M1.6（最小記録機能・CRUD補完・食材カテゴリ管理）に関する技術仕様・データモデルをまとめたものです。
> M2以降（M3：アレルギー管理、M2：献立記録＋週間献立表）の技術仕様は `mealtracking_m2_design.md` を参照してください。
> ユースケース・画面構成の詳細は `mealtracking_usecase_ui.md`、全体要件は `persona_usecase_mvp.md` を参照してください。
> 本ドキュメントの内容をもとに、Claude Codeでの実装に進む想定です。

---

## 1. 前提条件

| 項目 | 内容 |
|---|---|
| 対象デバイス | iPad（ブラウザ：Chrome） |
| 展開形態 | Webアプリ（将来PWA化してホーム画面追加に対応） |
| データ保存 | ローカル完結（サーバー同期なし） |
| 記録者識別 | ログイン相当なし。同一端末上でワンタップ切替 |
| 利用者 | 夫婦（2名）、同一iPadを共有利用 |

---

## 2. 技術スタック

| 領域 | 選定 | 理由 |
|---|---|---|
| フロントエンド | React + Vite + TypeScript | 開発速度と型安全性のバランス。Claude Codeでの実装効率が良い |
| スタイリング | Tailwind CSS | 素朴なUIのため、コンポーネントライブラリは導入せず実装コストを抑える |
| 状態管理 | React標準（useState / useContext） | M1のデータ規模・画面数では外部ライブラリ不要 |
| データ保存 | IndexedDB（Dexie.js） | ローカル完結・オフライン動作・容量制限が緩い。Chrome for iPadOSで安定動作 |
| PWA対応 | vite-plugin-pwa | 初期から組み込み、将来のホーム画面追加・オフライン利用に備える |

**M1では導入しないもの**：ルーティングライブラリ（画面数が少ないためstate切替で十分）、サーバー通信・認証基盤（次サイクル以降）

---

## 3. データモデル

### 3.1 テーブル構成（IndexedDB / Dexieスキーマ）

```typescript
// db.ts
import Dexie, { Table } from 'dexie';

export interface Food {
  id?: number;
  name: string;          // 食材名（例："にんじん"）
  isFavorite: boolean;   // よく使う食材チップに表示するか
  createdAt: string;     // ISO8601
}

export interface MealRecord {
  id?: number;
  recordedAt: string;    // ISO8601（食事の時刻）
  recordedBy: Recorder;  // "father" | "mother"
  items: MealRecordItem[];
}

export interface MealRecordItem {
  foodId: number;        // Food.id への参照
  foodName: string;      // 表示用に非正規化（食材名変更時も過去記録は変えない）
  level: CompletionLevel; // "full" | "half" | "none"
}

export type CompletionLevel = "full" | "half" | "none";
export type Recorder = "father" | "mother";

export class MealTrackingDB extends Dexie {
  foods!: Table<Food, number>;
  records!: Table<MealRecord, number>;

  constructor() {
    super('MealTrackingDB');
    this.version(1).stores({
      foods: '++id, name, isFavorite',
      records: '++id, recordedAt, recordedBy'
    });
  }
}

export const db = new MealTrackingDB();
```

### 3.2 データモデルの設計判断

| 判断 | 理由 |
|---|---|
| `items` を `MealRecord` にネストした配列で持つ（別テーブルに正規化しない） | M1では1記録＝1回の食事イベントとして扱い、集計・検索の必要が薄いため。将来必要になれば正規化を検討 |
| `foodName` を記録側にも非正規化して保持 | 食材マスタの名称変更・削除が過去記録の表示に影響しないようにするため |
| `isFavorite` フラグで「よく使う食材チップ」を制御 | 初期は全食材を表示チップ対象とし、M1運用の中で頻出食材が固定化してきたら絞り込む運用を想定 |
| 「初めての食材」判定はテーブルに持たず、記録一覧を都度スキャンして算出 | M1時点ではデータ量が小さく、専用フラグを持つより実装がシンプル。M3（アレルギー管理）で本格化する際に再設計 |

### 3.3 初期データ（食材マスタのシード）

離乳食初期でよく使われる食材を初期セットとして用意する（大蒲さんの家庭の実態に合わせて後から調整可能）。

```typescript
const initialFoods = [
  "にんじん", "かぼちゃ", "豆腐", "しらす", "バナナ",
  "ほうれん草", "じゃがいも", "米（10倍粥）", "さつまいも", "りんご"
];
```

---

## 4. 画面ごとのデータ操作

`mealtracking_usecase_ui.md` の画面構成（①〜②）に対応するデータ操作は以下の通り。

### ① ホーム／記録一覧画面
| 操作 | 内容 |
|---|---|
| 読み込み | `records` を `recordedAt` 降順で取得（当日分をデフォルト表示） |
| 表示要素 | 時刻・食材名・完食度アイコン・記録者 |

### ② 記録入力画面
| 操作 | 内容 |
|---|---|
| 食材チップ表示 | `foods` を取得し、`isFavorite` のものを優先表示。新規食材はその場で `foods` に追加可能 |
| 「はじめて」判定 | 選択中の食材名が既存の `records.items[].foodName` に一度も出現していなければ「はじめて」表示 |
| 保存 | 選択した食材＋完食度を1件の `MealRecord` としてまとめて `records` に追加 |
| バリデーション | 食材が1つも選ばれていない、または選択済み食材に完食度が未選択の場合は保存不可（モックで確認済みの挙動） |

---

## 5. ディレクトリ構成（想定）

```
mealtracking-app/
├── src/
│   ├── db.ts                  # Dexieスキーマ定義
│   ├── App.tsx                 # 画面切替の起点
│   ├── screens/
│   │   ├── RecordListScreen.tsx   # ①記録一覧
│   │   └── RecordInputScreen.tsx  # ②記録入力
│   ├── components/
│   │   ├── FoodChip.tsx
│   │   ├── CompletionLevelButton.tsx
│   │   └── RecordCard.tsx
│   └── types.ts                # Food, MealRecord等の型（db.tsと共有）
├── public/
├── vite.config.ts              # vite-plugin-pwa設定含む
└── package.json
```

---

## 6. M1実装スコープ（再掲・確定）

`mealtracking_usecase_ui.md` M1の内容を、本設計書の技術要素に落とし込んだ実装タスク。

- [ ] プロジェクトセットアップ（Vite + React + TypeScript + Tailwind）
- [ ] Dexie.jsセットアップ、スキーマ定義、初期データ投入
- [ ] ①記録一覧画面の実装
- [ ] ②記録入力画面の実装（食材チップ・完食度選択・バリデーション）
- [ ] 記録者切替UI（ワンタップ切替、ログイン相当なし）
- [ ] PWA設定（manifest・アイコン・vite-plugin-pwa設定）
- [ ] iPad Chromeでの動作確認

---

## 7. 将来の拡張に向けた留意点

- 夫婦間のリアルタイム共有が必要になった場合、`recordedBy` のローカル切替方式から、サーバー同期＋アカウント方式への移行が発生する。M1のデータモデルはこの移行を見据え、`recordedBy` を早期から独立フィールドとして持たせている
- M2以降（M3：アレルギー・初回食材管理、M2：献立記録＋週間献立表）の技術仕様は `mealtracking_m2_design.md` に分離した

---

## 8. M1.5：CRUD補完に向けたデータモデル変更

M1運用フィードバック（`mealtracking_usecase_ui.md` 9章参照）を受け、以下のスキーマ変更を行う。

### 8.1 `MealRecord` への変更なし・操作の追加

データモデル自体（`MealRecord`の型定義）は変更不要。以下の操作をDexie経由で追加実装する。

```typescript
// 更新
await db.records.update(recordId, { recordedAt: newTime, items: newItems });

// 削除
await db.records.delete(recordId);
```

- 削除は誤操作防止のため、UI側で確認ダイアログを挟む（設計はUI側の責務、データモデルへの影響なし）
- 時刻編集も`recordedAt`フィールドの更新のみで対応可能（新規フィールド不要）

### 8.2 食材のテキスト自由入力

`Food`テーブルへの新規追加はステップ2（記録入力画面）の実装時点で既に「新規食材はその場で`foods`に追加可能」としていたが、UIにチップ選択しか用意していなかったため機能していなかった。テキスト入力欄を追加し、入力確定時に以下を実行する。

```typescript
// 既存食材と重複しない場合のみ新規追加
const existing = await db.foods.where('name').equals(inputName).first();
if (!existing) {
  await db.foods.add({ name: inputName, isFavorite: false, createdAt: new Date().toISOString() });
}
```

### 8.3 食材マスタの拡充

初期シード10件を、月齢別の離乳食解禁食材リスト（ゴックン期・モグモグ期・カミカミ期等の一般的な区分）をベースにしたセットに置き換える。具体的な品目リストは次回セッションで確定する（本ドキュメントでは方針のみ記載）。

- `isFavorite`はデフォルトを`false`とし、実際に使った食材のみ`true`に昇格させる運用に変更するか、初期は月齢に応じたサブセットのみ`true`にする、等の運用方法は要検討

---

## 9. M1.6：食材カテゴリ・食材一覧管理

> M1.5完了後に判明した課題（`mealtracking_usecase_ui.md` 9.5参照）への対応。実装順序としてはM2・M3（`mealtracking_m2_design.md`参照）より先行する。

### 9.1 `Food`型の拡張

```typescript
export interface Food {
  id?: number;
  name: string;
  isFavorite: boolean;
  category: FoodCategory[];   // 追加：複数カテゴリを許容
  createdAt: string;
}

export type FoodCategory =
  | "carbohydrate"   // 炭水化物
  | "vegetable"      // 野菜
  | "fruit"          // くだもの
  | "meat"           // 肉
  | "fish"           // 魚
  | "bean"           // 豆・加工品
  | "dairy_egg"      // 卵・乳製品
  | "seasoning"       // 調味料
  | "beverage"        // 飲料
  | "other";          // その他
```

- カテゴリは**種類軸のみ**を採用する（栄養素軸は不採用。理由は`mealtracking_usecase_ui.md` 9.5参照）
- 1食材に複数カテゴリを許容する配列型とする（例：豆腐は`["bean"]`のみでもよいし、将来的に複数該当する食材が出てきても対応できる）

### 9.2 Dexieスキーマの変更

`category`は配列のため、Dexieの複合インデックス（`*category`のようなmulti-entry index）を使うと、カテゴリでの絞り込みクエリが効率化できる。

```typescript
this.version(2).stores({
  foods: '++id, name, isFavorite, *category',
  records: '++id, recordedAt, recordedBy'
});
```

- `*category`はDexieのmulti-entry indexで、配列内の各要素に対してインデックスが張られる。`db.foods.where('category').equals('vegetable')`のようなクエリが可能になる
- バージョンを2に上げるが、既存の`foods`データには`category`フィールドが存在しないため、マイグレーション処理で空配列`[]`をデフォルト補完する

```typescript
this.version(2).stores({
  foods: '++id, name, isFavorite, *category',
  records: '++id, recordedAt, recordedBy'
}).upgrade(tx => {
  return tx.table('foods').toCollection().modify(food => {
    if (!food.category) food.category = [];
  });
});
```

### 9.3 記録入力画面（②）でのカテゴリ絞り込み（UC10）

```typescript
// 選択中のカテゴリタブに応じて表示するチップを絞り込む
const displayedFoods = selectedCategory === "all"
  ? allFoods
  : allFoods.filter(f => f.category.includes(selectedCategory));
```

- 「すべて」タブ選択時は絞り込みなしで全件表示（既存のM1動作を維持）

### 9.4 食材一覧画面（⑤）のデータ操作（UC11）

| 操作 | 内容 |
|---|---|
| 一覧表示 | `db.foods`を全件取得し、カテゴリタブで絞り込み表示（②と同じ絞り込みロジックを共有コンポーネント化すると実装効率が良い） |
| 編集 | `db.foods.update(foodId, { name, category })` |
| 削除 | `db.foods.delete(foodId)`。削除確認ダイアログを挟む |

**削除時の非破壊性について**：`MealRecordItem.foodName`は記録時点で非正規化保持されているため（3.2参照）、`Food`側のレコードを削除しても過去の`MealRecord`の表示には影響しない。これは3.2で述べた設計判断がM1.6でも活きている一例。

---
