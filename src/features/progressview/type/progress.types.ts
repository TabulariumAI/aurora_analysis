import type { ReactNode } from "react";

export type ProgressPhase = "started" | "completed" | "failed";

export type ProgressEvent = {
  jobId: string;
  message: string;
  phase: ProgressPhase;
  error?: string;
};

export type ProgressJob = Pick<ProgressEvent, "jobId" | "message" | "phase" | "error">;

export type ProgressViewProps = {
  completion?: ReactNode;
  completionJobId?: string;
  fillCompletion: boolean;
  intro: string;
  jobs: readonly ProgressJob[];
  process: string;
};
