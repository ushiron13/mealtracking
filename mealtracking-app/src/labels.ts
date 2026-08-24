import type { CompletionLevel, Recorder } from "./types";

export const RECORDER_LABEL: Record<Recorder, string> = {
  father: "父",
  mother: "母",
};

export const COMPLETION_LEVEL_META: Record<
  CompletionLevel,
  { icon: string; label: string }
> = {
  full: { icon: "😋", label: "完食" },
  half: { icon: "🙂", label: "一部" },
  none: { icon: "😐", label: "未食" },
};
