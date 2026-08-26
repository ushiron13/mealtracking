import { createContext, useContext } from "react";
import type { Recorder } from "./types";

export interface RecorderContextValue {
  recorder: Recorder;
  setRecorder: (recorder: Recorder) => void;
}

export const RecorderContext = createContext<RecorderContextValue | null>(
  null,
);

export function useRecorder(): RecorderContextValue {
  const context = useContext(RecorderContext);
  if (!context) {
    throw new Error("useRecorder must be used within RecorderContext.Provider");
  }
  return context;
}
