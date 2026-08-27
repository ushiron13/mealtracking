import Dexie, { type Table } from "dexie";
import type { Food, MealRecord } from "./types";

const initialFoodNames = [
  "にんじん",
  "かぼちゃ",
  "豆腐",
  "しらす",
  "バナナ",
  "ほうれん草",
  "じゃがいも",
  "米（10倍粥）",
  "さつまいも",
  "りんご",
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
