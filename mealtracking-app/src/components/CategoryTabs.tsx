import type { FoodCategory } from "../types";
import { FOOD_CATEGORIES, FOOD_CATEGORY_LABEL } from "../labels";

export type CategoryFilter = FoodCategory | "all";

interface CategoryTabsProps {
  selected: CategoryFilter;
  onSelect: (category: CategoryFilter) => void;
}

function CategoryTabs({ selected, onSelect }: CategoryTabsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onSelect("all")}
        aria-pressed={selected === "all"}
        className={`min-h-11 min-w-11 rounded-full border-2 px-4 py-2 text-sm font-medium transition active:scale-95 ${
          selected === "all"
            ? "border-orange-500 bg-orange-500 text-white"
            : "border-gray-200 bg-white text-gray-700"
        }`}
      >
        すべて
      </button>
      {FOOD_CATEGORIES.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => onSelect(category)}
          aria-pressed={selected === category}
          className={`min-h-11 min-w-11 rounded-full border-2 px-4 py-2 text-sm font-medium transition active:scale-95 ${
            selected === category
              ? "border-orange-500 bg-orange-500 text-white"
              : "border-gray-200 bg-white text-gray-700"
          }`}
        >
          {FOOD_CATEGORY_LABEL[category]}
        </button>
      ))}
    </div>
  );
}

export default CategoryTabs;
