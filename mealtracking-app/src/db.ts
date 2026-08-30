import Dexie, { type Table } from "dexie";
import type {
  EventSource,
  Food,
  Inventory,
  InventoryEvent,
  ManagementType,
  MealTiming,
  MenuLog,
  MenuPlan,
  StockLevel,
} from "./types";
import { toDateKey } from "./format";

export class MealTrackingDB extends Dexie {
  menuPlans!: Table<MenuPlan, number>;
  menuLogs!: Table<MenuLog, number>;
  foods!: Table<Food, number>;
  inventory!: Table<Inventory, number>;
  inventoryEvents!: Table<InventoryEvent, number>;

  constructor() {
    super("MealTrackingDB");
    this.version(1).stores({
      foods: "++id, name, isFavorite",
      records: "++id, recordedAt, recordedBy",
    });
    this.version(2)
      .stores({
        foods: "++id, name, isFavorite, *category",
        records: "++id, recordedAt, recordedBy",
      })
      .upgrade((tx) => {
        return tx
          .table("foods")
          .toCollection()
          .modify((food) => {
            if (!food.category) food.category = [];
          });
      });
    this.version(3)
      .stores({
        foods: "++id, name, isFavorite, *category, isTried",
        records: "++id, recordedAt, recordedBy",
        symptomRecords: "++id, mealRecordId, observedAt, severity",
      })
      .upgrade(async (tx) => {
        await tx
          .table("foods")
          .toCollection()
          .modify((food) => {
            if (food.isTried === undefined) food.isTried = false;
          });

        // 初期化用マイグレーション：既存recordsを一度だけスキャンし、
        // 記録済みの食材のisTriedをtrueに設定する（M3導入時点で「はじめて」表示にならないようにするため）
        const triedFoodIds = new Set<number>();
        await tx
          .table("records")
          .toCollection()
          .each((record) => {
            for (const item of record.items) {
              triedFoodIds.add(item.foodId);
            }
          });
        if (triedFoodIds.size > 0) {
          await tx
            .table("foods")
            .where("id")
            .anyOf(Array.from(triedFoodIds))
            .modify({ isTried: true });
        }
      });
    this.version(4).stores({
      foods: "++id, name, isFavorite, *category, isTried",
      records: "++id, recordedAt, recordedBy",
      symptomRecords: "++id, mealRecordId, observedAt, severity",
      menuPlans: "++id, date, mealTiming",
      menuLogs: "++id, date, mealTiming",
    });
    this.version(5).stores({
      foods: "++id, name, isFavorite, *category, isTried",
      records: "++id, recordedAt, recordedBy",
      symptomRecords: "++id, mealRecordId, observedAt, severity",
      menuPlans: "++id, date, mealTiming",
      menuLogs: "++id, date, mealTiming",
    });
    // v6: 離乳食トラッキング機能の廃止（在庫管理・献立提案へのスコープ移行）に伴い、
    // foods/records/symptomRecordsを削除。menuPlans/menuLogsは継続。
    this.version(6).stores({
      foods: null,
      records: null,
      symptomRecords: null,
      menuPlans: "++id, date, mealTiming",
      menuLogs: "++id, date, mealTiming",
    });
    // v7: 食材在庫管理・大人用献立提案（新スコープ）に伴い、foodsを在庫管理用に作り直し、
    // inventory/inventoryEventsを新設。menuPlans/menuLogsは変更なし（既存データを維持）。
    this.version(7).stores({
      foods: "++id, name, *category, managementType",
      inventory: "++id, foodId",
      inventoryEvents: "++id, foodId, eventType, createdAt",
      menuPlans: "++id, date, mealTiming",
      menuLogs: "++id, date, mealTiming",
    });
  }
}

export const db = new MealTrackingDB();

const INITIAL_FOODS: Array<Pick<Food, "name" | "category" | "managementType">> = [
  { name: "にんじん", category: ["vegetable"], managementType: "quantity" },
  { name: "じゃがいも", category: ["vegetable"], managementType: "quantity" },
  { name: "たまねぎ", category: ["vegetable"], managementType: "quantity" },
  { name: "キャベツ", category: ["vegetable"], managementType: "quantity" },
  { name: "ほうれん草", category: ["vegetable"], managementType: "quantity" },
  { name: "ブロッコリー", category: ["vegetable"], managementType: "quantity" },
  { name: "だいこん", category: ["vegetable"], managementType: "quantity" },
  { name: "トマト", category: ["vegetable"], managementType: "quantity" },
  { name: "りんご", category: ["fruit"], managementType: "quantity" },
  { name: "バナナ", category: ["fruit"], managementType: "quantity" },
  { name: "みかん", category: ["fruit"], managementType: "quantity" },
  { name: "米", category: ["carbohydrate"], managementType: "level" },
  { name: "食パン", category: ["carbohydrate"], managementType: "level" },
  { name: "うどん", category: ["carbohydrate"], managementType: "level" },
  { name: "鶏肉", category: ["meat"], managementType: "level" },
  { name: "豚肉", category: ["meat"], managementType: "level" },
  { name: "牛肉", category: ["meat"], managementType: "level" },
  { name: "鮭", category: ["fish"], managementType: "level" },
  { name: "さば", category: ["fish"], managementType: "level" },
  { name: "豆腐", category: ["bean"], managementType: "level" },
  { name: "納豆", category: ["bean"], managementType: "level" },
  { name: "卵", category: ["dairy_egg"], managementType: "level" },
  { name: "牛乳", category: ["dairy_egg"], managementType: "level" },
  { name: "ヨーグルト", category: ["dairy_egg"], managementType: "level" },
  { name: "チーズ", category: ["dairy_egg"], managementType: "level" },
  { name: "醤油", category: ["seasoning"], managementType: "level" },
  { name: "みそ", category: ["seasoning"], managementType: "level" },
  { name: "塩", category: ["seasoning"], managementType: "level" },
  { name: "お茶", category: ["beverage"], managementType: "level" },
  { name: "だし", category: ["other"], managementType: "level" },
];

/**
 * 初回起動時、foodsテーブルが空であれば初期食材マスタをシードする。
 * トランザクション内で件数確認と追加を行い、React StrictMode等による
 * 同時呼び出しで二重シードされないようにする。
 */
export async function seedInitialFoodsIfEmpty(): Promise<void> {
  await db.transaction("rw", db.foods, async () => {
    const count = await db.foods.count();
    if (count > 0) return;

    const now = new Date().toISOString();
    await db.foods.bulkAdd(
      INITIAL_FOODS.map((food) => ({ ...food, createdAt: now })),
    );
  });
}

/**
 * UC1（食材在庫の新規登録）：既存在庫があれば加算する（数量管理）、または段階を直接設定する（段階管理）。
 * unitは数量管理の食材で初回登録時に単位（本・g等）を設定する場合に指定する。
 * sourceはぴよログ連携（UC6）から呼ぶ場合は"piyolog_import"を渡す想定（既定は"manual"）。
 */
export async function addInventory(
  foodId: number,
  managementType: ManagementType,
  value: number | StockLevel,
  unit?: string,
  source: EventSource = "manual",
): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction("rw", db.inventory, db.inventoryEvents, async () => {
    const existing = await db.inventory.where("foodId").equals(foodId).first();

    if (managementType === "quantity") {
      const addAmount = value as number;
      if (existing) {
        await db.inventory.update(existing.id!, {
          quantityValue: (existing.quantityValue ?? 0) + addAmount,
          quantityUnit: unit ?? existing.quantityUnit,
          updatedAt: now,
        });
      } else {
        await db.inventory.add({
          foodId,
          quantityValue: addAmount,
          quantityUnit: unit,
          updatedAt: now,
        });
      }
      await db.inventoryEvents.add({
        foodId,
        eventType: "add",
        quantityValue: addAmount,
        source,
        createdAt: now,
      });
    } else {
      const level = value as StockLevel;
      if (existing) {
        await db.inventory.update(existing.id!, { level, updatedAt: now });
      } else {
        await db.inventory.add({ foodId, level, updatedAt: now });
      }
      await db.inventoryEvents.add({ foodId, eventType: "add", source, createdAt: now });
    }
  });
}

/**
 * UC2（食材の消費記録）：数量管理は「使い切った」（0にする）のみ対応、
 * 段階管理は段階を一つ下げる（多い→少ない→なし、なしはそのまま）。
 * sourceはぴよログ連携（UC6）から呼ぶ場合は"piyolog_import"を渡す想定（既定は"manual"）。
 */
export async function consumeInventory(
  foodId: number,
  managementType: ManagementType,
  source: EventSource = "manual",
): Promise<void> {
  const now = new Date().toISOString();
  await db.transaction("rw", db.inventory, db.inventoryEvents, async () => {
    const existing = await db.inventory.where("foodId").equals(foodId).first();
    if (!existing) return;

    if (managementType === "quantity") {
      await db.inventory.update(existing.id!, { quantityValue: 0, updatedAt: now });
    } else {
      const nextLevel: Record<StockLevel, StockLevel> = {
        plenty: "low",
        low: "none",
        none: "none",
      };
      const current = existing.level ?? "none";
      await db.inventory.update(existing.id!, { level: nextLevel[current], updatedAt: now });
    }
    await db.inventoryEvents.add({ foodId, eventType: "consume", source, createdAt: now });
  });
}

/** 5-10時→朝食, 10-15時→昼食, 15-19時→夕食, それ以外→間食 */
export function inferMealTiming(date: Date): MealTiming {
  const hour = date.getHours();
  if (hour >= 5 && hour < 10) return "breakfast";
  if (hour >= 10 && hour < 15) return "lunch";
  if (hour >= 15 && hour < 19) return "dinner";
  return "snack";
}

export async function addMenuLogIfNamed(
  menuName: string,
  comment: string,
  recordedBy: MenuLog["recordedBy"],
  now: Date,
): Promise<void> {
  const trimmedMenuName = menuName.trim();
  if (!trimmedMenuName) return;

  const trimmedComment = comment.trim();
  await db.menuLogs.add({
    date: toDateKey(now),
    mealTiming: inferMealTiming(now),
    menuName: trimmedMenuName,
    comment: trimmedComment || undefined,
    recordedBy,
    createdAt: now.toISOString(),
  });
}

/**
 * MenuPlanは「予定・状態」なので上書き保存する（date+mealTimingにつき常に最新1件）。
 * 空欄で保存した場合は「予定なし」状態に戻すため、既存のPlanを削除する。
 */
export async function upsertMenuPlan(
  date: string,
  mealTiming: MealTiming,
  menuName: string,
): Promise<void> {
  const trimmed = menuName.trim();
  const existing = await db.menuPlans.where({ date, mealTiming }).first();

  if (!trimmed) {
    if (existing?.id !== undefined) {
      await db.menuPlans.delete(existing.id);
    }
    return;
  }

  const updatedAt = new Date().toISOString();
  if (existing?.id !== undefined) {
    await db.menuPlans.update(existing.id, { menuName: trimmed, updatedAt });
  } else {
    await db.menuPlans.add({ date, mealTiming, menuName: trimmed, updatedAt });
  }
}
