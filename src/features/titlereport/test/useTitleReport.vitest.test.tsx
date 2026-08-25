import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProgressEvent } from "../../progressview/type/progress.types";
import type { TitleReportWorkerClient } from "../type/titleReport.types";

const mock = vi.hoisted(() => ({
  client: {
    aggregate: vi.fn(),
    data: vi.fn(),
    generate: vi.fn(),
    metadata: vi.fn(),
    status: vi.fn(),
    submit: vi.fn(),
  } as TitleReportWorkerClient,
}));

const progress = vi.hoisted(() => ({ reset: vi.fn() }));

vi.mock("../worker/titleReportWorkerClient", () => ({
  createTitleReportWorkerClient: vi.fn(() => mock.client),
}));

import { useTitleReport } from "../hook/useTitleReport";
import { useTitleReportStore } from "../store/titleReportStore";
import type { TitleReportPanelProps, TitleReportRequest } from "../type/titleReport.types";

const request: TitleReportRequest = {
  authToken: "token-1",
  batch: "Batch A",
  batchCode: "batch-a",
  batchGroup: "user",
  apiGatewayUrl: "https://user.example",
  intervalMs: 0,
};

function Harness(props: Pick<TitleReportPanelProps, "onError" | "onGenerated"> & { onProgress(event: ProgressEvent): void }) {
  const { regenerate } = useTitleReport({ ...props, request, resetProgress: progress.reset });
  return <button onClick={() => void regenerate()} type="button">Regenerate</button>;
}

beforeEach(() => {
  vi.clearAllMocks();
  progress.reset.mockReset();
  useTitleReportStore.getState().reset();
  useTitleReportStore.getState().open(request);
});

afterEach(() => {
  cleanup();
  useTitleReportStore.getState().reset();
});

describe("useTitleReport", () => {
  it("requests, polls, and loads an incomplete report", async () => {
    mock.client.status = vi.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    mock.client.data = vi.fn(async () => [{ title: "Main Chain" }]);
    const onError = vi.fn();
    const onGenerated = vi.fn();
    const onProgress = vi.fn();

    render(<Harness onError={onError} onGenerated={onGenerated} onProgress={onProgress} />);

    await waitFor(() => expect(useTitleReportStore.getState().status).toBe("ready"));
    expect(mock.client.aggregate).not.toHaveBeenCalled();
    expect(mock.client.status).toHaveBeenCalledTimes(2);
    expect(useTitleReportStore.getState().report).toMatchObject({
      name: "Batch A",
      chains: [{ title: "Main Chain" }],
    });
    expect(onGenerated).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
    expect(onProgress).toHaveBeenCalledWith({ jobId: "Batch A-status-0", message: "Retrieving Indexes...", phase: "started" });
    expect(onProgress).toHaveBeenCalledWith({ jobId: "Batch A-status-1", message: "Analyzing Indexing...", phase: "started" });
    expect(onProgress).toHaveBeenCalledWith({ jobId: "Batch A-data", message: "Retrieving Report...", phase: "started" });
    expect(progress.reset).toHaveBeenCalledTimes(1);
  });

  it("regenerates a ready report through aggregate before reloading it", async () => {
    mock.client.status = vi.fn().mockResolvedValueOnce(true);
    mock.client.data = vi.fn(async () => [{ title: "Main Chain" }]);
    const onProgress = vi.fn();

    render(<Harness onError={vi.fn()} onGenerated={vi.fn()} onProgress={onProgress} />);
    await waitFor(() => expect(useTitleReportStore.getState().status).toBe("ready"));

    mock.client.aggregate = vi.fn().mockResolvedValue(undefined);
    mock.client.status = vi.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    screen.getByRole("button", { name: "Regenerate" }).click();

    await waitFor(() => expect(useTitleReportStore.getState().status).toBe("ready"));
    expect(mock.client.aggregate).toHaveBeenCalledWith("token-1", "Batch A");
    expect(mock.client.status).toHaveBeenCalledTimes(2);
    expect(mock.client.data).toHaveBeenCalledTimes(2);
    expect(progress.reset).toHaveBeenCalledTimes(2);
  });

  it("reports a title polling timeout without requesting another aggregate", async () => {
    mock.client.status = vi.fn(async () => false);
    const onError = vi.fn();
    const onProgress = vi.fn();

    render(<Harness onError={onError} onGenerated={vi.fn()} onProgress={onProgress} />);

    await waitFor(() => expect(useTitleReportStore.getState().status).toBe("error"));
    expect(mock.client.aggregate).not.toHaveBeenCalled();
    expect(mock.client.status).toHaveBeenCalledTimes(22);
    expect(onError).toHaveBeenCalledWith({
      error: {
        code: "REPORT_TIMEOUT",
        details: undefined,
        error: "Report generation timed out.",
        status: undefined,
      },
      operation: "load",
    });
    expect(onProgress).toHaveBeenLastCalledWith({
      error: "Report generation timed out.",
      jobId: "Batch A-status-21",
      message: "Retrieving Report...",
      phase: "failed",
    });
  });

  it("reports status and data failures in their progress rows", async () => {
    mock.client.status = vi.fn(async () => { throw { error: "Title status unavailable" }; });
    const onError = vi.fn();
    const statusProgress = vi.fn();

    render(<Harness onError={onError} onGenerated={vi.fn()} onProgress={statusProgress} />);

    await waitFor(() => expect(onError).toHaveBeenCalledWith({
      error: {
        code: undefined,
        details: undefined,
        error: "Title status unavailable",
        status: undefined,
      },
      operation: "load",
    }));
    expect(statusProgress).toHaveBeenLastCalledWith({
      error: "Title status unavailable",
      jobId: "Batch A-status-0",
      message: "Retrieving Indexes...",
      phase: "failed",
    });

    cleanup();
    useTitleReportStore.getState().reset();
    useTitleReportStore.getState().open(request);
    mock.client.status = vi.fn().mockResolvedValueOnce(true);
    mock.client.data = vi.fn(async () => { throw undefined; });
    const dataError = vi.fn();
    const dataProgress = vi.fn();

    render(<Harness onError={dataError} onGenerated={vi.fn()} onProgress={dataProgress} />);

    await waitFor(() => expect(dataError).toHaveBeenCalledWith({
      error: {
        code: undefined,
        details: undefined,
        error: "Failed to get chain set.",
        status: undefined,
      },
      operation: "load",
    }));
    expect(dataProgress).toHaveBeenLastCalledWith({
      error: "Failed to get chain set.",
      jobId: "Batch A-data",
      message: "Retrieving Report...",
      phase: "failed",
    });
  });
});
