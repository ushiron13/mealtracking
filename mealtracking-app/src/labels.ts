import type { CompletionLevel, FoodCategory, FoodPreference, Recorder } from "./types";

export const RECORDER_LABEL: Record<Recorder, string> = {
  father: "父",
  mother: "母",
};

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

export const COMPLETION_LEVEL_META: Record<
  CompletionLevel,
  { icon: string; label: string }
> = {
  full: { icon: "😋", label: "完食" },
  half: { icon: "🙂", label: "一部" },
  none: { icon: "😐", label: "未食" },
};

export const FOOD_PREFERENCE_META: Record<
  FoodPreference,
  { icon: string; label: string }
> = {
  like: { icon: "😊", label: "好き" },
  neutral: { icon: "😐", label: "普通" },
  dislike: { icon: "😖", label: "嫌い" },
  allergy: { icon: "⚠️", label: "アレルギー" },
};

export const FOOD_PREFERENCES: FoodPreference[] = [
  "like",
  "neutral",
  "dislike",
  "allergy",
];
