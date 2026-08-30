# 食材在庫管理・大人用献立提案：Claude Code実装指示書

> 本ドキュメントは `inventory_menu_design.md`（技術設計）と `inventory_menu_usecase_ui.md`（ユースケース・画面設計）をもとに、Claude Codeへの実装指示をステップ単位で整理したものです。
> **前提**：`scope_migration_claude_code_instructions.md` のステップ0〜3（ブランチ保存・旧機能の削除・リポジトリ整理）が完了していることを前提とします。未実施の場合は先にそちらを実行してください。
> 各ステップはそれぞれ動作確認できる粒度に分割しています。上から順に、1ステップずつClaude Codeに渡して進めることを想定しています。

---

## 使い方

1. `scope_migration_claude_code_instructions.md` の完了を確認してから、以下のステップ0から順にClaude Codeに指示を出す
2. 各ステップの完了後、簡易動作確認（`npm run dev` で画面が壊れていないか等）を行ってから次に進む
3. 実装中に設計との食い違いが出た場合は、`inventory_menu_design.md` 側を更新してから次のステップに進む

---

## ステップ0：データモデル・DB層の実装

```
src/db.ts、src/types.ts を以下の要件で実装してください（`inventory_menu_design.md` 2章に基づく）。

【型定義】
- Food: { id?: number, name: string, category: FoodCategory[], managementType: ManagementType, createdAt: string }
- FoodCategory: "carbohydrate" | "vegetable" | "fruit" | "meat" | "fish" | "bean" | "dairy_egg" | "seasoning" | "beverage" | "other"
- ManagementType: "quantity" | "level"
- Inventory: { id?: number, foodId: number, quantityValue?: number, quantityUnit?: string, level?: StockLevel, updatedAt: string }
- StockLevel: "plenty" | "low" | "none"
- InventoryEvent: { id?: number, foodId: number, eventType: "add" | "consume", quantityValue?: number, source: EventSource, createdAt: string }
- EventSource: "manual" | "piyolog_import"
- MenuPlan、MenuLog、MealTiming、Recorder は mealtracking_m2_design.md 2章の定義をそのまま使う（旧リポジトリから引き継ぐ場合はそのまま、新規リポジトリの場合は再定義する）

【Dexieスキーマ】
this.version(1).stores({
  foods: '++id, name, *category, managementType',
  inventory: '++id, foodId',
  inventoryEvents: '++id, foodId, eventType, createdAt',
  menuPlans: '++id, date, mealTiming',
  menuLogs: '++id, date, mealTiming'
});

【初期データ】
食材マスタの初期セットは、M1.6運用時のカテゴリ分類を踏まえた20〜30品目程度を用意してください（品目リストを一覧で提示し、確認できるようにしてください）。各食材のmanagementTypeは、個数で数えやすいもの（野菜・果物等）は"quantity"、それ以外（調味料・冷凍食品等）は"level"をデフォルトとしてください。
```

---

## ステップ1：在庫一覧画面の実装

```
src/screens/InventoryListScreen.tsx として、在庫一覧画面を実装してください（`inventory_menu_usecase_ui.md` UC3、画面構成①）。

【機能要件】
1. db.foods と db.inventory を結合し、食材ごとの在庫状況を一覧表示する
2. managementTypeが"quantity"の食材は数量（quantityValue + quantityUnit）を表示、"level"の食材は段階（多い／少ない／なし）を表示
3. 在庫が「なし」「少ない」の食材を視覚的に強調する（例：背景色や警告アイコン）
4. 各食材をタップすると詳細編集ができる（在庫の手動更新）
5. 新規食材の追加導線を用意する（食材名・カテゴリ・managementTypeを登録時に選ぶ）

Tailwind CSSでスタイリングし、iPad画面幅で見やすいリストレイアウトにしてください。
```

---

## ステップ2：在庫の新規登録・消費記録の実装

```
以下の関数を実装し、ステップ1の画面から呼び出せるようにしてください（`inventory_menu_design.md` 2.5・2.6のロジック）。

【addInventory関数】
- managementTypeが"quantity"の場合：既存在庫があれば加算、なければ新規作成。InventoryEventにeventType: "add"を記録
- managementTypeが"level"の場合：段階を直接設定（多い／少ない等）。InventoryEventにeventType: "add"を記録

【consumeInventory関数】
- managementTypeが"quantity"の場合：「使い切った」ボタン一つでquantityValueを0にする（部分消費の数量入力UIは作らない）
- managementTypeが"level"の場合：段階を一つ下げるボタン（多い→少ない→なし、なしはそのまま）
- どちらもInventoryEventにeventType: "consume"を記録

【UI】
- 在庫一覧画面（InventoryListScreen）の各食材に「追加」ボタンと「使い切った」／「減らす」ボタンを配置する
- 数量管理の食材は追加時に個数入力欄を表示、段階管理の食材は追加時に段階選択（多い／少ない）を表示

既存の週間献立表（WeeklyMenuScreenがあれば）や他画面に影響を与えないことを確認してください。
```

---

## ステップ3：献立提案画面の実装（骨格）

```
src/screens/MenuSuggestionScreen.tsx として、大人用献立提案画面を実装してください（`inventory_menu_usecase_ui.md` UC4、画面構成②）。

【機能要件】
1. db.inventory から在庫が「なし・少ない」（quantityValueが少ない、またはlevelがlow/none）の食材を抽出する
2. 抽出した食材を、category（"meat"|"fish"|"bean" → 主菜系、"vegetable"|"fruit" → 副菜系）で分類する
3. 主菜候補・副菜候補をそれぞれ表示する（`inventory_menu_design.md` 2.7のsuggestMenus関数を実装のベースにする）
4. db.menuLogs から直近7件を取得し、そのmenuNameと重複する提案があれば画面上で分かるようにする（除外まではしなくてよい、視覚的な注意表示でよい）
5. 「これ作る」ボタンを配置する（押下時の処理はステップ4で実装）

【重要】このステップでは「具体的なメニュー名の自動生成」は行いません。在庫から使うべき食材の候補提示に留めてください。メニュー名は次のステップでユーザーが入力する前提です。

Tailwind CSSでスタイリングし、iPad画面幅で見やすいレイアウトにしてください。
```

---

## ステップ4：提案採用時の在庫消費・週間献立表への反映

```
ステップ3の「これ作る」ボタンの処理を実装してください（`inventory_menu_design.md` 2.8のadoptMenu関数がベース）。

【機能要件】
1. 「これ作る」押下時、メニュー名（自由テキスト）と使用した食材（提案画面で表示した候補から選択、複数可）を入力できるモーダルを表示する
2. 保存時に以下を実行する
   - 選択された食材それぞれについて、ステップ2のconsumeInventory関数を呼び出す
   - db.menuLogs に実施記録を追加する（date, mealTiming, menuName, recordedBy, createdAt）
     - mealTimingは現在時刻から推定する（mealtracking_m2_design.md 2.6のinferMealTiming関数を流用）
     - recordedByは記録者切替の仕組みがあればそれを使う。なければ固定値でよい（後で拡張）
3. 保存後、在庫一覧画面（InventoryListScreen）で該当食材の在庫が更新されていることを確認する

週間献立表画面（WeeklyMenuScreen）が既にある場合、この操作で作成したMenuLogがそこに表示されることを確認してください。
```

---

## ステップ5：ぴよログ連携画面の実装（テキスト取り込み・確認画面）

```
src/screens/PiyologImportScreen.tsx として、ぴよログ連携画面を実装してください（`inventory_menu_usecase_ui.md` UC6、画面構成④）。

【機能要件】
1. テキストエリアを配置し、ぴよログの「記録の出力」機能でエクスポートしたテキストを貼り付けられるようにする
2. 「解析する」ボタンを押すと、貼り付けたテキストをパースする
3. パース結果を一覧表示し、それぞれの項目について「在庫に反映する／しない」をチェックボックスで選べるようにする
4. 「反映する」を選んだ項目について、対応する食材を db.foods から検索する（完全一致しない場合は「該当食材なし」として、新規食材登録に誘導するか、スキップできるようにする）
5. 「確定」ボタンで、選択された項目について consumeInventory関数を呼び出し、InventoryEvent.source を "piyolog_import" として記録する
6. 直近のインポート履歴（実行日時、反映件数）を簡易表示する

【重要：パース処理について】
ぴよログのテキストエクスポート形式の実データサンプルがまだありません。まずは以下のダミー形式を仮定して実装してください。
---
【ぴよログ】2026年8月
2026/8/25(火) 子供の名前 (0歳8か月10日)
07:30 離乳食 かぼちゃ粥 にんじん
12:00 離乳食 豆腐 ほうれん草
---
このダミー形式で「離乳食」を含む行から、時刻以降のテキストをスペース区切りで食材名候補として抽出する実装にしてください。

実装後、実際のぴよログのエクスポートデータを大蒲さんから提供してもらい、パースロジックを調整するステップ（ステップ6）に進みます。パース精度が低くても、確認画面（手順3〜4）で人間が最終確認できるため、致命的な問題にはならない設計になっていることを確認してください。
```

---

## ステップ6：実データでのパース精度調整（大蒲さんの協力が必要）

```
このステップは、大蒲さんに実際のぴよログのエクスポートデータ（個人情報を除いた形、または一部をマスキングしたもの）を提供してもらってから実施してください。

1. 提供された実データのフォーマットを確認する
2. ステップ5のダミー形式パーサーとの差分を洗い出す
3. 実データに合わせてパースロジックを調整する
4. 調整後、複数日分のデータで正しく食材候補が抽出できるか確認する
5. 抽出精度が低い場合でも、確認画面での手動選択・除外機能（ステップ5の機能要件3〜4）でカバーできることを前提とし、パーサーの完璧な精度は目指さない
```

---

## 各ステップ完了後のチェックリスト（`inventory_menu_usecase_ui.md` 5章と対応）

- [ ] ステップ0完了 → 「食材マスタ（管理方式付き）のテーブル実装」「在庫テーブルの実装」にチェック
- [ ] ステップ1完了 → 「①在庫一覧画面の実装」にチェック
- [ ] ステップ2完了 → 在庫の新規登録・消費記録が動作することを確認
- [ ] ステップ3完了 → 「②献立提案画面の実装」にチェック（骨格部分）
- [ ] ステップ4完了 → 「③週間献立表との接続」にチェック
- [ ] ステップ5・6完了 → 「④ぴよログ連携画面の実装」にチェック

各ステップ完了時は `inventory_menu_usecase_ui.md` の該当タスクにチェックを入れて進捗を反映してください。
