# 離乳食トラッキング M2以降：技術設計書

> 本ドキュメントは離乳食トラッキング機能のM2以降（M3：アレルギー・初回食材管理、M2：献立記録＋週間献立表）の技術仕様・データモデルをまとめたものです。
> M1・M1.5・M1.6の技術仕様は `mealtracking_m1_design.md` を参照してください。本ドキュメントはそこで定義された`Food`・`MealRecord`・`MealRecordItem`・`Recorder`型を前提とします。
> ユースケース・画面構成の詳細は `mealtracking_usecase_ui.md`、全体要件は `persona_usecase_mvp.md` を参照してください。
> 実装順序は **M3が先行、M2が後続**です（`mealtracking_usecase_ui.md` 9.6参照）。本ドキュメントもその順に構成しています。

---

## 0. 前提：M1系との接続

以下は`mealtracking_m1_design.md`で定義済みの型・Dexieスキーマを前提とします。

- `Food { id, name, isFavorite, category: FoodCategory[], createdAt }`（M1.6でcategory追加、`mealtracking_m1_design.md` 10章）
- `MealRecord { id, recordedAt, recordedBy, items: MealRecordItem[] }`
- `MealRecordItem { foodId, foodName, level: CompletionLevel }`
- `Recorder = "father" | "mother"`
- Dexieスキーマは`mealtracking_m1_design.md`時点でバージョン2（`*category`インデックス追加済み）

本ドキュメントで追加するテーブル・フィールドは、この続きのバージョン（3以降）として実装する。

---

## 1. M3：アレルギー・初回食材管理のデータモデル

> M1.6完了時点でM2に先行して着手することが決定（`mealtracking_usecase_ui.md` 9.6参照）。「初回食材の判定」と「症状の記録」を別の関心事として分離する。

### 1.1 `Food`型への`isTried`追加

```typescript
export interface Food {
  id?: number;
  name: string;
  isFavorite: boolean;
  category: FoodCategory[];
  isTried: boolean;        // 追加：一度でも記録されたことがあるか
  createdAt: string;
}
```

- M1〜M1.6では「はじめて」判定を`records`全件スキャン＋`foodName`照合で都度算出していたが、M3では`isTried`フラグの参照に切り替え、判定を軽量化する
- Dexieスキーマのバージョンを3に上げ、マイグレーションで既存食材に`isTried: false`を補完する

```typescript
this.version(3).stores({
  foods: '++id, name, isFavorite, *category, isTried',
  records: '++id, recordedAt, recordedBy'
}).upgrade(tx => {
  return tx.table('foods').toCollection().modify(food => {
    if (food.isTried === undefined) food.isTried = false;
  });
});
```

### 1.2 記録保存時の`isTried`自動更新

UC1（記録入力）の保存処理に、選択された各食材の`isTried`を`true`に更新する処理を追加する。

```typescript
async function markFoodsAsTried(items: MealRecordItem[]) {
  for (const item of items) {
    const food = await db.foods.get(item.foodId);
    if (food && !food.isTried) {
      await db.foods.update(item.foodId, { isTried: true });
    }
  }
}
```

### 1.3 新設テーブル：`SymptomRecord`

```typescript
export interface SymptomRecord {
  id?: number;
  mealRecordId: number;       // 紐付く MealRecord.id（緩い参照、外部キー制約なし）
  foodName?: string;          // 原因が特定の食材と分かる場合のみ（任意）
  symptom: string;            // 自由テキスト
  severity: SymptomSeverity;  // "mild" | "moderate" | "severe"
  observedAt: string;         // 症状に気づいた時刻（食事時刻とは独立）
  createdAt: string;
}

export type SymptomSeverity = "mild" | "moderate" | "severe";
```

**`FirstTryRecord`ではなく`SymptomRecord`を独立テーブルとして設計した理由**：当初は初回食材専用の症状置き場として`FirstTryRecord`を検討したが、ヒアリングにより「初回食材に限らずどの記録にも症状を記録したい」という要件が判明した。これにより、症状記録の対象を`Food`の初回フラグに従属させず、`MealRecord`に緩く紐付ける独立エンティティとした。初回食材かどうかは`Food.isTried`（1.1）が担い、症状記録はそれと切り離して全記録に対応できる。

### 1.4 Dexieスキーマへの追加

```typescript
this.version(3).stores({
  foods: '++id, name, isFavorite, *category, isTried',
  records: '++id, recordedAt, recordedBy',
  symptomRecords: '++id, mealRecordId, observedAt, severity'
}).upgrade(tx => {
  return tx.table('foods').toCollection().modify(food => {
    if (food.isTried === undefined) food.isTried = false;
  });
});
```

### 1.5 画面ごとのデータ操作

| 画面 | 操作 |
|---|---|
| ①記録一覧（症状追記導線） | 対象の`MealRecord.id`を保持したまま⑥症状記録画面に遷移 |
| ⑥症状記録画面 | 対象`MealRecord.items`から食材選択肢を表示。保存時は`db.symptomRecords.add({...})` |
| ⑦初回食材の履歴一覧 | `db.foods.where('isTried').equals(true)`で取得し、`createdAt`または初回記録時刻順に表示。該当する`symptomRecords`を`mealRecordId`経由で突き合わせて併記 |

### 1.6 「はじめて」判定ロジックの置き換え

M1〜M1.6：

```typescript
// 都度スキャン方式（廃止予定）
const allRecords = await db.records.toArray();
const triedNames = new Set(allRecords.flatMap(r => r.items.map(i => i.foodName)));
const isTried = triedNames.has(food.name);
```

M3以降：

```typescript
// フラグ参照方式
const isTried = food.isTried;
```

既存の`records`データはそのまま保持し、`isTried`フラグは新規記録時（1.2）にのみ更新する。過去に記録済みの食材については、M3実装時に一度だけ`records`をスキャンして`isTried`の初期値を設定するマイグレーションスクリプトを別途用意する（データ移行専用のワンショット処理、Dexieの`upgrade`とは別に実行）。

---

## 2. M2：献立記録のデータモデル（MenuPlan／MenuLog分離）

M1運用フィードバックにより、「献立（作ったもの）」と「摂取実績（食べたもの）」を別レイヤーとして扱う方針に変更した（`mealtracking_usecase_ui.md` 9.3参照）。その後M3の設計（`Food.isTried`という状態フラグと`SymptomRecord`という独立イベント記録の分離、1章参照）を経て、この原則を`MenuRecord`にも当てはめ直し、単一テーブル＋`isPlan`フラグでの上書き方式から、**予定（状態）と実施記録（イベント）を別テーブルに分離**する設計に変更した。

### 2.1 見直し前の設計とその問題点

当初案（`MenuRecord`単一テーブル、`isPlan`フラグで予定／実施済みを上書き）には以下の問題があった。

| 問題 | 内容 |
|---|---|
| 予定と実施記録の混同 | 「予定」は意思決定・状態、「実施記録」は出来事・イベントという性質の異なる2つを同じレコードに`isPlan`で上書きしていた |
| 上書きによる履歴の消失 | 予定を立てた後に実施すると、「予定していた内容」がレコードごと上書きされ、予定通り作ったか変更したかを後から振り返れない |
| UIの制約をデータ層に持ち込んでいた | 「週間献立表の1セル＝1レコード」という表示上の都合を`date+mealTiming`のUNIQUE的運用としてテーブル設計に反映してしまっていた |

### 2.2 新設テーブル：`MenuPlan`（予定・状態）

```typescript
export interface MenuPlan {
  id?: number;
  date: string;           // ISO8601（日付のみ運用、例: "2026-08-27"）
  mealTiming: MealTiming; // "breakfast" | "lunch" | "dinner" | "snack"
  menuName: string;       // 予定している献立名（自由テキスト）
  updatedAt: string;      // 最終更新日時
}

export type MealTiming = "breakfast" | "lunch" | "dinner" | "snack";
```

- `date`＋`mealTiming`につき、常に「今の予定」を1件だけ保持する（状態なので上書きしてよい。UC6「変更履歴を厳密に残さない」という運用方針とも一致）
- 存在しなければ「予定なし」を意味する（レコードを作らない）

### 2.3 新設テーブル：`MenuLog`（実施記録・イベント）

```typescript
export interface MenuLog {
  id?: number;
  date: string;
  mealTiming: MealTiming;
  menuName: string;       // 実際に作った献立名（予定と異なってもよい）
  comment?: string;       // 感想・メモ（任意）
  recordedBy: Recorder;
  createdAt: string;
}
```

- 実際に作った・食べた、という出来事の記録なので**追加のみ、上書きしない**
- 予定（`MenuPlan`）と異なるメニューを作った場合も、その事実がそのまま記録として残る

**`foodTags`を採用しなかった理由**：UC7で確定した入力フローは「献立名を自由テキストで一行入力し、カンマ区切りをシステム側で自動タグ化はしない」というもの。構造化されたタグ配列ではなく自由記述の`menuName`一本の方が実際の入力体験と一致する。食材ごとの構造化データは`MealRecord.items`が担う。

### 2.4 `MealRecord`・`MenuPlan`・`MenuLog`の関係

- 3テーブルはいずれも独立し、強参照（外部キー制約）は持たせない
- `date`＋`mealTiming`で緩く紐付け、週間献立表画面（③）で突き合わせて表示する
- この設計判断の理由：それぞれ異なるタイミング・異なる主体（予定は事前に立てるもの、実施記録と摂取実績は食後に発生するもの）で作られるため、無理に1つのレコードや強い参照関係に統合すると中間状態（予定はあるが未実施等）を表現しづらくなる

### 2.5 Dexieスキーマへの追加

```typescript
this.version(4).stores({
  foods: '++id, name, isFavorite, *category, isTried',
  records: '++id, recordedAt, recordedBy',
  symptomRecords: '++id, mealRecordId, observedAt, severity',
  menuPlans: '++id, date, mealTiming',
  menuLogs: '++id, date, mealTiming'
});
```

### 2.6 UC7（献立記録の入力）に対応する保存処理

```typescript
async function saveRecord(menuName: string, comment: string, items: MealRecordItem[], recordedBy: Recorder) {
  const now = new Date().toISOString();
  const today = now.slice(0, 10); // "YYYY-MM-DD"
  const mealTiming = inferMealTiming(now);

  // 摂取実績は常に保存（UC1と同じ、後方互換）
  await db.records.add({ recordedAt: now, recordedBy, items });

  // 献立名が入力されていれば MenuLog に実施記録を追加する（新規追加、上書きしない）
  if (menuName.trim() !== "") {
    await db.menuLogs.add({
      date: today, mealTiming, menuName, comment, recordedBy, createdAt: now
    });
  }
}
```

- 献立名が空欄の場合は`MenuLog`を作らず`MealRecord`のみ保存（UC7の後方互換要件）
- 実施記録時、対応する`MenuPlan`があっても自動では変更・削除しない（予定は予定として、実施記録とは独立に保持する）

### 2.7 UC6（その場での予定変更）に対応する保存処理

```typescript
async function updatePlan(date: string, mealTiming: MealTiming, menuName: string) {
  const now = new Date().toISOString();
  const existing = await db.menuPlans.where({ date, mealTiming }).first();
  if (existing) {
    await db.menuPlans.update(existing.id!, { menuName, updatedAt: now });
  } else {
    await db.menuPlans.add({ date, mealTiming, menuName, updatedAt: now });
  }
}
```

- `MenuPlan`は状態なので、既存があれば上書き（履歴は残さない、UC6の運用方針通り）

### 2.8 週間献立表画面（③）での突き合わせ表示

```typescript
async function getWeekCell(date: string, mealTiming: MealTiming) {
  const plan = await db.menuPlans.where({ date, mealTiming }).first();
  const logs = await db.menuLogs.where({ date, mealTiming }).toArray(); // 複数あり得る（1食事タイミングで複数回記録した場合等）
  return { plan, logs };
}
```

- セル表示は「予定（`plan`、あれば）」と「実施記録（`logs`、0件〜複数件）」を両方表示する
- 実施記録が1件でもあれば実施済みとして表示し、予定と異なる内容であれば両方を並べて見せる（UC5の「一目で分かる」という要件を、上書きなしで実現する）

---

## 3. 設計原則のまとめ（M3・M2共通）

M3・M2の再設計を通じて確立した原則を、今後のM4以降の設計判断にも適用する。

| 原則 | 内容 | 適用例 |
|---|---|---|
| 状態とイベントを分離する | 「今どうなっているか（状態）」と「何が起きたか（イベント）」は別テーブルで表現する。状態は上書き、イベントは追加のみ | `Food.isTried`（状態）と`SymptomRecord`（イベント）／`MenuPlan`（状態）と`MenuLog`（イベント） |
| UIの都合をデータ層に持ち込まない | 「1画面1セル＝1レコード」のような表示上の制約を、テーブルのUNIQUE制約や上書きロジックにそのまま反映しない | `MenuPlan`／`MenuLog`分離前の`isPlan`フラグ上書き方式が反面教師 |
| 非正規化は意図を明記して使う | 参照先の変更・削除に影響されたくない場合は非正規化して保持する（`foodName`等） | `MealRecordItem.foodName`、`SymptomRecord.foodName` |
