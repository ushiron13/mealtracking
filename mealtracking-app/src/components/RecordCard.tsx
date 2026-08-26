import type { CompletionLevel, MealRecord } from "../types";
import { COMPLETION_LEVEL_META, RECORDER_LABEL } from "../labels";

interface RecordCardProps {
  record: MealRecord;
}

const LEVEL_PILL_STYLE: Record<CompletionLevel, string> = {
  full: "bg-green-100 text-green-800",
  half: "bg-yellow-100 text-yellow-800",
  none: "bg-gray-100 text-gray-600",
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  const hh = date.getHours().toString().padStart(2, "0");
  const mm = date.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function RecordCard({ record }: RecordCardProps) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-lg font-semibold text-gray-900">
          {formatTime(record.recordedAt)}
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
    </div>
  );
}

export default RecordCard;
