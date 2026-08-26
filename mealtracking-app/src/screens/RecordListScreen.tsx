import { useEffect, useState } from "react";
import { db } from "../db";
import type { MealRecord } from "../types";
import RecordCard from "../components/RecordCard";

interface RecordListScreenProps {
  onNavigateToInput: () => void;
}

function RecordListScreen({ onNavigateToInput }: RecordListScreenProps) {
  const [records, setRecords] = useState<MealRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const allRecords = await db.records.orderBy("recordedAt").reverse().toArray();
      if (cancelled) return;
      setRecords(allRecords);
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

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
          <button
            type="button"
            onClick={onNavigateToInput}
            className="min-h-11 shrink-0 rounded-xl bg-orange-500 px-5 py-3 text-base font-semibold text-white shadow-sm transition active:scale-95 active:bg-orange-600"
          >
            ＋ 記録する
          </button>
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
              <RecordCard key={record.id} record={record} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default RecordListScreen;
