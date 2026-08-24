export interface Food {
  id?: number;
  name: string;
  isFavorite: boolean;
  createdAt: string;
}

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
