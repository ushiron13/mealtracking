import Dexie, { type Table } from "dexie";
import type { Food, MealRecord } from "./types";

// 月齢別の離乳食解禁食材リストをベースにした仮リスト（大蒲さんの確認・取捨選択待ち）。
const initialFoodNames = [
  // ゴックン期（5〜6ヶ月ごろ）
  "米（10倍粥）",
  "にんじん",
  "かぼちゃ",
  "じゃがいも",
  "さつまいも",
  "ほうれん草",
  "大根",
  "豆腐",
  "しらす",
  "白身魚（鯛）",
  // モグモグ期（7〜8ヶ月ごろ）
  "バナナ",
  "りんご",
  "卵黄（固ゆで）",
  "鶏ささみ",
  "玉ねぎ",
  "キャベツ",
  "トマト",
  "納豆",
  "ヨーグルト（プレーン）",
  "きな粉",
  // カミカミ期（9〜11ヶ月ごろ）
  "鮭",
  "ツナ（水煮）",
  "ブロッコリー",
  "きゅうり（加熱）",
  "うどん",
  "食パン（耳なし）",
  "ひじき",
];

export class MealTrackingDB extends Dexie {
  foods!: Table<Food, number>;
  records!: Table<MealRecord, number>;

  constructor() {
    super("MealTrackingDB");
    this.version(1).stores({
      foods: "++id, name, isFavorite",
      records: "++id, recordedAt, recordedBy",
    });
  }
}

export const db = new MealTrackingDB();

export async function seedInitialFoods(): Promise<void> {
  const count = await db.foods.count();
  if (count > 0) return;

  const now = new Date().toISOString();
  await db.foods.bulkAdd(
    initialFoodNames.map((name) => ({
      name,
      isFavorite: true,
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
