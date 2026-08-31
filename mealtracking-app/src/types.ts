export type Recorder = "father" | "mother";

export interface MenuPlan {
  id?: number;
  date: string;
  mealTiming: MealTiming;
  menuName: string;
  updatedAt: string;
}

export interface MenuLog {
  id?: number;
  date: string;
  mealTiming: MealTiming;
  menuName: string;
  comment?: string;
  recordedBy: Recorder;
  createdAt: string;
}

export type MealTiming = "breakfast" | "lunch" | "dinner" | "snack";

export interface Food {
  id?: number;
  name: string;
  category: FoodCategory[];
  managementType: ManagementType;
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

export type ManagementType = "quantity" | "level";

export interface Inventory {
  id?: number;
  foodId: number;
  quantityValue?: number;
  quantityUnit?: string;
  level?: StockLevel;
  updatedAt: string;
}

export type StockLevel = "plenty" | "low" | "none";

export interface InventoryEvent {
  id?: number;
  foodId: number;
  eventType: "add" | "consume";
  quantityValue?: number;
  source: EventSource;
  createdAt: string;
}

export type EventSource = "manual" | "piyolog_import";
