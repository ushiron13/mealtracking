import { useEffect, useMemo, useState } from "react";
import { db } from "../db";
import type { CompletionLevel, Food, MealRecordItem, Recorder } from "../types";
import FoodChip from "../components/FoodChip";
import CompletionLevelButton from "../components/CompletionLevelButton";

const LEVELS: CompletionLevel[] = ["full", "half", "none"];

const RECORDER_META: Record<Recorder, string> = {
  father: "父",
  mother: "母",
};

function RecordInputScreen() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [recordedFoodNames, setRecordedFoodNames] = useState<Set<string>>(
    new Set(),
  );
  const [isLoading, setIsLoading] = useState(true);

  const [recorder, setRecorder] = useState<Recorder>("mother");
  const [selectedFoodIds, setSelectedFoodIds] = useState<number[]>([]);
  const [levels, setLevels] = useState<Partial<Record<number, CompletionLevel>>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [allFoods, allRecords] = await Promise.all([
        db.foods.toArray(),
        db.records.toArray(),
      ]);
      if (cancelled) return;

      allFoods.sort((a, b) => a.name.localeCompare(b.name, "ja"));
      setFoods(allFoods);

      const names = new Set<string>();
      for (const record of allRecords) {
        for (const item of record.items) {
          names.add(item.foodName);
        }
      }
      setRecordedFoodNames(names);
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const foodMap = useMemo(() => {
    const map = new Map<number, Food>();
    for (const food of foods) {
      if (food.id !== undefined) map.set(food.id, food);
    }
    return map;
  }, [foods]);

  function toggleFood(foodId: number) {
    setError(null);
    setSelectedFoodIds((prev) =>
      prev.includes(foodId)
        ? prev.filter((id) => id !== foodId)
        : [...prev, foodId],
    );
    setLevels((prev) => {
      if (!(foodId in prev)) return prev;
      const next = { ...prev };
      delete next[foodId];
      return next;
    });
  }

  function selectLevel(foodId: number, level: CompletionLevel) {
    setError(null);
    setLevels((prev) => ({ ...prev, [foodId]: level }));
  }

  async function handleSave() {
    setSuccessMessage(null);

    if (selectedFoodIds.length === 0) {
      setError("食材をひとつ以上選んでください");
      return;
    }

    const missingIds = selectedFoodIds.filter((id) => !levels[id]);
    if (missingIds.length > 0) {
      const missingNames = missingIds
        .map((id) => foodMap.get(id)?.name)
        .filter((name): name is string => Boolean(name))
        .join("、");
      setError(`${missingNames}の完食度を選択してください`);
      return;
    }

    setError(null);

    const items: MealRecordItem[] = selectedFoodIds.map((id) => {
      const food = foodMap.get(id);
      return {
        foodId: id,
        foodName: food?.name ?? "",
        level: levels[id] as CompletionLevel,
      };
    });

    await db.records.add({
      recordedAt: new Date().toISOString(),
      recordedBy: recorder,
      items,
    });

    setRecordedFoodNames((prev) => {
      const next = new Set(prev);
      for (const item of items) next.add(item.foodName);
      return next;
    });

    setSelectedFoodIds([]);
    setLevels({});
    setSuccessMessage("保存しました");
    window.setTimeout(() => setSuccessMessage(null), 2000);
  }

  const selectedFoods = selectedFoodIds
    .map((id) => foodMap.get(id))
    .filter((food): food is Food => Boolean(food));

  return (
    <div className="min-h-svh bg-orange-50 px-4 py-6 sm:px-8">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-orange-900 sm:text-3xl">
            記録する
          </h1>
          <p className="text-sm text-orange-700 sm:text-base">
            食材を選んで、完食度を記録しましょう
          </p>
        </header>

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100">
          <h2 className="mb-3 text-sm font-semibold text-gray-500">記録者</h2>
          <div className="flex gap-3">
            {(Object.keys(RECORDER_META) as Recorder[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRecorder(r)}
                aria-pressed={recorder === r}
                className={`min-h-11 flex-1 rounded-xl border-2 py-2.5 text-base font-medium transition active:scale-95 ${
                  recorder === r
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                {RECORDER_META[r]}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100">
          <h2 className="mb-3 text-sm font-semibold text-gray-500">
            食材を選ぶ（複数選択可）
          </h2>
          {isLoading ? (
            <p className="text-sm text-gray-400">読み込み中...</p>
          ) : foods.length === 0 ? (
            <p className="text-sm text-gray-400">食材が登録されていません</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {foods.map((food) => (
                <FoodChip
                  key={food.id}
                  food={food}
                  selected={
                    food.id !== undefined && selectedFoodIds.includes(food.id)
                  }
                  isFirstTime={!recordedFoodNames.has(food.name)}
                  onToggle={() => food.id !== undefined && toggleFood(food.id)}
                />
              ))}
            </div>
          )}
        </section>

        {selectedFoods.length > 0 && (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100">
            <h2 className="mb-3 text-sm font-semibold text-gray-500">
              完食度を選ぶ
            </h2>
            <div className="space-y-4">
              {selectedFoods.map((food) => (
                <div key={food.id}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-medium text-gray-800">
                      {food.name}
                    </span>
                    {food.id !== undefined &&
                      !recordedFoodNames.has(food.name) && (
                        <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-semibold text-amber-900">
                          はじめて
                        </span>
                      )}
                  </div>
                  <div className="flex gap-2">
                    {LEVELS.map((level) => (
                      <CompletionLevelButton
                        key={level}
                        level={level}
                        selected={food.id !== undefined && levels[food.id] === level}
                        onClick={() =>
                          food.id !== undefined && selectLevel(food.id, level)
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200"
          >
            {error}
          </p>
        )}

        {successMessage && (
          <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700 ring-1 ring-green-200">
            {successMessage}
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          className="min-h-11 w-full rounded-xl bg-orange-500 px-4 py-3 text-base font-semibold text-white shadow-sm transition active:scale-95 active:bg-orange-600"
        >
          保存する
        </button>
      </div>
    </div>
  );
}

export default RecordInputScreen;
