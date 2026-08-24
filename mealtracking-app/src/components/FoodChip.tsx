import type { Food } from "../types";

interface FoodChipProps {
  food: Food;
  selected: boolean;
  isFirstTime: boolean;
  onToggle: () => void;
}

function FoodChip({ food, selected, isFirstTime, onToggle }: FoodChipProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      className={`min-h-11 min-w-11 inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-2.5 text-base font-medium transition active:scale-95 ${
        selected
          ? "border-orange-500 bg-orange-500 text-white shadow-sm"
          : isFirstTime
            ? "border-amber-400 bg-amber-50 text-amber-800"
            : "border-gray-200 bg-white text-gray-700"
      }`}
    >
      <span>{food.name}</span>
      {isFirstTime && (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            selected ? "bg-white/25 text-white" : "bg-amber-400 text-amber-900"
          }`}
        >
          はじめて
        </span>
      )}
    </button>
  );
}

export default FoodChip;
