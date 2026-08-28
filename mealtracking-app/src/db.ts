import Dexie, { type Table } from "dexie";
import type { Food, FoodCategory, MealRecord, SymptomRecord } from "./types";

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
