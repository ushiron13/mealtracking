import { useEffect, useState } from "react";
import { suggestMenus, type MenuSuggestion } from "../db";
import type { Food } from "../types";

interface MenuSuggestionScreenProps {
  onAdopt?: () => void;
}

function FoodChip({ food }: { food: Food }) {
  return (
    <span className="rounded-lg bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-800 ring-1 ring-orange-200">
      {food.name}
    </span>
  );
}

function MenuSuggestionScreen({ onAdopt }: MenuSuggestionScreenProps) {
  const [suggestion, setSuggestion] = useState<MenuSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadSuggestion() {
    setIsLoading(true);
    const result = await suggestMenus();
    setSuggestion(result);
    setIsLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadSuggestion();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasCandidates =
    (suggestion?.mainCandidates.length ?? 0) > 0 ||
    (suggestion?.sideCandidates.length ?? 0) > 0;

  return (
    <div className="px-4 py-6 sm:px-8">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-orange-900 sm:text-3xl">献立提案</h1>
          <p className="text-sm text-orange-700 sm:text-base">
            在庫の「なし・少ない」食材を優先的に使う候補です
          </p>
        </header>

        {isLoading ? (
          <p className="text-sm text-gray-400">読み込み中...</p>
        ) : !hasCandidates ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-orange-100">
            <p className="text-sm text-gray-500">
              現在、優先して使うべき食材はありません（在庫は十分です）。
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <section className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100">
              <h2 className="text-sm font-semibold text-gray-500">主菜候補（肉・魚・豆）</h2>
              {suggestion!.mainCandidates.length === 0 ? (
                <p className="text-sm text-gray-400">候補なし</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {suggestion!.mainCandidates.map((food) => (
                    <FoodChip key={food.id} food={food} />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-2 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100">
              <h2 className="text-sm font-semibold text-gray-500">副菜候補（野菜・くだもの）</h2>
              {suggestion!.sideCandidates.length === 0 ? (
                <p className="text-sm text-gray-400">候補なし</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {suggestion!.sideCandidates.map((food) => (
                    <FoodChip key={food.id} food={food} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {!isLoading && suggestion && suggestion.recentMenuNames.length > 0 && (
          <section className="space-y-2 rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-200">
            <h2 className="text-sm font-semibold text-amber-800">
              直近の献立（同じものが続いていないか確認）
            </h2>
            <div className="flex flex-wrap gap-2">
              {suggestion.recentMenuNames.map((name) => (
                <span
                  key={name}
                  className="rounded-lg bg-white px-3 py-1.5 text-sm text-amber-800 ring-1 ring-amber-200"
                >
                  {name}
                </span>
              ))}
            </div>
          </section>
        )}

        <button
          type="button"
          onClick={() => onAdopt?.()}
          className="min-h-11 w-full rounded-xl bg-orange-500 px-4 py-3 text-base font-semibold text-white shadow-sm transition active:scale-95 active:bg-orange-600"
        >
          これ作る
        </button>
      </div>
    </div>
  );
}

export default MenuSuggestionScreen;
