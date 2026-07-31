import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalysisWorkerClient } from "../type/analysis.types";

const mock = vi.hoisted(() => ({
  client: {
    aggregate: vi.fn(),
    data: vi.fn(),
    metadata: vi.fn(),
    status: vi.fn(),
    submit: vi.fn(),
  } as AnalysisWorkerClient,
}));

vi.mock("../worker/analysisWorkerClient", () => ({
  createAnalysisWorkerClient: vi.fn(() => mock.client),
}));

import { useAnalysis } from "../hook/useAnalysis";
import { useAnalysisStore } from "../store/analysisStore";
import type { AnalysisPanelProps, AnalysisRequest } from "../type/analysis.types";

const request: AnalysisRequest = {
  authToken: "token-1",
  batch: "Batch A",
  apiGatewayUrl: "https://user.example",
  intervalMs: 0,
};

function Harness(props: Pick<AnalysisPanelProps, "onError" | "onGenerated">) {
  const { regenerate } = useAnalysis({ ...props, request });
  return <button onClick={() => void regenerate()} type="button">Regenerate</button>;
}

beforeEach(() => {
  vi.clearAllMocks();
  useAnalysisStore.getState().reset();
  useAnalysisStore.getState().open(request);
});

afterEach(() => {
  cleanup();
  useAnalysisStore.getState().reset();
});

describe("useAnalysis", () => {
  it("requests, polls, and loads an incomplete report", async () => {
    mock.client.status = vi.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    mock.client.data = vi.fn(async () => [{ title: "Main Chain" }]);
    const onError = vi.fn();
    const onGenerated = vi.fn();

    render(<Harness onError={onError} onGenerated={onGenerated} />);

    await waitFor(() => expect(useAnalysisStore.getState().status).toBe("ready"));
    expect(mock.client.aggregate).toHaveBeenCalledWith("token-1", "Batch A");
    expect(mock.client.status).toHaveBeenCalledTimes(2);
    expect(useAnalysisStore.getState().report).toMatchObject({
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
    await waitFor(() => expect(useAnalysisStore.getState().status).toBe("ready"));
    expect(onGenerated).not.toHaveBeenCalled();

    mock.client.status = vi.fn(async () => false);
    await act(async () => {
      screen.getByRole("button", { name: "Regenerate" }).click();
    });

    await waitFor(() => expect(useAnalysisStore.getState().status).toBe("error"));
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
    expect(useAnalysisStore.getState().report).toMatchObject({
      name: "Batch A",
    });
  });
});
