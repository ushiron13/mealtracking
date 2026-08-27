import { useEffect, useMemo, useState } from "react";
import { db, updateRecord } from "../db";
import type { CompletionLevel, Food, MealRecordItem } from "../types";
import { useRecorder } from "../RecorderContext";
import { formatTime, withTime } from "../format";
import FoodChip from "../components/FoodChip";
import CompletionLevelButton from "../components/CompletionLevelButton";

const TIME_PATTERN = /^\d{2}:\d{2}$/;

const LEVELS: CompletionLevel[] = ["full", "half", "none"];

interface RecordInputScreenProps {
  recordId?: number;
  onSaved: () => void;
}

function RecordInputScreen({ recordId, onSaved }: RecordInputScreenProps) {
  const isEditMode = recordId !== undefined;
  const { recorder } = useRecorder();

  const [foods, setFoods] = useState<Food[]>([]);
  const [recordedFoodNames, setRecordedFoodNames] = useState<Set<string>>(
    new Set(),
  );
  const [isLoading, setIsLoading] = useState(true);

  const [selectedFoodIds, setSelectedFoodIds] = useState<number[]>([]);
  const [levels, setLevels] = useState<Partial<Record<number, CompletionLevel>>>(
    {},
  );
  const [originalRecordedAt, setOriginalRecordedAt] = useState<string | null>(
    null,
  );
  const [timeInputValue, setTimeInputValue] = useState(() =>
    formatTime(new Date().toISOString()),
  );
  const [isTimeManuallyEdited, setIsTimeManuallyEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (recordId === undefined) return;
    let cancelled = false;

    async function loadRecord() {
      const record = await db.records.get(recordId as number);
      if (cancelled || !record) return;

      setOriginalRecordedAt(record.recordedAt);
      setTimeInputValue(formatTime(record.recordedAt));
      setIsTimeManuallyEdited(false);
      setSelectedFoodIds(record.items.map((item) => item.foodId));
      setLevels(
        Object.fromEntries(
          record.items.map((item) => [item.foodId, item.level]),
        ),
      );
    }

    loadRecord();
    return () => {
      cancelled = true;
    };
  }, [recordId]);

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

  function handleTimeChange(value: string) {
    setTimeInputValue(value);
    setIsTimeManuallyEdited(TIME_PATTERN.test(value));
  }

  async function handleSave() {
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

    const hasManualTime = isTimeManuallyEdited && TIME_PATTERN.test(timeInputValue);

    if (isEditMode) {
      const baseRecordedAt = originalRecordedAt ?? new Date().toISOString();
      await updateRecord(recordId as number, {
        recordedAt: hasManualTime
          ? withTime(baseRecordedAt, timeInputValue)
          : baseRecordedAt,
        recordedBy: recorder,
        items,
      });
    } else {
      const now = new Date().toISOString();
      await db.records.add({
        recordedAt: hasManualTime ? withTime(now, timeInputValue) : now,
        recordedBy: recorder,
        items,
      });
    }

    setSelectedFoodIds([]);
    setLevels({});
    onSaved();
  }

  const selectedFoods = selectedFoodIds
    .map((id) => foodMap.get(id))
    .filter((food): food is Food => Boolean(food));

  return (
    <div className="px-4 py-6 sm:px-8">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-orange-900 sm:text-3xl">
            {isEditMode ? "記録を編集" : "記録する"}
          </h1>
          <p className="text-sm text-orange-700 sm:text-base">
            食材を選んで、完食度を記録しましょう
          </p>
        </header>

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100">
          <label
            htmlFor="recorded-time"
            className="mb-3 block text-sm font-semibold text-gray-500"
          >
            記録時刻
          </label>
          <input
            id="recorded-time"
            type="time"
            value={timeInputValue}
            onChange={(e) => handleTimeChange(e.target.value)}
            className="min-h-11 w-full max-w-[12rem] rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-base font-medium text-gray-800 focus:border-orange-500 focus:outline-none"
          />
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

        <button
          type="button"
          onClick={handleSave}
          className="min-h-11 w-full rounded-xl bg-orange-500 px-4 py-3 text-base font-semibold text-white shadow-sm transition active:scale-95 active:bg-orange-600"
        >
          {isEditMode ? "更新する" : "保存する"}
        </button>
      </div>
    </div>
  );
}

export default RecordInputScreen;
