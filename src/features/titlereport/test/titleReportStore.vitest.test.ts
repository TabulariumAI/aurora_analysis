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
  it("locks refresh during processing and preserves accepted submission on refresh", () => {
    useTitleReportStore.getState().open({ ...request, sessions: ["first"] });
    const current = useTitleReportStore.getState().request!;
    useTitleReportStore.getState().refresh();
    expect(useTitleReportStore.getState().request).toBe(current);
    useTitleReportStore.getState().begin(current);
    useTitleReportStore.getState().refresh();
    expect(useTitleReportStore.getState().request).toBe(current);
    useTitleReportStore.getState().setSubmitted(current);
    useTitleReportStore.getState().setReady(current, { chains: [], name: "Batch A" });
    useTitleReportStore.getState().refresh();
    expect(useTitleReportStore.getState()).toMatchObject({ submitted: true, status: "idle", report: null });
    expect(useTitleReportStore.getState().request).toEqual(current);
    expect(useTitleReportStore.getState().request).not.toBe(current);
    useTitleReportStore.getState().open({ ...current });
    expect(useTitleReportStore.getState().submitted).toBe(false);
  });

  it("releases the framework refresh lock after submission while polling continues", () => {
    useTitleReportStore.getState().open({ ...request, sessions: ["first"] });
    const current = useTitleReportStore.getState().request!;
    expect(useTitleReportStore.getState().busy).toBe(true);
    useTitleReportStore.getState().begin(current);
    useTitleReportStore.getState().setSubmitted(current);
    expect(useTitleReportStore.getState()).toMatchObject({ busy: false, status: "loading" });
    useTitleReportStore.getState().refresh();
    expect(useTitleReportStore.getState().request).not.toBe(current);
    expect(useTitleReportStore.getState()).toMatchObject({ busy: false, submitted: true });
  });

  it("preserves refresh during status-only loading and releases the lock on failure", () => {
    useTitleReportStore.getState().open(request);
    useTitleReportStore.getState().begin(request);
    useTitleReportStore.getState().refresh();
    expect(useTitleReportStore.getState().request).not.toBe(request);
    useTitleReportStore.getState().open({ ...request, sessions: ["first"] });
    const current = useTitleReportStore.getState().request!;
    useTitleReportStore.getState().setError(current, { error: { error: "Link unavailable" }, operation: "load" });
    expect(useTitleReportStore.getState().busy).toBe(false);
  });

  it("ignores completion from a replaced request", () => {
    useTitleReportStore.getState().open(request);
    const next = { ...request, batch: "Next" };
    useTitleReportStore.getState().open(next);
    useTitleReportStore.getState().setSubmitted(request);
    useTitleReportStore.getState().setReady(request, { chains: [], name: "Batch A" });
    useTitleReportStore.getState().setError(request, { error: { error: "Old failure" }, operation: "load" });
    expect(useTitleReportStore.getState()).toMatchObject({ request: next, submitted: false, status: "idle", failure: null, report: null });
  });

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

it("requests regeneration on refresh except when initial submission needs retry", () => {
  useTitleReportStore.getState().open(request);
  expect(useTitleReportStore.getState().regenerate).toBe(false);
  useTitleReportStore.getState().refresh();
  expect(useTitleReportStore.getState().regenerate).toBe(true);
  useTitleReportStore.getState().open({ ...request, sessions: ["first"] });
  const current = useTitleReportStore.getState().request!;
  useTitleReportStore.getState().setError(current, { error: { error: "Link failed" }, operation: "load" });
  useTitleReportStore.getState().refresh();
  expect(useTitleReportStore.getState().regenerate).toBe(false);
  useTitleReportStore.getState().reset();
  expect(useTitleReportStore.getState().regenerate).toBe(false);
});
