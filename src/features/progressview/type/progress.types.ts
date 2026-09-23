import type { ReactNode } from "react";

export type ProgressPhase = "started" | "completed" | "failed";

export type ProgressCount = {
  completed: number;
  total: number;
  unit?: "prepared-pages" | "pages" | "sessions" | "steps";
};

export type ProgressEvent = {
  jobId: string;
  message: string;
  phase: ProgressPhase;
  error?: string;
  progress?: ProgressCount | null;
};

export type ProgressJob = Pick<ProgressEvent, "jobId" | "message" | "phase" | "error" | "progress">;

export type ProgressViewProps = {
  completion?: ReactNode;
  completionJobId?: string;
  fillCompletion: boolean;
  intro: string;
  jobs: readonly ProgressJob[];
  process: string;
};
