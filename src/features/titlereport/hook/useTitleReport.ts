import { useCallback, useEffect, useMemo, useRef } from "react";
import { prepareTitleReport, toTitleReportError } from "../data/titleReportData";
import { useTitleReportStore } from "../store/titleReportStore";
import type {
  TitleReportFailure,
  TitleReportOperation,
  TitleReportPanelProps,
} from "../type/titleReport.types";
import { createTitleReportWorkerClient } from "../worker/titleReportWorkerClient";

const messages = [
  "Retrieving Indexes...",
  "Analyzing Indexing...",
  "Analyzing Indexing...",
  "Generating Report..",
  "Generating Report..",
  "Retrieving Report...",
  "Retrieving Report...",
] as const;

function toStageFailure(error: unknown, fallback: string): TitleReportFailure["error"] {
  const failure = toTitleReportError(error, fallback);
  return failure.error === fallback
    ? failure
    : { ...failure, error: `${fallback.slice(0, -1)}: ${failure.error}` };
}

export function useTitleReport({
  onError,
  onGenerated,
  request,
}: Pick<TitleReportPanelProps, "onError" | "onGenerated" | "request">) {
  const callbacks = useRef({ onError, onGenerated });
  const runId = useRef(0);
  callbacks.current = { onError, onGenerated };
  const client = useMemo(
    () => createTitleReportWorkerClient({ apiBaseUrl: request.apiGatewayUrl }),
    [request.apiGatewayUrl],
  );

  const run = useCallback(async (operation: TitleReportOperation) => {
    if (!useTitleReportStore.getState().begin(request, operation)) return;
    const currentRun = runId.current + 1;
    runId.current = currentRun;
    const active = () => runId.current === currentRun;
    try {
      let complete = operation === "load"
        ? await client.status(request.authToken, request.batch)
        : false;
      let requested = operation === "regenerate";

      if (!complete) {
        try {
          await client.aggregate(request.authToken, request.batch);
        } catch (error) {
          throw toStageFailure(error, "Aggregation failed.");
        }
        requested = true;

        for (let attempt = 0; attempt < 21 && !complete; attempt += 1) {
          if (!active()) return;
          useTitleReportStore.getState().setMessage(
            request,
            messages[Math.min(attempt + 1, messages.length - 1)],
          );
          await new Promise<void>((resolve) => {
            setTimeout(resolve, request.intervalMs);
          });
          if (!active()) return;
          complete = await client.status(request.authToken, request.batch);
        }
      }

      if (!complete) {
        throw {
          code: "REPORT_TIMEOUT",
          error: "Report generation timed out.",
        };
      }

      let data: unknown;
      try {
        data = await client.data(request.authToken, request.batch);
      } catch (error) {
        throw toStageFailure(error, "Failed to get chain set.");
      }
      if (!active()) return;
      useTitleReportStore.getState().setReady(request, prepareTitleReport(data, request.batch));
      if (requested) callbacks.current.onGenerated();
    } catch (error) {
      if (!active()) return;
      const failure: TitleReportFailure = {
        error: toTitleReportError(error, "An error occurred while processing the report."),
        operation,
      };
      useTitleReportStore.getState().setError(request, failure);
      callbacks.current.onError(failure);
    }
  }, [client, request]);

  useEffect(() => {
    void run("load");
    return () => {
      runId.current += 1;
    };
  }, [run]);

  return {
    regenerate: () => run("regenerate"),
  };
}
