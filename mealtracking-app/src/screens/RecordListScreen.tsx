import { useEffect, useState } from "react";
import { db, deleteRecord } from "../db";
import type { MealRecord } from "../types";
import RecordCard from "../components/RecordCard";

interface RecordListScreenProps {
  onNavigateToInput: () => void;
  onEditRecord: (recordId: number) => void;
  onNavigateToFoodList: () => void;
  onNavigateToFirstTryList: () => void;
  onRecordSymptom: (recordId: number) => void;
}

function RecordListScreen({
  onNavigateToInput,
  onEditRecord,
  onNavigateToFoodList,
  onNavigateToFirstTryList,
  onRecordSymptom,
}: RecordListScreenProps) {
  const [records, setRecords] = useState<MealRecord[]>([]);
  const [recordIdsWithSymptom, setRecordIdsWithSymptom] = useState<
    Set<number>
  >(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [allRecords, allSymptomRecords] = await Promise.all([
        db.records.orderBy("recordedAt").reverse().toArray(),
        db.symptomRecords.toArray(),
      ]);
      if (cancelled) return;
      setRecords(allRecords);
      setRecordIdsWithSymptom(
        new Set(allSymptomRecords.map((s) => s.mealRecordId)),
      );
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(recordId: number) {
    if (!window.confirm("この記録を削除しますか？")) return;
    await deleteRecord(recordId);
    setRecords((prev) => prev.filter((record) => record.id !== recordId));
  }

  return (
    <div className="px-4 py-6 sm:px-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-orange-900 sm:text-3xl">
              記録一覧
            </h1>
            <p className="text-sm text-orange-700 sm:text-base">
              離乳食の記録を確認できます
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={onNavigateToFirstTryList}
              className="min-h-11 rounded-xl border-2 border-orange-500 bg-white px-5 text-base font-medium text-orange-600 transition active:scale-95"
            >
              初回食材の履歴
            </button>
            <button
              type="button"
              onClick={onNavigateToFoodList}
              className="min-h-11 rounded-xl border-2 border-orange-500 bg-white px-5 text-base font-medium text-orange-600 transition active:scale-95"
            >
              食材一覧
            </button>
            <button
              type="button"
              onClick={onNavigateToInput}
              className="min-h-11 rounded-xl bg-orange-500 px-5 py-3 text-base font-semibold text-white shadow-sm transition active:scale-95 active:bg-orange-600"
            >
              ＋ 記録する
            </button>
          </div>
        </header>

        {isLoading ? (
          <p className="text-sm text-gray-400">読み込み中...</p>
        ) : records.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-orange-100">
            <p className="text-base text-gray-500">
              まだ記録がありません。食後に記録してみましょう。
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {records.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                hasSymptomRecord={
                  record.id !== undefined && recordIdsWithSymptom.has(record.id)
                }
                onEdit={() => record.id !== undefined && onEditRecord(record.id)}
                onDelete={() => record.id !== undefined && handleDelete(record.id)}
                onRecordSymptom={() =>
                  record.id !== undefined && onRecordSymptom(record.id)
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default RecordListScreen;
