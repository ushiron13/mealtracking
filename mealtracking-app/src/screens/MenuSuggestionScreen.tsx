import { useEffect, useState } from "react";
import { adoptMenu, inferMealTiming, suggestMenus, type MenuSuggestion } from "../db";
import { toDateKey } from "../format";
import { useRecorder } from "../RecorderContext";
import type { Food } from "../types";

interface MenuSuggestionScreenProps {
  onAdopted?: () => void;
}

function FoodChip({ food }: { food: Food }) {
  return (
    <span className="rounded-lg bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-800 ring-1 ring-orange-200">
      {food.name}
    </span>
  );
}

function MenuSuggestionScreen({ onAdopted }: MenuSuggestionScreenProps) {
  const { recorder } = useRecorder();
  const [suggestion, setSuggestion] = useState<MenuSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdopting, setIsAdopting] = useState(false);

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

  async function handleAdopt(menuName: string, usedFoodIds: number[]) {
    const now = new Date();
    await adoptMenu(menuName, usedFoodIds, toDateKey(now), inferMealTiming(now), recorder);
    setIsAdopting(false);
    await loadSuggestion();
    onAdopted?.();
  }

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
          onClick={() => setIsAdopting(true)}
          disabled={!hasCandidates}
          className="min-h-11 w-full rounded-xl bg-orange-500 px-4 py-3 text-base font-semibold text-white shadow-sm transition active:scale-95 active:bg-orange-600 disabled:opacity-40"
        >
          これ作る
        </button>
      </div>

      {isAdopting && suggestion && (
        <AdoptMenuModal
          candidates={[...suggestion.mainCandidates, ...suggestion.sideCandidates]}
          onCancel={() => setIsAdopting(false)}
          onSave={handleAdopt}
        />
      )}
    </div>
  );
}

interface AdoptMenuModalProps {
  candidates: Food[];
  onCancel: () => void;
  onSave: (menuName: string, usedFoodIds: number[]) => void;
}

function AdoptMenuModal({ candidates, onCancel, onSave }: AdoptMenuModalProps) {
  const [menuName, setMenuName] = useState("");
  const [usedFoodIds, setUsedFoodIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  function toggleFood(id: number) {
    setUsedFoodIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function handleSubmit() {
    if (!menuName.trim()) {
      setError("献立名を入力してください");
      return;
    }
    setError(null);
    onSave(menuName.trim(), usedFoodIds);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-bold text-gray-900">これ作る</h2>

        <label htmlFor="adopt-menu-name" className="mb-1 block text-sm font-semibold text-gray-500">
          献立名
        </label>
        <input
          id="adopt-menu-name"
          type="text"
          value={menuName}
          onChange={(e) => setMenuName(e.target.value)}
          placeholder="例：鶏肉とトマトの煮込み"
          className="mb-4 min-h-11 w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-base text-gray-800 focus:border-orange-500 focus:outline-none"
        />

        <p className="mb-1 text-sm font-semibold text-gray-500">使用した食材（複数選択可）</p>
        <div className="mb-6 flex flex-wrap gap-2">
          {candidates.map((food) => (
            <button
              key={food.id}
              type="button"
              onClick={() => toggleFood(food.id!)}
              aria-pressed={usedFoodIds.includes(food.id!)}
              className={`min-h-11 rounded-xl border-2 px-3 text-sm font-medium transition active:scale-95 ${
                usedFoodIds.includes(food.id!)
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-gray-200 bg-white text-gray-700"
              }`}
            >
              {food.name}
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 flex-1 rounded-xl border-2 border-gray-200 bg-white text-base font-medium text-gray-700 transition active:scale-95"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="min-h-11 flex-1 rounded-xl bg-orange-500 text-base font-semibold text-white shadow-sm transition active:scale-95 active:bg-orange-600"
          >
            保存する
          </button>
        </div>
      </div>
    </div>
  );
}

export default MenuSuggestionScreen;
