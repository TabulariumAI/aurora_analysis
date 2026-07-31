import { useCallback, useEffect, useMemo, useRef } from "react";
import { prepareAnalysis, toAnalysisError } from "../data/analysisData";
import { useAnalysisStore } from "../store/analysisStore";
import type {
  AnalysisFailure,
  AnalysisOperation,
  AnalysisPanelProps,
} from "../type/analysis.types";
import { createAnalysisWorkerClient } from "../worker/analysisWorkerClient";

const messages = [
  "Retriving Indexes...",
  "Analyzing Indexing...",
  "Analyzing Indexing...",
  "Generating Report..",
  "Generating Report..",
  "Retrieving Report...",
  "Retrieving Report...",
] as const;

export function useAnalysis({
  onError,
  onGenerated,
  request,
}: Pick<AnalysisPanelProps, "onError" | "onGenerated" | "request">) {
  const callbacks = useRef({ onError, onGenerated });
  const runId = useRef(0);
  callbacks.current = { onError, onGenerated };
  const client = useMemo(
    () => createAnalysisWorkerClient({ apiBaseUrl: request.apiGatewayUrl }),
    [request.apiGatewayUrl],
  );

  const run = useCallback(async (operation: AnalysisOperation) => {
    if (!useAnalysisStore.getState().begin(request, operation)) return;
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
          const failure = toAnalysisError(error, "Aggregation failed.");
          throw { ...failure, error: `Aggregation failed: ${failure.error}` };
        }
        requested = true;

        for (let attempt = 0; attempt < 21 && !complete; attempt += 1) {
          if (!active()) return;
          useAnalysisStore.getState().setMessage(
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
        const failure = toAnalysisError(error, "Failed to get chain set.");
        throw { ...failure, error: `Failed to get chain set: ${failure.error}` };
      }
      if (!active()) return;
      useAnalysisStore.getState().setReady(request, prepareAnalysis(data, request.batch));
      if (requested) callbacks.current.onGenerated();
    } catch (error) {
      if (!active()) return;
      const failure: AnalysisFailure = {
        error: toAnalysisError(error, "An error occurred while processing the report."),
        operation,
      };
      useAnalysisStore.getState().setError(request, failure);
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
