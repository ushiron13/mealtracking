import Dexie, { type Table } from "dexie";
import type { MealTiming, MenuLog, MenuPlan } from "./types";
import { toDateKey } from "./format";

export class MealTrackingDB extends Dexie {
  menuPlans!: Table<MenuPlan, number>;
  menuLogs!: Table<MenuLog, number>;

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
  }
}

export const db = new MealTrackingDB();

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
