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
