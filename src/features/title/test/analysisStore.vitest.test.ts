import { afterEach, describe, expect, it } from "vitest";
import { useAnalysisStore } from "../store/analysisStore";
import type { AnalysisRequest } from "../type/analysis.types";

const request: AnalysisRequest = {
  authToken: "token-1",
  batch: "Batch A",
  apiGatewayUrl: "https://user.example",
  intervalMs: 10,
};

afterEach(() => {
  useAnalysisStore.getState().reset();
});

describe("analysis store", () => {
  it("owns one report request through loading, completion, and reset", () => {
    useAnalysisStore.getState().open(request);
    expect(useAnalysisStore.getState()).toMatchObject({
      request,
      status: "idle",
    });
    expect(useAnalysisStore.getState().begin(request, "load")).toBe(true);
    expect(useAnalysisStore.getState()).toMatchObject({
      message: "Retrieving Indexes...",
      operation: "load",
      status: "loading",
    });
    expect(useAnalysisStore.getState().begin(request, "regenerate")).toBe(false);

    useAnalysisStore.getState().setReady(request, { chains: [], name: "Batch A" });
    expect(useAnalysisStore.getState()).toMatchObject({
      report: { chains: [], name: "Batch A" },
      status: "ready",
    });

    useAnalysisStore.getState().reset();
    expect(useAnalysisStore.getState()).toMatchObject({
      report: null,
      request: null,
      status: "idle",
    });
  });
});
