import { useEffect, useMemo, useState } from "react";
import { db } from "../db";
import type { Food, FoodCategory, Inventory, ManagementType, StockLevel } from "../types";
import { FOOD_CATEGORIES, FOOD_CATEGORY_LABEL, MANAGEMENT_TYPE_LABEL, STOCK_LEVEL_LABEL } from "../labels";

interface FoodRow {
  food: Food;
  inventory?: Inventory;
}

function isLowOrNone(row: FoodRow): boolean {
  const { food, inventory } = row;
  if (!inventory) return false;
  if (food.managementType === "level") {
    return inventory.level === "low" || inventory.level === "none";
  }
  return (inventory.quantityValue ?? 0) <= 1;
}

function quantityLabel(inventory: Inventory | undefined): string {
  if (!inventory || inventory.quantityValue === undefined) return "未登録";
  return `${inventory.quantityValue}${inventory.quantityUnit ?? ""}`;
}

function levelLabel(inventory: Inventory | undefined): string {
  if (!inventory || inventory.level === undefined) return "未登録";
  return STOCK_LEVEL_LABEL[inventory.level];
}

function InventoryListScreen() {
  const [foods, setFoods] = useState<Food[]>([]);
  const [inventoryByFoodId, setInventoryByFoodId] = useState<Map<number, Inventory>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [isAddingFood, setIsAddingFood] = useState(false);

  async function loadData() {
    const [allFoods, allInventory] = await Promise.all([
      db.foods.orderBy("name").toArray(),
      db.inventory.toArray(),
    ]);
    setFoods(allFoods);
    setInventoryByFoodId(new Map(allInventory.map((inv) => [inv.foodId, inv])));
    setIsLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadData();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rowsByCategory = useMemo(() => {
    const map = new Map<FoodCategory, FoodRow[]>();
    for (const category of FOOD_CATEGORIES) map.set(category, []);
    for (const food of foods) {
      const row: FoodRow = { food, inventory: inventoryByFoodId.get(food.id!) };
      for (const category of food.category) {
        map.get(category)?.push(row);
      }
    }
    return map;
  }, [foods, inventoryByFoodId]);

  async function handleSaveEdit(next: { quantityValue?: number; quantityUnit?: string; level?: StockLevel }) {
    if (!editingFood) return;
    const now = new Date().toISOString();
    const existing = await db.inventory.where("foodId").equals(editingFood.id!).first();
    if (existing?.id !== undefined) {
      await db.inventory.update(existing.id, { ...next, updatedAt: now });
    } else {
      await db.inventory.add({ foodId: editingFood.id!, updatedAt: now, ...next });
    }
    await loadData();
    setEditingFood(null);
  }

  async function handleAddFood(input: { name: string; category: FoodCategory[]; managementType: ManagementType }) {
    const trimmed = input.name.trim();
    if (!trimmed || input.category.length === 0) return;
    await db.foods.add({
      name: trimmed,
      category: input.category,
      managementType: input.managementType,
      createdAt: new Date().toISOString(),
    });
    await loadData();
    setIsAddingFood(false);
  }

  return (
    <div className="px-4 py-6 sm:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-orange-900 sm:text-3xl">在庫一覧</h1>
            <p className="text-sm text-orange-700 sm:text-base">
              「なし」「少ない」の食材は買い足し・献立の判断材料です
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddingFood(true)}
            className="min-h-11 shrink-0 rounded-xl bg-orange-500 px-5 text-base font-semibold text-white shadow-sm transition active:scale-95 active:bg-orange-600"
          >
            ＋ 新規食材を追加
          </button>
        </header>

        {isLoading ? (
          <p className="text-sm text-gray-400">読み込み中...</p>
        ) : (
          <div className="space-y-6">
            {FOOD_CATEGORIES.map((category) => {
              const rows = rowsByCategory.get(category) ?? [];
              if (rows.length === 0) return null;
              return (
                <section key={category} className="space-y-2">
                  <h2 className="text-sm font-semibold text-gray-500">
                    {FOOD_CATEGORY_LABEL[category]}
                  </h2>
                  <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-orange-100">
                    {rows.map((row, index) => (
                      <button
                        key={row.food.id}
                        type="button"
                        onClick={() => setEditingFood(row.food)}
                        className={`flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left transition active:scale-[0.99] ${
                          index > 0 ? "border-t border-orange-50" : ""
                        } ${isLowOrNone(row) ? "bg-amber-50" : "bg-white"}`}
                      >
                        <span className="font-medium text-gray-800">{row.food.name}</span>
                        <span
                          className={`text-sm font-semibold ${
                            isLowOrNone(row) ? "text-amber-700" : "text-gray-500"
                          }`}
                        >
                          {row.food.managementType === "quantity"
                            ? quantityLabel(row.inventory)
                            : levelLabel(row.inventory)}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {editingFood && (
        <InventoryEditModal
          food={editingFood}
          inventory={inventoryByFoodId.get(editingFood.id!)}
          onCancel={() => setEditingFood(null)}
          onSave={handleSaveEdit}
        />
      )}

      {isAddingFood && (
        <AddFoodModal onCancel={() => setIsAddingFood(false)} onSave={handleAddFood} />
      )}
    </div>
  );
}

interface InventoryEditModalProps {
  food: Food;
  inventory?: Inventory;
  onCancel: () => void;
  onSave: (next: { quantityValue?: number; quantityUnit?: string; level?: StockLevel }) => void;
}

function InventoryEditModal({ food, inventory, onCancel, onSave }: InventoryEditModalProps) {
  const [quantityValue, setQuantityValue] = useState(inventory?.quantityValue?.toString() ?? "");
  const [quantityUnit, setQuantityUnit] = useState(inventory?.quantityUnit ?? "");
  const [level, setLevel] = useState<StockLevel>(inventory?.level ?? "none");

  function handleSubmit() {
    if (food.managementType === "quantity") {
      const parsed = Number(quantityValue);
      onSave({
        quantityValue: Number.isFinite(parsed) ? parsed : 0,
        quantityUnit: quantityUnit.trim() || undefined,
      });
    } else {
      onSave({ level });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="mb-1 text-lg font-bold text-gray-900">{food.name}の在庫を編集</h2>
        <p className="mb-4 text-sm text-gray-500">{MANAGEMENT_TYPE_LABEL[food.managementType]}</p>

        {food.managementType === "quantity" ? (
          <div className="mb-6 flex gap-2">
            <input
              type="number"
              value={quantityValue}
              onChange={(e) => setQuantityValue(e.target.value)}
              placeholder="個数"
              className="min-h-11 w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-base text-gray-800 focus:border-orange-500 focus:outline-none"
            />
            <input
              type="text"
              value={quantityUnit}
              onChange={(e) => setQuantityUnit(e.target.value)}
              placeholder="単位（本・個等）"
              className="min-h-11 w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-base text-gray-800 focus:border-orange-500 focus:outline-none"
            />
          </div>
        ) : (
          <div className="mb-6 flex gap-2">
            {(["plenty", "low", "none"] as StockLevel[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLevel(l)}
                aria-pressed={level === l}
                className={`min-h-11 flex-1 rounded-xl border-2 text-sm font-medium transition active:scale-95 ${
                  level === l
                    ? "border-orange-500 bg-orange-500 text-white"
                    : "border-gray-200 bg-white text-gray-700"
                }`}
              >
                {STOCK_LEVEL_LABEL[l]}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 flex-1 rounded-xl border-2 border-gray-200 bg-white text-base font-medium text-gray-700 transition active:scale-95"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="min-h-11 flex-1 rounded-xl bg-orange-500 text-base font-semibold text-white shadow-sm transition active:scale-95 active:bg-orange-600"
          >
            保存する
          </button>
        </div>
      </div>
    </div>
  );
}

interface AddFoodModalProps {
  onCancel: () => void;
  onSave: (input: { name: string; category: FoodCategory[]; managementType: ManagementType }) => void;
}

function AddFoodModal({ onCancel, onSave }: AddFoodModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<FoodCategory[]>([]);
  const [managementType, setManagementType] = useState<ManagementType>("quantity");
  const [error, setError] = useState<string | null>(null);

  function toggleCategory(c: FoodCategory) {
    setCategory((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function handleSubmit() {
    if (!name.trim()) {
      setError("食材名を入力してください");
      return;
    }
    if (category.length === 0) {
      setError("カテゴリを1つ以上選択してください");
      return;
    }
    setError(null);
    onSave({ name, category, managementType });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-lg font-bold text-gray-900">新規食材を追加</h2>

        <label htmlFor="new-food-name" className="mb-1 block text-sm font-semibold text-gray-500">
          食材名
        </label>
        <input
          id="new-food-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例：ピーマン"
          className="mb-4 min-h-11 w-full rounded-xl border-2 border-gray-200 px-4 py-2.5 text-base text-gray-800 focus:border-orange-500 focus:outline-none"
        />

        <p className="mb-1 text-sm font-semibold text-gray-500">カテゴリ（複数選択可）</p>
        <div className="mb-4 flex flex-wrap gap-2">
          {FOOD_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleCategory(c)}
              aria-pressed={category.includes(c)}
              className={`min-h-11 rounded-xl border-2 px-3 text-sm font-medium transition active:scale-95 ${
                category.includes(c)
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-gray-200 bg-white text-gray-700"
              }`}
            >
              {FOOD_CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>

        <p className="mb-1 text-sm font-semibold text-gray-500">管理方式</p>
        <div className="mb-6 flex gap-2">
          {(["quantity", "level"] as ManagementType[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setManagementType(m)}
              aria-pressed={managementType === m}
              className={`min-h-11 flex-1 rounded-xl border-2 text-sm font-medium transition active:scale-95 ${
                managementType === m
                  ? "border-orange-500 bg-orange-500 text-white"
                  : "border-gray-200 bg-white text-gray-700"
              }`}
            >
              {MANAGEMENT_TYPE_LABEL[m]}
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 flex-1 rounded-xl border-2 border-gray-200 bg-white text-base font-medium text-gray-700 transition active:scale-95"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="min-h-11 flex-1 rounded-xl bg-orange-500 text-base font-semibold text-white shadow-sm transition active:scale-95 active:bg-orange-600"
          >
            追加する
          </button>
        </div>
      </div>
    </div>
  );
}

export default InventoryListScreen;
