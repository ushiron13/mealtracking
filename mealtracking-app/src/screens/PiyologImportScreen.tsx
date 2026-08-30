import { useState } from "react";
import { consumeInventory, db } from "../db";
import { parsePiyologText } from "../piyolog";
import type { Food } from "../types";

interface ParsedRow {
  key: string;
  date: string;
  foodName: string;
  matchedFood?: Food;
  checked: boolean;
}

interface ImportHistoryEntry {
  importedAt: string;
  count: number;
}

const DUMMY_FORMAT_EXAMPLE = `【ぴよログ】2026年8月
2026/8/25(火) 子供の名前 (0歳8か月10日)
07:30 離乳食 かぼちゃ粥 にんじん
12:00 離乳食 豆腐 ほうれん草`;

function PiyologImportScreen() {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [history, setHistory] = useState<ImportHistoryEntry[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function handleParse() {
    const parsed = parsePiyologText(text);
    const foods = await db.foods.toArray();
    const foodByName = new Map(foods.map((f) => [f.name, f]));

    const nextRows: ParsedRow[] = [];
    parsed.forEach(({ date, foodMentions }) => {
      foodMentions.forEach((foodName, index) => {
        const matchedFood = foodByName.get(foodName);
        nextRows.push({
          key: `${date}-${index}-${foodName}`,
          date,
          foodName,
          matchedFood,
          checked: Boolean(matchedFood),
        });
      });
    });

    setRows(nextRows);
    setMessage(nextRows.length === 0 ? "食事記録（離乳食の行）が見つかりませんでした" : null);
  }

  function toggleRow(key: string) {
    setRows((prev) =>
      prev?.map((row) => (row.key === key ? { ...row, checked: !row.checked } : row)) ?? null,
    );
  }

  async function handleConfirm() {
    if (!rows) return;
    const targets = rows.filter((row) => row.checked && row.matchedFood);

    for (const row of targets) {
      await consumeInventory(row.matchedFood!.id!, row.matchedFood!.managementType, "piyolog_import");
    }

    setHistory((prev) => [{ importedAt: new Date().toISOString(), count: targets.length }, ...prev]);
    setMessage(`${targets.length}件を在庫に反映しました`);
    setRows(null);
    setText("");
  }

  const groupedByDate: [string, ParsedRow[]][] = [];
  if (rows) {
    const map = new Map<string, ParsedRow[]>();
    for (const row of rows) {
      if (!map.has(row.date)) map.set(row.date, []);
      map.get(row.date)!.push(row);
    }
    groupedByDate.push(...map.entries());
  }

  return (
    <div className="px-4 py-6 sm:px-8">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-orange-900 sm:text-3xl">ぴよログ連携</h1>
          <p className="text-sm text-orange-700 sm:text-base">
            ぴよログの記録出力テキストを取り込み、食材の消費として在庫に反映します
          </p>
        </header>

        <section className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100">
          <label htmlFor="piyolog-text" className="block text-sm font-semibold text-gray-500">
            ぴよログの記録出力テキストを貼り付け
          </label>
          <textarea
            id="piyolog-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={DUMMY_FORMAT_EXAMPLE}
            rows={8}
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-sm text-gray-800 focus:border-orange-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleParse}
            disabled={!text.trim()}
            className="min-h-11 w-full rounded-xl bg-orange-500 px-4 py-3 text-base font-semibold text-white shadow-sm transition active:scale-95 active:bg-orange-600 disabled:opacity-40"
          >
            解析する
          </button>
        </section>

        {message && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 ring-1 ring-amber-200">
            {message}
          </p>
        )}

        {rows && rows.length > 0 && (
          <section className="space-y-4">
            {groupedByDate.map(([date, dateRows]) => (
              <div key={date} className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100">
                <h2 className="text-sm font-semibold text-gray-500">{date}</h2>
                <div className="space-y-1">
                  {dateRows.map((row) => (
                    <label
                      key={row.key}
                      className={`flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 py-2 ${
                        row.matchedFood ? "bg-white" : "bg-gray-50"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={row.checked}
                          disabled={!row.matchedFood}
                          onChange={() => toggleRow(row.key)}
                          className="h-5 w-5 accent-orange-500"
                        />
                        <span className="font-medium text-gray-800">{row.foodName}</span>
                      </span>
                      {!row.matchedFood && (
                        <span className="text-xs font-semibold text-gray-400">該当食材なし</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={handleConfirm}
              className="min-h-11 w-full rounded-xl bg-orange-500 px-4 py-3 text-base font-semibold text-white shadow-sm transition active:scale-95 active:bg-orange-600"
            >
              確定
            </button>
          </section>
        )}

        {history.length > 0 && (
          <section className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100">
            <h2 className="text-sm font-semibold text-gray-500">インポート履歴（今回のセッション）</h2>
            <ul className="space-y-1 text-sm text-gray-600">
              {history.map((entry, i) => (
                <li key={i}>
                  {new Date(entry.importedAt).toLocaleString("ja-JP")} — {entry.count}件反映
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

export default PiyologImportScreen;
