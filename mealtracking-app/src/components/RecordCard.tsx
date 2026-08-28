import type { CompletionLevel, MealRecord } from "../types";
import { COMPLETION_LEVEL_META, RECORDER_LABEL } from "../labels";
import { formatTime } from "../format";

interface RecordCardProps {
  record: MealRecord;
  hasSymptomRecord: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onRecordSymptom: () => void;
}

const LEVEL_PILL_STYLE: Record<CompletionLevel, string> = {
  full: "bg-green-100 text-green-800",
  half: "bg-yellow-100 text-yellow-800",
  none: "bg-gray-100 text-gray-600",
};

function RecordCard({
  record,
  hasSymptomRecord,
  onEdit,
  onDelete,
  onRecordSymptom,
}: RecordCardProps) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-lg font-semibold text-gray-900">
          {formatTime(record.recordedAt)}
          {hasSymptomRecord && (
            <span title="症状の記録があります" aria-label="症状の記録があります">
              ⚠️
            </span>
          )}
        </span>
        <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-700">
          記録者：{RECORDER_LABEL[record.recordedBy]}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {record.items.map((item, index) => (
          <span
            key={`${item.foodId}-${index}`}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${LEVEL_PILL_STYLE[item.level]}`}
          >
            <span>{COMPLETION_LEVEL_META[item.level].icon}</span>
            <span>{item.foodName}</span>
          </span>
        ))}
      </div>
      <div className="mt-3 flex gap-2 border-t border-orange-50 pt-3">
        <button
          type="button"
          onClick={onEdit}
          className="min-h-11 flex-1 rounded-xl border-2 border-gray-200 bg-white text-sm font-medium text-gray-700 transition active:scale-95"
        >
          編集
        </button>
        <button
          type="button"
          onClick={onRecordSymptom}
          className="min-h-11 flex-1 rounded-xl border-2 border-amber-300 bg-white text-sm font-medium text-amber-700 transition active:scale-95"
        >
          症状を記録
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="min-h-11 flex-1 rounded-xl border-2 border-red-200 bg-white text-sm font-medium text-red-600 transition active:scale-95"
        >
          削除
        </button>
      </div>
    </div>
  );
}

export default RecordCard;
