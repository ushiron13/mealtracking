# 離乳食トラッキング M2以降：Claude Code実装指示書

> 本ドキュメントは `mealtracking_m2_design.md`（M3・M2の技術設計）と `mealtracking_usecase_ui.md`（ユースケース・画面設計）をもとに、Claude Codeへの実装指示をステップ単位で整理したものです。
> M1・M1.5・M1.6の実装は完了済みです（`mealtracking_claude_code_instructions_m1.md`参照）。本ドキュメントはその続きとして、既存のsrc/db.ts、RecordListScreen.tsx、RecordInputScreen.tsxを拡張し、新規画面を追加します。
> 各ステップはそれぞれ動作確認できる粒度に分割しています。上から順に、1ステップずつClaude Codeに渡して進めることを想定しています。
>
> **実装順序はM3（アレルギー・初回食材管理）が先行、M2（献立記録＋週間献立表）が後続**です（`mealtracking_usecase_ui.md` 9.6参照）。

---

## 使い方

1. `mealtracking_claude_code_instructions_m1.md` のステップ0〜13が完了していることを前提に、以下のステップ14から順にClaude Codeに指示を出す
2. 各ステップの完了後、簡易動作確認（`npm run dev` で画面が壊れていないか等）を行ってから次に進む
3. 実装中に設計との食い違いが出た場合は、`mealtracking_m2_design.md` 側を更新してから次のステップに進む

---

## M3：アレルギー・初回食材管理（先行実装）

> `mealtracking_m2_design.md` 1章に基づく実装。UC12・UC13対応。

## ステップ14：Food型へのisTried追加とDBマイグレーション

```
src/db.ts、src/types.ts を以下の要件で拡張してください。

【型定義の変更】
- Food に isTried: boolean を追加する（一度でも記録されたことがあるか）

【Dexieスキーマの変更】
- バージョンを3に上げ、foodsテーブルのインデックスにisTriedを追加する
  this.version(3).stores({
    foods: '++id, name, isFavorite, *category, isTried',
    records: '++id, recordedAt, recordedBy'
  }).upgrade(tx => {
    return tx.table('foods').toCollection().modify(food => {
      if (food.isTried === undefined) food.isTried = false;
    });
  });
- 既存のfoods・recordsデータが失われないこと、isTriedフィールドがない既存レコードにはfalseが補完されることを確認してください

【初期化用マイグレーションスクリプト】
- 既存のrecordsテーブルを一度だけスキャンし、記録済みの食材のisTriedをtrueに設定するワンショット処理を追加してください
  （すでに記録されたことのある食材は、M3導入時点で「はじめて」表示にならないようにするため）
- このスクリプトはアプリ初回起動時（またはDBバージョン3への移行時）に1回だけ実行されるようにしてください
```

---

## ステップ15：記録保存時のisTried自動更新

```
記録入力画面（RecordInputScreen）の保存処理を拡張してください。

【機能要件】
1. 記録（MealRecord）を保存する際、選択された各食材について db.foods.get(foodId) で現在のisTriedを確認する
2. isTriedがfalseであれば、db.foods.update(foodId, { isTried: true }) で更新する
3. 「はじめて」チップの判定ロジックを、既存の「records全件スキャン」方式から「food.isTried の参照」方式に切り替える
   （パフォーマンス改善が主目的です。表示結果は既存動作と同じになるはずです）

既存のUC1（記録の保存）・UC3（はじめて食材の視覚的区別）の動作を壊さないよう注意してください。
```

---

## ステップ16：症状記録テーブルとsymptomRecords追加

```
src/db.ts、src/types.ts に以下を追加してください。

【型定義】
- SymptomRecord: { id?: number, mealRecordId: number, foodName?: string, symptom: string, severity: SymptomSeverity, observedAt: string, createdAt: string }
- SymptomSeverity: "mild" | "moderate" | "severe"

【Dexieスキーマ】
- symptomRecords テーブルを追加する
  this.version(3).stores({
    foods: '++id, name, isFavorite, *category, isTried',
    records: '++id, recordedAt, recordedBy',
    symptomRecords: '++id, mealRecordId, observedAt, severity'
  })
  （ステップ14のバージョン3マイグレーションと同じバージョンにまとめてよい）

型定義は src/types.ts に追加してください。
```

---

## ステップ17：症状記録画面の実装

```
src/screens/SymptomRecordScreen.tsx として、症状記録画面を新規実装してください。

【機能要件】
1. 対象の MealRecord.id を props で受け取る
2. 対象記録に含まれる食材一覧（MealRecord.items）を表示し、原因と思われる食材を選択できる（任意、選ばなくてもよい）
3. 症状の自由テキスト入力欄を配置する
4. 重度選択（軽微／中等度／重度）を3ボタンで選択できるようにする
5. 気づいた時刻の入力欄（デフォルトは現在時刻、編集可）を配置する
6. 保存時は db.symptomRecords.add({ mealRecordId, foodName, symptom, severity, observedAt, createdAt: 現在時刻 }) を実行する

iPadのタッチ操作を想定し、タップ領域を十分に確保してください（最低44px四方）。
```

---

## ステップ18：記録一覧への症状記録導線の追加

```
RecordListScreen の各記録カードに「症状を記録」ボタンを追加してください。

【機能要件】
1. ボタン押下時、対象記録のIDを保持したままステップ17のSymptomRecordScreenに遷移する
2. 「食後すぐでなくても、あとから記録できる」ことが伝わるよう、ボタンは常時表示する（症状の有無に関わらず全記録カードに表示）
3. すでに症状記録がある記録カードには、その旨が分かる簡単な表示（アイコン等）を追加する

App.tsx の画面遷移に "symptomRecord" を追加し、対象recordIdを渡せるようにしてください。
```

---

## ステップ19：初回食材の履歴一覧画面の実装

```
src/screens/FirstTryListScreen.tsx として、初回食材の履歴一覧画面を新規実装してください。

【機能要件】
1. db.foods.where('isTried').equals(true) で初回食材（記録済みの食材）を取得し、一覧表示する
2. 各食材について、対応する症状記録（symptomRecords）があれば併せて表示する
   - 突き合わせ方法：その食材が含まれる MealRecord の id を探し、symptomRecords.mealRecordId と照合する
3. カテゴリタブによる絞り込み（既存の食材一覧画面と同じUIコンポーネントを再利用してよい）
4. App.tsx の画面遷移に "firstTryList" を追加し、ホーム画面等からの導線を用意する

Tailwind CSSでスタイリングし、iPad画面幅で見やすいリストレイアウトにしてください。
```

---

## M2：献立記録＋週間献立表

> `mealtracking_m2_design.md` 2章（MenuPlan／MenuLog分離設計）に基づく実装。UC4〜UC9対応。
> **注意**：この設計は`isPlan`フラグによる単一テーブル上書き方式から、`MenuPlan`（予定・状態）／`MenuLog`（実施記録・イベント）の2テーブル分離に変更されています。以前このステップに近い内容を実装していた場合でも、必ず`mealtracking_m2_design.md` 2章を参照して実装してください。

## ステップ20：MenuPlan・MenuLogテーブルの実装

```
src/db.ts に以下を追加してください。

【型定義】
- MenuPlan: { id?: number, date: string, mealTiming: MealTiming, menuName: string, updatedAt: string }
- MenuLog: { id?: number, date: string, mealTiming: MealTiming, menuName: string, comment?: string, recordedBy: Recorder, createdAt: string }
- MealTiming: "breakfast" | "lunch" | "dinner" | "snack"

【Dexieスキーマ】
- menuPlans テーブル: '++id, date, mealTiming' を追加
- menuLogs テーブル: '++id, date, mealTiming' を追加
- バージョンを4に上げ、既存のfoods/records/symptomRecordsテーブルのデータには影響を与えないこと

  this.version(4).stores({
    foods: '++id, name, isFavorite, *category, isTried',
    records: '++id, recordedAt, recordedBy',
    symptomRecords: '++id, mealRecordId, observedAt, severity',
    menuPlans: '++id, date, mealTiming',
    menuLogs: '++id, date, mealTiming'
  });

型定義は src/types.ts に追加してください。

【重要】MenuPlanは「予定・状態」（date+mealTimingにつき常に最新1件のみ）、MenuLogは「実施記録・イベント」（追加のみ、上書きしない）という性質の違いがあります。混同しないよう実装してください。
```

---

## ステップ21：記録入力画面への献立記録機能の統合

```
RecordInputScreen を以下の要件で拡張してください（`mealtracking_m2_design.md` 2.6のロジックを実装する）。

【機能要件】
1. 食材選択の前に、献立名（1行テキスト、任意項目）と感想（1行テキスト、任意項目）の入力欄を追加する
   - プレースホルダー例：献立名「例：鶏と根菜の煮物、にんじん、じゃがいも」
2. 保存処理を以下のロジックに拡張する
   - 摂取実績（MealRecord）は常に保存する（既存動作を維持）
   - 献立名が空欄でなければ、現在時刻から推定した mealTiming（例: 5-10時→breakfast, 10-15時→lunch, 15-19時→dinner, それ以外→snack）と当日の date で db.menuLogs.add({...}) を実行する（新規追加、上書きしない）
   - 献立名が空欄なら menuLogs への操作は行わない（UC7の後方互換要件）
   - 対応する MenuPlan があっても自動では変更・削除しない（予定は予定として独立に保持する）
3. 献立名・感想欄は保存後にリセットする（既存の食材選択リセットと同様）

既存のUC1（食材＋完食度のみの記録）が引き続き問題なく動作することを確認してください。
```

---

## ステップ22：週間献立表画面の実装

```
src/screens/WeeklyMenuScreen.tsx として、週間献立表画面を実装してください。

【機能要件】
1. 表形式で表示する：縦軸＝曜日（当該週の月〜日等）、横軸＝食事タイミング（breakfast/lunch/dinner。snackは任意で列追加）
2. 各セルについて、以下を db.menuPlans と db.menuLogs から取得して表示する（`mealtracking_m2_design.md` 2.8参照）
   - plan = db.menuPlans.where({ date, mealTiming }).first()（予定、なければ空欄）
   - logs = db.menuLogs.where({ date, mealTiming }).toArray()（実施記録、0件〜複数件）
3. セル表示：
   - 予定（plan.menuName）を上段に薄い色で表示
   - 実施記録（logs）があれば下段に通常色で表示（複数件あれば列挙、対応する完食度アイコンも表示）
   - 予定と実施記録の内容が異なる場合も、両方をそのまま表示する（上書きしないため、予定通り作ったか変えたかが見て分かる）
4. セルをタップすると編集モーダルが開き、以下ができる
   - MenuPlanの新規作成・更新（menuName入力、既存があれば上書き。`mealtracking_m2_design.md` 2.7のupdatePlanロジック）
   - MenuLogは編集モーダルからは変更しない（実施記録の訂正はM1.5の記録編集機能に準じた別導線を検討、本ステップのスコープ外）
5. App.tsx に画面遷移（"weeklyMenu"を追加）と、この画面への導線（タブやボタン）を用意する

Tailwind CSSでスタイリングし、iPad画面幅で7日分×3〜4区分の表が見やすく収まるレイアウトにしてください。
```

---

## 各ステップ完了後のチェックリスト（`mealtracking_usecase_ui.md` 8〜8.5章と対応）

### M3
- [ ] ステップ14完了 → 「Food型へのisTriedフィールド追加、DBマイグレーション」にチェック
- [ ] ステップ15完了 → 「はじめて判定ロジックの切り替え」「記録保存時にisTriedを自動更新する処理」にチェック
- [ ] ステップ16完了 → 「SymptomRecordテーブルの新設」にチェック
- [ ] ステップ17完了 → 「⑥症状記録画面の実装」にチェック
- [ ] ステップ18完了 → 「①記録一覧への症状を記録ボタン追加」にチェック
- [ ] ステップ19完了 → 「⑦初回食材の履歴一覧画面の実装」にチェック

### M2
- [ ] ステップ20完了 → 「MenuPlanテーブルの実装」「MenuLogテーブルの実装」にチェック
- [ ] ステップ21完了 → 「②記録入力画面の拡張」「保存処理の拡張」にチェック
- [ ] ステップ22完了 → 「週間献立表画面（③）の実装」「セルタップでの予定編集モーダル」にチェック

各ステップ完了時は `mealtracking_usecase_ui.md` の該当タスクにチェックを入れて進捗を反映してください。
