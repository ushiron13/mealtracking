import { useEffect, useMemo, useState } from "react";
import { db } from "../db";
import type { Food, MealRecord, SymptomRecord } from "../types";
import { FOOD_CATEGORY_LABEL, SYMPTOM_SEVERITY_META } from "../labels";
import { formatDate, formatTime } from "../format";
import CategoryTabs, { type CategoryFilter } from "../components/CategoryTabs";

interface FirstTryListScreenProps {
  onBack: () => void;
}

interface FirstTryEntry {
  food: Food;
  firstEatenAt?: string;
  symptomRecords: SymptomRecord[];
}

function FirstTryListScreen({ onBack }: FirstTryListScreenProps) {
  const [entries, setEntries] = useState<FirstTryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [allFoods, allRecords, allSymptomRecords] = await Promise.all([
        db.foods.toArray(),
        db.records.toArray(),
        db.symptomRecords.toArray(),
      ]);
      if (cancelled) return;

      // isTriedはboolean値のためIndexedDBの索引キーとして使えず、
      // where('isTried').equals(true)は常に0件を返す（インメモリでフィルタする）
      const triedFoods = allFoods.filter((food) => food.isTried);

      const recordsByFoodId = new Map<number, MealRecord[]>();
      for (const record of allRecords) {
        for (const item of record.items) {
          const list = recordsByFoodId.get(item.foodId) ?? [];
          list.push(record);
          recordsByFoodId.set(item.foodId, list);
        }
      }

      const builtEntries: FirstTryEntry[] = triedFoods.map((food) => {
        const relatedRecords =
          food.id !== undefined ? (recordsByFoodId.get(food.id) ?? []) : [];
        const relatedRecordIds = new Set(
          relatedRecords
            .map((record) => record.id)
            .filter((id): id is number => id !== undefined),
        );
        const firstEatenAt = relatedRecords
          .map((record) => record.recordedAt)
          .sort()
          .at(0);
        const symptomRecords = allSymptomRecords.filter((symptom) =>
          relatedRecordIds.has(symptom.mealRecordId),
        );

        return { food, firstEatenAt, symptomRecords };
      });

      builtEntries.sort((a, b) => {
        if (!a.firstEatenAt && !b.firstEatenAt) return 0;
        if (!a.firstEatenAt) return 1;
        if (!b.firstEatenAt) return -1;
        return a.firstEatenAt.localeCompare(b.firstEatenAt);
      });

      setEntries(builtEntries);
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayedEntries = useMemo(
    () =>
      selectedCategory === "all"
        ? entries
        : entries.filter((entry) =>
            entry.food.category.includes(selectedCategory),
          ),
    [entries, selectedCategory],
  );

  return (
    <div className="px-4 py-6 sm:px-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-orange-900 sm:text-3xl">
              初回食材の履歴
            </h1>
            <p className="text-sm text-orange-700 sm:text-base">
              はじめて食べた食材を日時順に確認できます
            </p>
          </div>
          <button
            type="button"
            onClick={onBack}
            className="min-h-11 shrink-0 rounded-xl border-2 border-orange-500 bg-white px-5 text-base font-medium text-orange-600 transition active:scale-95"
          >
            ← 記録一覧へ戻る
          </button>
        </header>

        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100">
          <CategoryTabs selected={selectedCategory} onSelect={setSelectedCategory} />
        </section>

        {isLoading ? (
          <p className="text-sm text-gray-400">読み込み中...</p>
        ) : displayedEntries.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-orange-100">
            <p className="text-base text-gray-500">
              {entries.length === 0
                ? "まだはじめての食材の記録がありません"
                : "このカテゴリのはじめての食材はありません"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {displayedEntries.map((entry) => (
              <div
                key={entry.food.id}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100"
              >
                <p className="mb-1 font-semibold text-gray-900">
                  {entry.food.name}
                </p>
                <p className="mb-2 text-xs text-gray-500">
                  {entry.firstEatenAt
                    ? `はじめて食べた日時：${formatDate(entry.firstEatenAt)} ${formatTime(entry.firstEatenAt)}`
                    : "はじめて食べた日時：記録なし"}
                </p>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {entry.food.category.length === 0 ? (
                    <span className="text-xs text-gray-400">
                      カテゴリ未設定
                    </span>
                  ) : (
                    entry.food.category.map((category) => (
                      <span
                        key={category}
                        className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700"
                      >
                        {FOOD_CATEGORY_LABEL[category]}
                      </span>
                    ))
                  )}
                </div>

                {entry.symptomRecords.length > 0 && (
                  <div className="space-y-2 border-t border-orange-50 pt-3">
                    <p className="text-xs font-semibold text-amber-700">
                      症状の記録
                    </p>
                    {entry.symptomRecords.map((symptom) => (
                      <div
                        key={symptom.id}
                        className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900"
                      >
                        <div className="mb-1 flex items-center gap-1.5 font-medium">
                          <span>{SYMPTOM_SEVERITY_META[symptom.severity].icon}</span>
                          <span>
                            {SYMPTOM_SEVERITY_META[symptom.severity].label}
                          </span>
                          <span className="text-amber-700">
                            {formatDate(symptom.observedAt)}{" "}
                            {formatTime(symptom.observedAt)}
                          </span>
                        </div>
                        <p>{symptom.symptom}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FirstTryListScreen;
