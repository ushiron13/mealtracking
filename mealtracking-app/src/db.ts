import Dexie, { type Table } from "dexie";
import type {
  Food,
  FoodCategory,
  MealRecord,
  MealTiming,
  MenuLog,
  MenuPlan,
  SymptomRecord,
} from "./types";
import { toDateKey } from "./format";

// 月齢別の離乳食解禁食材リストをベースにした仮リスト（大蒲さんの確認・取捨選択待ち）。
// カテゴリも仮割り当て（特にひじき＝海藻は専用カテゴリがないため「その他」とした）。
const initialFoods: { name: string; category: FoodCategory[] }[] = [
  // ゴックン期（5〜6ヶ月ごろ）
  { name: "米（10倍粥）", category: ["carbohydrate"] },
  { name: "にんじん", category: ["vegetable"] },
  { name: "かぼちゃ", category: ["vegetable"] },
  { name: "じゃがいも", category: ["vegetable"] },
  { name: "さつまいも", category: ["vegetable"] },
  { name: "ほうれん草", category: ["vegetable"] },
  { name: "大根", category: ["vegetable"] },
  { name: "豆腐", category: ["bean"] },
  { name: "しらす", category: ["fish"] },
  { name: "白身魚（鯛）", category: ["fish"] },
  // モグモグ期（7〜8ヶ月ごろ）
  { name: "バナナ", category: ["fruit"] },
  { name: "りんご", category: ["fruit"] },
  { name: "卵黄（固ゆで）", category: ["dairy_egg"] },
  { name: "鶏ささみ", category: ["meat"] },
  { name: "玉ねぎ", category: ["vegetable"] },
  { name: "キャベツ", category: ["vegetable"] },
  { name: "トマト", category: ["vegetable"] },
  { name: "納豆", category: ["bean"] },
  { name: "ヨーグルト（プレーン）", category: ["dairy_egg"] },
  { name: "きな粉", category: ["bean"] },
  // カミカミ期（9〜11ヶ月ごろ）
  { name: "鮭", category: ["fish"] },
  { name: "ツナ（水煮）", category: ["fish"] },
  { name: "ブロッコリー", category: ["vegetable"] },
  { name: "きゅうり（加熱）", category: ["vegetable"] },
  { name: "うどん", category: ["carbohydrate"] },
  { name: "食パン（耳なし）", category: ["carbohydrate"] },
  { name: "ひじき", category: ["other"] },
];

export class MealTrackingDB extends Dexie {
  foods!: Table<Food, number>;
  records!: Table<MealRecord, number>;
  symptomRecords!: Table<SymptomRecord, number>;
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
          .each((record: MealRecord) => {
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
    this.version(5)
      .stores({
        foods: "++id, name, isFavorite, *category, isTried",
        records: "++id, recordedAt, recordedBy",
        symptomRecords: "++id, mealRecordId, observedAt, severity",
        menuPlans: "++id, date, mealTiming",
        menuLogs: "++id, date, mealTiming",
      })
      .upgrade(async (tx) => {
        // カテゴリ導入（version 2）前に登録された食材はcategory: []のまま残っており、
        // カテゴリ絞り込みで常に非表示になっていた。初期食材リストと同名なら正しいカテゴリを補完する
        const categoryByName = new Map(
          initialFoods.map((food) => [food.name, food.category]),
        );
        await tx
          .table("foods")
          .toCollection()
          .modify((food: Food) => {
            const category = categoryByName.get(food.name);
            if (category && food.category.length === 0) {
              food.category = category;
            }
          });

        // 初期食材リストが27種類に拡充された後も、すでにfoodsが空でなかった既存ユーザーには
        // seedInitialFoods（空のときのみ実行）が反映されなかったため、未登録分をここで補う
        const existingFoods: Food[] = await tx.table("foods").toCollection().toArray();
        const existingNames = new Set(existingFoods.map((food) => food.name));
        const missingFoods = initialFoods.filter(
          (food) => !existingNames.has(food.name),
        );
        if (missingFoods.length > 0) {
          const now = new Date().toISOString();
          await tx.table("foods").bulkAdd(
            missingFoods.map(({ name, category }) => ({
              name,
              isFavorite: true,
              category,
              isTried: false,
              createdAt: now,
            })),
          );
        }
      });
  }
}

export const db = new MealTrackingDB();

export async function seedInitialFoods(): Promise<void> {
  const count = await db.foods.count();
  if (count > 0) return;

  const now = new Date().toISOString();
  await db.foods.bulkAdd(
    initialFoods.map(({ name, category }) => ({
      name,
      isFavorite: true,
      category,
      isTried: false,
      createdAt: now,
    })),
  );
}

export async function updateRecord(
  id: number,
  changes: Partial<Omit<MealRecord, "id">>,
): Promise<void> {
  await db.records.update(id, changes);
}

export async function deleteRecord(id: number): Promise<void> {
  await db.records.delete(id);
}

export async function updateFood(
  id: number,
  changes: Partial<Omit<Food, "id">>,
): Promise<void> {
  await db.foods.update(id, changes);
}

export async function deleteFood(id: number): Promise<void> {
  await db.foods.delete(id);
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
