import { useCallback, useMemo, useRef, useState } from "react";
import type { ProgressEvent, ProgressJob } from "../type/progress.types";

type ProgressState = {
  jobs: readonly ProgressJob[];
  receive(event: ProgressEvent): void;
  reset(): void;
};

export function useProgress(requestId: string): ProgressState {
  const activeId = useRef(requestId);
  activeId.current = requestId;
  const [state, setState] = useState({ jobs: [] as readonly ProgressJob[], requestId });
  const jobs = state.requestId === requestId ? state.jobs : [];

  const receive = useCallback((event: ProgressEvent) => {
    if (activeId.current !== requestId) return;
    setState((current) => {
      const jobs = current.requestId === requestId ? current.jobs : [];
      const jobIndex = jobs.findIndex((job) => job.jobId === event.jobId);
      const next = jobIndex < 0 && event.phase === "started"
        ? jobs.map<ProgressJob>((job) => job.phase === "started" ? { ...job, phase: "completed" } : job)
        : [...jobs];
      if (jobIndex < 0) {
        if (event.phase === "started") next.push(event);
      } else {
        next[jobIndex] = { ...jobs[jobIndex], ...event };
      }
      return { jobs: next, requestId };
    });
  }, [requestId]);

  const reset = useCallback(() => {
    setState({ jobs: [], requestId });
  }, [requestId]);

  return useMemo(() => ({ jobs, receive, reset }), [jobs, receive, reset]);
}
