import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TitleReportWorkerClient } from "../type/titleReport.types";

const mock = vi.hoisted(() => ({
  client: {
    aggregate: vi.fn(),
    data: vi.fn(),
    metadata: vi.fn(),
    status: vi.fn(),
    submit: vi.fn(),
  } as TitleReportWorkerClient,
}));

vi.mock("../worker/titleReportWorkerClient", () => ({
  createTitleReportWorkerClient: vi.fn(() => mock.client),
}));

import { useTitleReport } from "../hook/useTitleReport";
import { useTitleReportStore } from "../store/titleReportStore";
import type { TitleReportPanelProps, TitleReportRequest } from "../type/titleReport.types";

const request: TitleReportRequest = {
  authToken: "token-1",
  batch: "Batch A",
  apiGatewayUrl: "https://user.example",
  intervalMs: 0,
};

function Harness(props: Pick<TitleReportPanelProps, "onError" | "onGenerated">) {
  const { regenerate } = useTitleReport({ ...props, request });
  return <button onClick={() => void regenerate()} type="button">Regenerate</button>;
}

beforeEach(() => {
  vi.clearAllMocks();
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

    render(<Harness onError={onError} onGenerated={onGenerated} />);

    await waitFor(() => expect(useTitleReportStore.getState().status).toBe("ready"));
    expect(mock.client.aggregate).toHaveBeenCalledWith("token-1", "Batch A");
    expect(mock.client.status).toHaveBeenCalledTimes(2);
    expect(useTitleReportStore.getState().report).toMatchObject({
      name: "Batch A",
      chains: [{ title: "Main Chain" }],
    });
    expect(onGenerated).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });

  it("regenerates a ready report and reports timeout failures", async () => {
    mock.client.status = vi.fn().mockResolvedValueOnce(true);
    mock.client.data = vi.fn(async () => [{ title: "Main Chain" }]);
    const onError = vi.fn();
    const onGenerated = vi.fn();

    render(<Harness onError={onError} onGenerated={onGenerated} />);
    await waitFor(() => expect(useTitleReportStore.getState().status).toBe("ready"));
    expect(onGenerated).not.toHaveBeenCalled();

    mock.client.status = vi.fn(async () => false);
    await act(async () => {
      screen.getByRole("button", { name: "Regenerate" }).click();
    });

    await waitFor(() => expect(useTitleReportStore.getState().status).toBe("error"));
    expect(mock.client.status).toHaveBeenCalledTimes(21);
    expect(onError).toHaveBeenCalledWith({
      error: {
        code: "REPORT_TIMEOUT",
        details: undefined,
        error: "Report generation timed out.",
        status: undefined,
      },
      operation: "regenerate",
    });
    expect(useTitleReportStore.getState().report).toMatchObject({
      name: "Batch A",
    });
  });

  it("reports each missing stage detail without repeating its fallback", async () => {
    mock.client.status = vi.fn().mockResolvedValueOnce(false);
    mock.client.aggregate = vi.fn(async () => { throw undefined; });
    const onError = vi.fn();

    render(<Harness onError={onError} onGenerated={vi.fn()} />);

    await waitFor(() => expect(onError).toHaveBeenCalledWith({
      error: {
        code: undefined,
        details: undefined,
        error: "Aggregation failed.",
        status: undefined,
      },
      operation: "load",
    }));

    cleanup();
    useTitleReportStore.getState().reset();
    useTitleReportStore.getState().open(request);
    mock.client.status = vi.fn().mockResolvedValueOnce(true);
    mock.client.data = vi.fn(async () => { throw undefined; });
    const dataError = vi.fn();

    render(<Harness onError={dataError} onGenerated={vi.fn()} />);

    await waitFor(() => expect(dataError).toHaveBeenCalledWith({
      error: {
        code: undefined,
        details: undefined,
        error: "Failed to get chain set.",
        status: undefined,
      },
      operation: "load",
    }));
  });
});
