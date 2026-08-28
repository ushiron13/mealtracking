export interface Food {
  id?: number;
  name: string;
  isFavorite: boolean;
  category: FoodCategory[];
  firstEatenDate?: string;
  preference?: FoodPreference;
  isTried: boolean;
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

export type FoodPreference = "like" | "neutral" | "dislike" | "allergy";

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

export interface SymptomRecord {
  id?: number;
  mealRecordId: number;
  foodName?: string;
  symptom: string;
  severity: SymptomSeverity;
  observedAt: string;
  createdAt: string;
}

export type SymptomSeverity = "mild" | "moderate" | "severe";
