import { useEffect, useState } from "react";
import { db } from "../db";
import type { MealRecord, MealRecordItem, SymptomSeverity } from "../types";
import { SYMPTOM_SEVERITY_META, SYMPTOM_SEVERITIES } from "../labels";
import { formatTime, withTime } from "../format";

interface SymptomRecordScreenProps {
  recordId: number;
  onSaved: () => void;
  onCancel: () => void;
}

function SymptomRecordScreen({
  recordId,
  onSaved,
  onCancel,
}: SymptomRecordScreenProps) {
  const [record, setRecord] = useState<MealRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedFoodName, setSelectedFoodName] = useState<string | undefined>(
    undefined,
  );
  const [symptom, setSymptom] = useState("");
  const [severity, setSeverity] = useState<SymptomSeverity | undefined>(
    undefined,
  );
  const [timeInputValue, setTimeInputValue] = useState(() =>
    formatTime(new Date().toISOString()),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const found = await db.records.get(recordId);
      if (cancelled) return;
      setRecord(found ?? null);
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [recordId]);

  function toggleFood(item: MealRecordItem) {
    setSelectedFoodName((prev) =>
      prev === item.foodName ? undefined : item.foodName,
    );
  }

  async function handleSave() {
    const trimmedSymptom = symptom.trim();
    if (!trimmedSymptom) {
      setError("症状を入力してください");
      return;
    }
    if (!severity) {
      setError("重度を選択してください");
      return;
    }

    setError(null);

    const now = new Date().toISOString();
    await db.symptomRecords.add({
      mealRecordId: recordId,
      foodName: selectedFoodName,
      symptom: trimmedSymptom,
      severity,
      observedAt: withTime(now, timeInputValue),
      createdAt: now,
    });

    onSaved();
  }

  return (
    <div className="px-4 py-6 sm:px-8">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-orange-900 sm:text-3xl">
              症状を記録
            </h1>
            <p className="text-sm text-orange-700 sm:text-base">
              食後すぐでなくても、あとから記録できます
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 shrink-0 rounded-xl border-2 border-orange-500 bg-white px-5 text-base font-medium text-orange-600 transition active:scale-95"
          >
            ← 戻る
          </button>
        </header>

        {isLoading ? (
          <p className="text-sm text-gray-400">読み込み中...</p>
        ) : !record ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-orange-100">
            <p className="text-base text-gray-500">対象の記録が見つかりません</p>
          </div>
        ) : (
          <>
            <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100">
              <h2 className="mb-3 text-sm font-semibold text-gray-500">
                原因と思われる食材（任意）
              </h2>
              <div className="flex flex-wrap gap-2">
                {record.items.map((item, index) => (
                  <button
                    key={`${item.foodId}-${index}`}
                    type="button"
                    onClick={() => toggleFood(item)}
                    aria-pressed={selectedFoodName === item.foodName}
                    className={`min-h-11 min-w-11 rounded-full border-2 px-4 py-2 text-sm font-medium transition active:scale-95 ${
                      selectedFoodName === item.foodName
                        ? "border-orange-500 bg-orange-500 text-white"
                        : "border-gray-200 bg-white text-gray-700"
                    }`}
                  >
                    {item.foodName}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100">
              <label
                htmlFor="symptom-text"
                className="mb-2 block text-sm font-semibold text-gray-500"
              >
                症状
              </label>
              <input
                id="symptom-text"
                type="text"
                value={symptom}
                onChange={(e) => setSymptom(e.target.value)}
                placeholder="例：口のまわりが赤くなった"
                className="min-h-11 w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-base text-gray-800 focus:border-orange-500 focus:outline-none"
              />
            </section>

            <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100">
              <h2 className="mb-3 text-sm font-semibold text-gray-500">重度</h2>
              <div className="flex gap-2">
                {SYMPTOM_SEVERITIES.map((level) => {
                  const { icon, label } = SYMPTOM_SEVERITY_META[level];
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSeverity(level)}
                      aria-pressed={severity === level}
                      className={`min-h-11 flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border-2 py-2.5 text-sm font-medium transition active:scale-95 ${
                        severity === level
                          ? "border-orange-500 bg-orange-500 text-white"
                          : "border-gray-200 bg-white text-gray-600"
                      }`}
                    >
                      <span className="text-xl leading-none">{icon}</span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100">
              <label
                htmlFor="symptom-observed-time"
                className="mb-3 block text-sm font-semibold text-gray-500"
              >
                気づいた時刻
              </label>
              <input
                id="symptom-observed-time"
                type="time"
                value={timeInputValue}
                onChange={(e) => setTimeInputValue(e.target.value)}
                className="min-h-11 w-full max-w-[12rem] rounded-xl border-2 border-gray-200 bg-white px-4 py-2.5 text-base font-medium text-gray-800 focus:border-orange-500 focus:outline-none"
              />
            </section>

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
              保存する
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default SymptomRecordScreen;
