import type {
  FoodCategory,
  MealTiming,
  ManagementType,
  Recorder,
  StockLevel,
} from "./types";

export const RECORDER_LABEL: Record<Recorder, string> = {
  father: "父",
  mother: "母",
};

export const MEAL_TIMING_LABEL: Record<MealTiming, string> = {
  breakfast: "朝食",
  lunch: "昼食",
  dinner: "夕食",
  snack: "間食",
};

export const MEAL_TIMINGS: MealTiming[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
];

export const FOOD_CATEGORY_LABEL: Record<FoodCategory, string> = {
  carbohydrate: "炭水化物",
  vegetable: "野菜",
  fruit: "くだもの",
  meat: "肉",
  fish: "魚",
  bean: "豆・加工品",
  dairy_egg: "卵・乳製品",
  seasoning: "調味料",
  beverage: "飲料",
  other: "その他",
};

export const FOOD_CATEGORIES: FoodCategory[] = [
  "carbohydrate",
  "vegetable",
  "fruit",
  "meat",
  "fish",
  "bean",
  "dairy_egg",
  "seasoning",
  "beverage",
  "other",
];

export const MANAGEMENT_TYPE_LABEL: Record<ManagementType, string> = {
  quantity: "数量管理",
  level: "段階管理",
};

export const STOCK_LEVEL_LABEL: Record<StockLevel, string> = {
  plenty: "多い",
  low: "少ない",
  none: "なし",
};
