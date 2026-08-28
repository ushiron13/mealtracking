# 離乳食トラッキング M1系：Claude Code実装指示書

> 本ドキュメントは `mealtracking_m1_design.md`（M1・M1.5・M1.6の技術設計）と `mealtracking_usecase_ui.md`（ユースケース・画面設計）をもとに、Claude Codeへの実装指示をステップ単位で整理したものです。
> 各ステップはそれぞれ動作確認できる粒度に分割しています。上から順に、1ステップずつClaude Codeに渡して進めることを想定しています。
> M2以降（M3：アレルギー管理、M2：献立記録＋週間献立表）は `mealtracking_claude_code_instructions_m2.md` に分離しています。
>
> **ステップ0〜13（M1・M1.5・M1.6）はすべて実装完了済みです。** 本ドキュメントは完了した実装の記録として残します。

---

## 使い方

1. 新規ディレクトリでこのファイルを参照しながら、以下の「ステップ0」から順にClaude Codeに指示を出す
2. 各ステップの完了後、簡易動作確認（`npm run dev` で画面が壊れていないか等）を行ってから次に進む
3. 実装中に設計との食い違いが出た場合は、`mealtracking_m1_design.md` 側を更新してから次のステップに進む

---

## M1（実装完了済み）

---

## ステップ0：プロジェクトセットアップ

```
Vite + React + TypeScriptでプロジェクトを新規作成してください。
以下の要件で進めてください。

- プロジェクト名: mealtracking-app
- Tailwind CSSを導入し、動作確認用に簡単なページを表示する
- Dexie.js（IndexedDBラッパー）をインストールする
- vite-plugin-pwaをインストールし、最低限のPWA設定（manifest.json、アイコンはプレースホルダーでよい）を行う
- 対象デバイスはiPad Chromeなので、モバイル/タブレット幅を基準にviewport設定を行う

完了後、npm run devで起動確認できる状態にしてください。
```

---

## ステップ1：データモデル・DB層の実装

```
以下の仕様でDexie.jsのデータベース層（src/db.ts）を実装してください。

【型定義】
- Food: { id?: number, name: string, isFavorite: boolean, createdAt: string }
- MealRecord: { id?: number, recordedAt: string, recordedBy: Recorder, items: MealRecordItem[] }
- MealRecordItem: { foodId: number, foodName: string, level: CompletionLevel }
- CompletionLevel: "full" | "half" | "none"
- Recorder: "father" | "mother"

【Dexieスキーマ】
- DB名: MealTrackingDB
- foods テーブル: '++id, name, isFavorite'
- records テーブル: '++id, recordedAt, recordedBy'

【初期データ】
アプリ初回起動時、foodsテーブルが空であれば以下を投入してください。
にんじん、かぼちゃ、豆腐、しらす、バナナ、ほうれん草、じゃがいも、米（10倍粥）、さつまいも、りんご
（すべて isFavorite: true として登録）

型定義は src/types.ts に分離し、db.tsとscreens/componentsから共有できるようにしてください。
```

---

## ステップ2：記録入力画面の実装

```
src/screens/RecordInputScreen.tsx として、離乳食の記録入力画面を実装してください。

【機能要件】
1. foodsテーブルから食材一覧を取得し、チップ形式で表示する（複数選択可能）
2. 選択中の食材が、これまでの records.items に一度も出現していない場合、「はじめて」ラベルを表示する
   （records全件を取得し、items[].foodNameの集合と照合する形でよい）
3. 選択した食材ごとに、完食度（完食／一部／未食）を3ボタンで選択できるUIを表示する
4. 保存ボタン押下時のバリデーション：
   - 食材が1つも選択されていない場合 → 保存せず、エラーメッセージ「食材をひとつ以上選んでください」を表示
   - 選択済みの食材に完食度が未選択のものがある場合 → 保存せず、該当食材名を含むエラーメッセージを表示
5. バリデーションを通過したら、選択内容を1件の MealRecord としてrecordsテーブルに保存する
   - recordedAt は保存時点の現在時刻（ISO8601）
   - recordedBy は画面上部のトグルで選択された記録者（father/mother）
6. 保存成功後、選択状態をリセットする

【UIの参考】
- 食材チップ: 選択中はアクセントカラーで強調、「はじめて」の食材は警告色で区別
- 完食度ボタン: アイコン＋ラベル（例: 完食/一部/未食）で3択、選択中のものを強調表示
- Tailwind CSSでスタイリングし、iPadのタッチ操作を想定してタップ領域を十分に確保する（最低44px四方）
```

---

## ステップ3：記録一覧画面の実装

```
src/screens/RecordListScreen.tsx として、記録一覧画面を実装してください。

【機能要件】
1. recordsテーブルから全件取得し、recordedAt の降順（新しい記録が上）で表示する
2. 各記録をカード形式で表示する
   - 時刻（recordedAtをHH:mm形式に整形）
   - 記録者（father→「父」、mother→「母」等、日本語表示に変換）
   - 記録した食材ごとに、食材名と完食度アイコンをピル形式で表示
3. 記録が0件の場合は、空状態向けのメッセージを表示する（「まだ記録がありません。食後に記録してみましょう。」等）
4. 画面上部に「記録する」ボタンを配置し、押下でRecordInputScreenへの遷移をトリガーする（App.tsx側で画面切替を制御する前提でよい）

Tailwind CSSでスタイリングし、iPad画面幅（横向き想定、1024px前後）で見やすいレイアウトにしてください。
```

---

## ステップ4：画面切替の統合（App.tsx）

```
src/App.tsx を実装し、以下を満たしてください。

1. 画面状態（"list" | "input"）をuseStateで管理し、RecordListScreenとRecordInputScreenを切り替える
2. 画面上部に記録者切替トグル（父／母）を常時表示し、選択状態はContext等でRecordInputScreenと共有する
   - ログイン相当の認証は不要。単純な状態切替でよい
3. RecordListScreenの「記録する」ボタン押下で"input"画面へ、RecordInputScreenの保存完了で"list"画面へ自動遷移する
4. ルーティングライブラリは導入せず、state切替のみで実装する

実装後、npm run devで以下のフローが一通り動作することを確認してください。
記録一覧を開く → 記録するボタンを押す → 食材と完食度を選んで保存する → 一覧に反映されている
```

---

## ステップ5：PWA仕上げ・iPad動作確認

```
以下を実施してください。

1. vite-plugin-pwaの設定を仕上げる（manifest.jsonのアプリ名・アイコン・theme_color等）
2. iPad Chromeでの表示を想定し、以下を確認・調整する
   - タップ領域が指での操作に十分なサイズか（44px以上）
   - 横向き・縦向き両方でレイアウトが崩れないか
   - IndexedDBへの保存が正しく行われているか（ブラウザのDevToolsで確認）
3. ビルド（npm run build）してエラーが出ないことを確認する
```

---

## M1.5：CRUD補完・入力改善

> M1運用フィードバック（`mealtracking_usecase_ui.md` 9章）を受けた追加開発。既存のsrc/db.ts、RecordListScreen.tsx、RecordInputScreen.tsxを拡張する。
> **（実装完了済み）**

## ステップ6：記録の編集・削除機能

```
既存のsrc/db.ts、RecordListScreen.tsx を以下の要件で拡張してください。

【機能要件】
1. RecordListScreenの各記録カードに「編集」「削除」ボタンを追加する
2. 「編集」押下時：RecordInputScreenを編集モードで開き、対象記録の食材選択・完食度・記録時刻を初期値として表示する
   - 保存時は db.records.add ではなく db.records.update(recordId, {...}) を使う
3. 「削除」押下時：確認ダイアログ（「この記録を削除しますか？」）を表示し、確認後に db.records.delete(recordId) を実行する
4. RecordInputScreenは新規作成モードと編集モードの両方に対応できるようにする（propsで対象recordIdの有無により分岐）

既存のUC1（新規記録）の動作を壊さないよう注意してください。
```

---

## ステップ7：記録時刻の編集UI

```
RecordInputScreen に、記録時刻を編集できるUIを追加してください。

【機能要件】
1. デフォルトは保存時点の現在時刻（既存動作を維持）だが、時刻入力欄（HH:mm形式）を表示し、手動で変更できるようにする
2. 変更した時刻を recordedAt として保存する（日付は当日固定でよい。日付をまたぐ編集はM1.5のスコープ外とする）
3. 時刻入力はiPadでのタップ操作を想定し、ネイティブの<input type="time">またはそれに準じたUIコンポーネントを使う
```

---

## ステップ8：食材のテキスト自由入力

```
RecordInputScreen の食材選択部分に、自由テキストで食材を追加できる入力欄を追加してください。

【機能要件】
1. 食材チップ一覧の下（または上）に、テキスト入力欄と「追加」ボタンを配置する
2. テキスト入力して確定した際、以下のロジックで処理する
   - db.foods を name で検索し、既存の食材と完全一致すればそれを選択状態にする
   - 一致しなければ、新規食材として db.foods.add({ name: inputName, isFavorite: false, createdAt: 現在時刻 }) を実行し、選択状態にする
3. 追加した食材は既存のチップ選択・完食度選択のフローにそのまま合流させる（特別扱いしない）
```

---

## ステップ9：食材マスタの拡充

```
src/db.ts の初期データ（initialFoods）を、月齢別の離乳食解禁食材リストをベースにしたセットに拡充してください。

【要件】
1. 一般的な離乳食の月齢区分（ゴックン期・モグモグ期・カミカミ期等）で使われる代表的な食材を、20〜30品目程度リストアップする
   （具体的な品目は一般的な離乳食ガイドラインを参考にしてよいが、最終的な品目は大蒲さんに確認する前提で仮リストを作成する）
2. Foodの型はそのまま（月齢区分のフィールド追加は今回のスコープ外、isFavoriteのみで運用）
3. 既存ユーザーのDBには影響しないよう、初期データ投入は「foodsテーブルが空の場合のみ」という既存条件を維持する

実装後、追加した食材リストを一覧で提示してください（大蒲さんが確認・取捨選択できるように）。
```

---

## M1.6：食材カテゴリ・食材一覧管理

> M1.5完了後に判明した課題（`mealtracking_usecase_ui.md` 9.5）への対応。既存のsrc/db.ts、RecordInputScreen.tsxを拡張し、新規に食材一覧画面を追加する。

## ステップ10：Food型へのカテゴリ追加とDBマイグレーション

```
src/db.ts、src/types.ts を以下の要件で拡張してください。

【型定義の変更】
- Food に category: FoodCategory[] を追加する（複数選択可）
- FoodCategory型を新設: "carbohydrate" | "vegetable" | "fruit" | "meat" | "fish" | "bean" | "dairy_egg" | "seasoning" | "beverage" | "other"
  （日本語ラベル：炭水化物／野菜／くだもの／肉／魚／豆・加工品／卵・乳製品／調味料／飲料／その他）

【Dexieスキーマの変更】
- バージョンを2に上げ、foodsテーブルのインデックスに *category（multi-entry index）を追加する
  this.version(2).stores({
    foods: '++id, name, isFavorite, *category',
    records: '++id, recordedAt, recordedBy'
  }).upgrade(tx => {
    return tx.table('foods').toCollection().modify(food => {
      if (!food.category) food.category = [];
    });
  });
- 既存のfoods・recordsデータが失われないこと、categoryフィールドがない既存レコードには空配列が補完されることを確認してください

【初期データの更新】
- ステップ9で拡充した食材リストに、それぞれ適切なcategoryを割り当ててください（複数該当する場合は複数指定してよい）
- 割り当て結果を一覧で提示してください（大蒲さんが確認・修正できるように）
```

---

## ステップ11：記録入力画面へのカテゴリ絞り込み追加

```
RecordInputScreen の食材チップ表示部分に、カテゴリタブによる絞り込み機能を追加してください。

【機能要件】
1. 食材チップ一覧の上部に、カテゴリタブ（炭水化物／野菜／くだもの／肉／魚／豆・加工品／卵・乳製品／調味料／飲料／その他／すべて）を横スクロールまたは折り返しで配置する
2. 「すべて」がデフォルト選択（絞り込みなし、既存動作を維持）
3. タブ選択時、選択中カテゴリに該当する食材（category配列にそのカテゴリを含む食材）のみをチップ表示する
   - 例：db.foods.where('category').equals('vegetable') 相当のクエリ、または全件取得後にfilterで絞り込む
4. カテゴリを切り替えても、既に選択済みの食材（他カテゴリのもの含む）の選択状態は保持する

iPadのタッチ操作を想定し、タブのタップ領域を十分に確保してください（最低44px四方）。
```

---

## ステップ12：食材一覧画面の実装

```
src/screens/FoodListScreen.tsx として、食材一覧画面を新規実装してください。

【機能要件】
1. db.foods から全件取得し、一覧表示する（食材名、カテゴリラベルを表示）
2. 画面上部にステップ11と同じカテゴリタブを配置し、絞り込み表示できるようにする（共通コンポーネント化を推奨）
3. 各食材をタップすると編集モーダルが開き、名前・カテゴリ（複数選択）を変更できる
   - 保存は db.foods.update(foodId, { name, category })
4. 各食材に削除ボタンを配置し、押下時は確認ダイアログ（「この食材を削除しますか？過去の記録には影響しません」等）を表示してから db.foods.delete(foodId) を実行する
5. 記録入力画面（RecordInputScreen）とは独立した画面として、App.tsx側の画面遷移に "foodList" を追加し、ホーム画面等から遷移できる導線を用意する

Tailwind CSSでスタイリングし、iPad画面幅で見やすいリストレイアウトにしてください。
```

---

## ステップ13：食材削除の非破壊性確認

```
以下を確認・検証してください。

1. 食材一覧画面（ステップ12）で食材を削除した後、過去にその食材を含む記録（RecordListScreenの記録一覧）を開き、食材名が引き続き正しく表示されることを確認する
   （MealRecordItem.foodName は記録時点で非正規化保持されているため、Foodテーブルの削除に影響されない設計になっているはずです）
2. 削除した食材が、記録入力画面（RecordInputScreen）のチップ候補から消えていることを確認する
3. 上記が期待通りでない場合は、db.tsのデータ取得ロジックを見直してください（recordsの表示はfoodsテーブルへの再参照ではなく、MealRecordItem.foodNameを直接使う実装になっているか確認）
```

---

## 各ステップ完了後のチェックリスト（`mealtracking_usecase_ui.md` 6〜7.5章と対応）

### M1（完了済み）
- [x] ステップ0〜5完了 → 6章のタスクはすべてチェック済み

### M1.5（完了済み）
- [x] ステップ6完了 → 「記録編集機能」「記録削除機能」にチェック
- [x] ステップ7完了 → 「記録時刻の編集UI」にチェック
- [x] ステップ8完了 → 「食材チップへの自由テキスト入力追加」にチェック
- [x] ステップ9完了 → 「食材マスタの拡充」にチェック

### M1.6（完了済み）
- [x] ステップ10完了 → 「Food型へのカテゴリフィールド追加」「既存食材へのカテゴリ付与」にチェック
- [x] ステップ11完了 → 「記録入力画面（②）へのカテゴリタブ追加・絞り込みロジック実装」にチェック
- [x] ステップ12完了 → 「食材一覧画面（⑤）の新規実装」「編集機能」「削除機能」にチェック
- [x] ステップ13完了 → 「食材削除後も過去記録の表示が壊れないことを確認」にチェック

M2以降（M3：アレルギー・初回食材管理、M2：献立記録＋週間献立表）の実装ステップは `mealtracking_claude_code_instructions_m2.md` を参照してください。

各ステップ完了時は `mealtracking_usecase_ui.md` の該当タスクにチェックを入れて進捗を反映してください。
