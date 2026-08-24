import type { CompletionLevel } from "../types";

interface CompletionLevelButtonProps {
  level: CompletionLevel;
  selected: boolean;
  onClick: () => void;
}

const LEVEL_META: Record<CompletionLevel, { icon: string; label: string }> = {
  full: { icon: "😋", label: "完食" },
  half: { icon: "🙂", label: "一部" },
  none: { icon: "😐", label: "未食" },
};

const SELECTED_STYLE: Record<CompletionLevel, string> = {
  full: "border-green-500 bg-green-500 text-white",
  half: "border-yellow-500 bg-yellow-500 text-white",
  none: "border-gray-500 bg-gray-500 text-white",
};

function CompletionLevelButton({
  level,
  selected,
  onClick,
}: CompletionLevelButtonProps) {
  const { icon, label } = LEVEL_META[level];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-11 flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border-2 py-2.5 text-sm font-medium transition active:scale-95 ${
        selected
          ? SELECTED_STYLE[level]
          : "border-gray-200 bg-white text-gray-600"
      }`}
    >
      <span className="text-xl leading-none">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

export default CompletionLevelButton;
