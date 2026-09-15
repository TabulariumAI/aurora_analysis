import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ProgressEvent } from "../../progressview/type/progress.types";
import { prepareTitleReport, submitSession, toTitleReportError } from "../data/titleReportData";
import { useTitleReportStore } from "../store/titleReportStore";
import type {
  TitleReportFailure,
  TitleReportPanelProps,
} from "../type/titleReport.types";
import { createTitleReportWorkerClient } from "../worker/titleReportWorkerClient";

const messages = [
  "Retrieving Indexes...",
  "Analyzing Indexing...",
  "Analyzing Indexing...",
  "Generating Report...",
  "Generating Report...",
  "Retrieving Report...",
  "Retrieving Report...",
] as const;

type TitleReportProgressCallbacks = {
  onProgress(event: ProgressEvent): void;
  resetProgress(): void;
};

function toStageFailure(error: unknown, fallback: string): TitleReportFailure["error"] {
  const failure = toTitleReportError(error, fallback);
  return failure.error === fallback
    ? failure
    : { ...failure, error: `${fallback.slice(0, -1)}: ${failure.error}` };
}

export function useTitleReport({
  onError,
  onGenerated,
  onProgress,
  request,
  resetProgress,
}: Pick<TitleReportPanelProps, "onError" | "onGenerated" | "request"> & TitleReportProgressCallbacks) {
  const callbacks = useRef({ onError, onGenerated });
  const runId = useRef(0);
  callbacks.current = { onError, onGenerated };
  const client = useMemo(
    () => createTitleReportWorkerClient({ apiBaseUrl: request.apiGatewayUrl }),
    [request.apiGatewayUrl],
  );

  const run = useCallback(async () => {
    if (!useTitleReportStore.getState().begin(request)) return;
    const { regenerate } = useTitleReportStore.getState();
    resetProgress();
    const currentRun = runId.current + 1;
    runId.current = currentRun;
    const active = () => runId.current === currentRun && useTitleReportStore.getState().request === request;
    let progressId = "status-0";
    let message: string = messages[0];
    try {
      const submit = !regenerate && request.sessions !== undefined && !useTitleReportStore.getState().submitted;
      if (submit) {
        progressId = "link";
        for (const [index, session] of request.sessions!.entries()) {
          message = `Linking session ${index + 1} of ${request.sessions!.length}...`;
          onProgress({ jobId: `${request.batch}-${progressId}`, message, phase: "started" });
          await submitSession(client, request.authToken, request.batch, session);
          if (!active()) return;
        }
        progressId = "generate";
        message = "Starting report generation...";
        onProgress({ jobId: `${request.batch}-${progressId}`, message, phase: "started" });
        await client.generate(request.authToken, request.batch);
        if (!active()) return;
        useTitleReportStore.getState().setSubmitted(request);
      }

      progressId = "status-0";
      message = messages[0];
      onProgress({ jobId: `${request.batch}-${progressId}`, message, phase: "started" });
      let complete = false;
      if (regenerate) {
        try {
          await client.aggregate(request.authToken, request.batch);
        } catch (error) {
          throw toStageFailure(error, "Aggregation failed.");
        }
      } else {
        complete = await client.status(request.authToken, request.batch);
      }
      if (!active()) return;
      const generated = submit || regenerate || !complete;

      if (!complete) {
        for (let attempt = 0; attempt < 21 && !complete; attempt += 1) {
          if (!active()) return;
          await new Promise<void>((resolve) => {
            setTimeout(resolve, request.intervalMs);
          });
          if (!active()) return;
          progressId = `status-${attempt + 1}`;
          message = messages[Math.min(attempt + 1, messages.length - 1)];
          onProgress({ jobId: `${request.batch}-${progressId}`, message, phase: "started" });
          complete = await client.status(request.authToken, request.batch);
          if (!active()) return;
        }
      }

      if (!complete) {
        throw {
          code: "REPORT_TIMEOUT",
          error: "Report generation timed out.",
        };
      }

      progressId = "data";
      message = "Retrieving Report...";
      onProgress({ jobId: `${request.batch}-${progressId}`, message, phase: "started" });
      let data: unknown;
      try {
        data = await client.data(request.authToken, request.batch);
      } catch (error) {
        throw toStageFailure(error, "Failed to get chain set.");
      }
      if (!active()) return;
      useTitleReportStore.getState().setReady(request, prepareTitleReport(data, request.batch));
      if (generated) {
        callbacks.current.onGenerated();
      }
    } catch (error) {
      if (!active()) return;
      const failure: TitleReportFailure = {
        error: toTitleReportError(error, "An error occurred while processing the report."),
        operation: "load",
      };
      useTitleReportStore.getState().setError(request, failure);
      onProgress({ error: failure.error.error, jobId: `${request.batch}-${progressId}`, message, phase: "failed" });
      callbacks.current.onError?.(failure);
    }
  }, [client, onProgress, request, resetProgress]);

  useEffect(() => {
    void run();
    return () => {
      runId.current += 1;
    };
  }, [run]);
}
