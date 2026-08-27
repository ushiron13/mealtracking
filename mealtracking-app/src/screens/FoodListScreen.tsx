import { useEffect, useState } from "react";
import { db, deleteFood, updateFood } from "../db";
import type { Food, FoodCategory, FoodPreference } from "../types";
import {
  FOOD_CATEGORIES,
  FOOD_CATEGORY_LABEL,
  FOOD_PREFERENCES,
  FOOD_PREFERENCE_META,
} from "../labels";
import CategoryTabs, { type CategoryFilter } from "../components/CategoryTabs";

interface FoodListScreenProps {
  onBack: () => void;
}

function FoodListScreen({ onBack }: FoodListScreenProps) {
  const [foods, setFoods] = useState<Food[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("all");

  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategories, setEditCategories] = useState<FoodCategory[]>([]);
  const [editFirstEatenDate, setEditFirstEatenDate] = useState("");
  const [editPreference, setEditPreference] = useState<FoodPreference | undefined>(
    undefined,
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const allFoods = await db.foods.toArray();
      if (cancelled) return;
      allFoods.sort((a, b) => a.name.localeCompare(b.name, "ja"));
      setFoods(allFoods);
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const displayedFoods =
    selectedCategory === "all"
      ? foods
      : foods.filter((food) => food.category.includes(selectedCategory));

  function openEdit(food: Food) {
    setEditingFood(food);
    setEditName(food.name);
    setEditCategories(food.category);
    setEditFirstEatenDate(food.firstEatenDate ?? "");
    setEditPreference(food.preference);
  }

  function closeEdit() {
    setEditingFood(null);
  }

  function toggleEditCategory(category: FoodCategory) {
    setEditCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category],
    );
  }

  function togglePreference(preference: FoodPreference) {
    setEditPreference((prev) => (prev === preference ? undefined : preference));
  }

  async function handleSaveEdit() {
    const name = editName.trim();
    if (!name || editingFood?.id === undefined) return;

    const foodId = editingFood.id;
    const firstEatenDate = editFirstEatenDate || undefined;
    const preference = editPreference;
    await updateFood(foodId, {
      name,
      category: editCategories,
      firstEatenDate,
      preference,
    });
    setFoods((prev) =>
      prev
        .map((food) =>
          food.id === foodId
            ? {
                ...food,
                name,
                category: editCategories,
                firstEatenDate,
                preference,
              }
            : food,
        )
        .sort((a, b) => a.name.localeCompare(b.name, "ja")),
    );
    closeEdit();
  }

  async function handleDelete(foodId: number) {
    if (!window.confirm("この食材を削除しますか？過去の記録には影響しません"))
      return;
    await deleteFood(foodId);
    setFoods((prev) => prev.filter((food) => food.id !== foodId));
  }

  return (
    <div className="px-4 py-6 sm:px-8">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-orange-900 sm:text-3xl">
              食材一覧
            </h1>
            <p className="text-sm text-orange-700 sm:text-base">
              登録されている食材を確認・編集できます
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
          <CategoryTabs
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        </section>

        {isLoading ? (
          <p className="text-sm text-gray-400">読み込み中...</p>
        ) : displayedFoods.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-orange-100">
            <p className="text-base text-gray-500">
              {foods.length === 0
                ? "食材が登録されていません"
                : "このカテゴリの食材はありません"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {displayedFoods.map((food) => (
              <div
                key={food.id}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-orange-100"
              >
                <div className="mb-2 flex items-center gap-1.5">
                  <p className="font-semibold text-gray-900">{food.name}</p>
                  {food.preference && (
                    <span title={FOOD_PREFERENCE_META[food.preference].label}>
                      {FOOD_PREFERENCE_META[food.preference].icon}
                    </span>
                  )}
                </div>
                {food.firstEatenDate && (
                  <p className="mb-2 text-xs text-gray-500">
                    はじめて食べた日：{food.firstEatenDate}
                  </p>
                )}
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {food.category.length === 0 ? (
                    <span className="text-xs text-gray-400">
                      カテゴリ未設定
                    </span>
                  ) : (
                    food.category.map((category) => (
                      <span
                        key={category}
                        className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700"
                      >
                        {FOOD_CATEGORY_LABEL[category]}
                      </span>
                    ))
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(food)}
                    className="min-h-11 flex-1 rounded-xl border-2 border-gray-200 bg-white text-sm font-medium text-gray-700 transition active:scale-95"
                  >
                    編集
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      food.id !== undefined && handleDelete(food.id)
                    }
                    className="min-h-11 flex-1 rounded-xl border-2 border-red-200 bg-white text-sm font-medium text-red-600 transition active:scale-95"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingFood && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-bold text-gray-900">
              食材を編集
            </h2>

            <label
              htmlFor="edit-food-name"
              className="mb-1 block text-sm font-semibold text-gray-500"
            >
              食材名
            </label>
            <input
              id="edit-food-name"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="mb-4 min-h-11 w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-base text-gray-800 focus:border-orange-500 focus:outline-none"
            />

            <p className="mb-2 text-sm font-semibold text-gray-500">
              カテゴリ（複数選択可）
            </p>
            <div className="mb-6 flex flex-wrap gap-2">
              {FOOD_CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleEditCategory(category)}
                  aria-pressed={editCategories.includes(category)}
                  className={`min-h-11 min-w-11 rounded-full border-2 px-4 py-2 text-sm font-medium transition active:scale-95 ${
                    editCategories.includes(category)
                      ? "border-orange-500 bg-orange-500 text-white"
                      : "border-gray-200 bg-white text-gray-700"
                  }`}
                >
                  {FOOD_CATEGORY_LABEL[category]}
                </button>
              ))}
            </div>

            <label
              htmlFor="edit-food-first-eaten-date"
              className="mb-1 block text-sm font-semibold text-gray-500"
            >
              はじめて食べた日
            </label>
            <input
              id="edit-food-first-eaten-date"
              type="date"
              value={editFirstEatenDate}
              onChange={(e) => setEditFirstEatenDate(e.target.value)}
              className="mb-4 min-h-11 w-full max-w-[12rem] rounded-xl border-2 border-gray-200 px-4 py-2.5 text-base text-gray-800 focus:border-orange-500 focus:outline-none"
            />

            <p className="mb-2 text-sm font-semibold text-gray-500">好み</p>
            <div className="mb-6 flex flex-wrap gap-2">
              {FOOD_PREFERENCES.map((preference) => (
                <button
                  key={preference}
                  type="button"
                  onClick={() => togglePreference(preference)}
                  aria-pressed={editPreference === preference}
                  className={`min-h-11 min-w-11 inline-flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-medium transition active:scale-95 ${
                    editPreference === preference
                      ? "border-orange-500 bg-orange-500 text-white"
                      : "border-gray-200 bg-white text-gray-700"
                  }`}
                >
                  <span>{FOOD_PREFERENCE_META[preference].icon}</span>
                  <span>{FOOD_PREFERENCE_META[preference].label}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeEdit}
                className="min-h-11 flex-1 rounded-xl border-2 border-gray-200 bg-white text-base font-medium text-gray-700 transition active:scale-95"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="min-h-11 flex-1 rounded-xl bg-orange-500 text-base font-semibold text-white shadow-sm transition active:scale-95 active:bg-orange-600"
              >
                保存する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FoodListScreen;
