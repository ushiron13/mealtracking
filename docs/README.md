# docs

離乳食トラッキング機能の開発方針・データモデル設計・実装計画をまとめたドキュメント群です。実装作業の前に該当ドキュメントを確認し、既存の設計判断・データモデル・命名規則との一貫性を保ってください。ブランチ運用など開発フロー全般のポリシーはリポジトリルートの `CLAUDE.md` を参照してください。

## ファイル一覧

- **`mealtracking_usecase_ui.md`** — ユースケース・画面構成・マイルストーン（M1〜M5）・実装タスクリスト。進捗管理はこのファイルのチェックリストに一元化する
- **`mealtracking_m1_design.md`** — M1・M1.5・M1.6（最小記録機能・CRUD補完・食材カテゴリ管理）の技術スタック・データモデル（`Food` / `MealRecord` 等）・Dexieスキーマの設計判断
- **`mealtracking_claude_code_instructions.md`** — M1系（ステップ0〜13）の実装指示書。すべて実装完了済み
- **`mealtracking_m2_design.md`** — M2以降（M3：アレルギー・初回食材管理、M2：献立記録＋週間献立表）の技術設計。`SymptomRecord`、`MenuPlan`／`MenuLog`（予定・状態とイベントの分離）等
- **`mealtracking_claude_code_instructions_m2.md`** — M2以降（ステップ14〜22）の実装指示書。実装順序はM3が先行、M2が後続

## 運用ルール

- 実装中に設計との食い違いが出た場合は、コードだけでなく該当ドキュメント（M1系は `mealtracking_m1_design.md`、M2以降は `mealtracking_m2_design.md`）も更新してから次の作業に進む
- 各ステップ・タスク完了時は `mealtracking_usecase_ui.md` の該当チェックリストにチェックを入れる
- 計画にない追加要望を実装した場合も、影響するデータモデル・ユースケースがあれば該当ドキュメントに追記する
