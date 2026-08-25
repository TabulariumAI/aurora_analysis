import { afterEach, describe, expect, it } from "vitest";
import { useTitleReportStore } from "../store/titleReportStore";
import type { TitleReportRequest } from "../type/titleReport.types";

const request: TitleReportRequest = {
  authToken: "token-1",
  batch: "Batch A",
  batchCode: "batch-a",
  batchGroup: "user",
  apiGatewayUrl: "https://user.example",
  intervalMs: 10,
};

afterEach(() => {
  useTitleReportStore.getState().reset();
});

describe("title report store", () => {
  it("owns one report request through loading, completion, and reset", () => {
    useTitleReportStore.getState().open(request);
    expect(useTitleReportStore.getState()).toMatchObject({
      request,
      status: "idle",
    });
    expect(useTitleReportStore.getState().begin(request)).toBe(true);
    expect(useTitleReportStore.getState()).toMatchObject({
      operation: "load",
      status: "loading",
    });
    expect(useTitleReportStore.getState().begin(request)).toBe(false);

    useTitleReportStore.getState().setReady(request, { chains: [], name: "Batch A" });
    expect(useTitleReportStore.getState()).toMatchObject({
      report: { chains: [], name: "Batch A" },
      status: "ready",
    });

    useTitleReportStore.getState().reset();
    expect(useTitleReportStore.getState()).toMatchObject({
      report: null,
      request: null,
      status: "idle",
    });
  });
});
