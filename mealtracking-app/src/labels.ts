import type { MealTiming, Recorder } from "./types";

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
