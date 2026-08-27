export interface Food {
  id?: number;
  name: string;
  isFavorite: boolean;
  category: FoodCategory[];
  createdAt: string;
}

export type FoodCategory =
  | "carbohydrate"
  | "vegetable"
  | "fruit"
  | "meat"
  | "fish"
  | "bean"
  | "dairy_egg"
  | "seasoning"
  | "beverage"
  | "other";

export interface MealRecord {
  id?: number;
  recordedAt: string;
  recordedBy: Recorder;
  items: MealRecordItem[];
}

export interface MealRecordItem {
  foodId: number;
  foodName: string;
  level: CompletionLevel;
}

export type CompletionLevel = "full" | "half" | "none";
export type Recorder = "father" | "mother";
