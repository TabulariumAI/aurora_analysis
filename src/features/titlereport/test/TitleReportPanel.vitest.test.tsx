import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prepareTitleReport } from "../data/titleReportData";
import { useTitleReportStore } from "../store/titleReportStore";
import type { TitleReportRequest } from "../type/titleReport.types";

const hook = vi.hoisted(() => ({
  regenerate: vi.fn(),
}));

vi.mock("../hook/useTitleReport", () => ({
  useTitleReport: vi.fn(() => ({ regenerate: hook.regenerate })),
}));

const progress = vi.hoisted(() => ({
  jobs: [] as Array<{
    error?: string;
    jobId: string;
    message: string;
    phase: "completed" | "failed" | "started";
  }>,
  receive: vi.fn(),
  reset: vi.fn(),
}));

vi.mock("../../progressview/hook/useProgress", () => ({
  useProgress: () => ({ jobs: progress.jobs, receive: progress.receive, reset: progress.reset }),
}));

import { TitleReportPanel } from "../component/TitleReportPanel";

const request: TitleReportRequest = {
  authToken: "token-1",
  batch: "Batch A",
  batchCode: "batch-a",
  batchGroup: "user",
  apiGatewayUrl: "https://user.example",
  intervalMs: 10,
};

beforeEach(() => {
  progress.jobs = [];
  progress.receive.mockReset();
  progress.reset.mockReset();
  hook.regenerate.mockReset();
  useTitleReportStore.getState().reset();
  useTitleReportStore.getState().open(request);
});

afterEach(() => {
  cleanup();
  useTitleReportStore.getState().reset();
});

describe("TitleReportPanel", () => {
  it("renders the single-chain report without an accordion title", () => {
    const onReadyChange = vi.fn();
    const onSession = vi.fn();
    useTitleReportStore.getState().setReady(request, prepareTitleReport([
      {
        title: "Main Chain",
        completeness: 1,
        breaks_gaps: 0,
        explanation: "Clear chain.",
        records: [{
          class: "deed",
          code: "D-1",
          explanation: "This is the current deed",
          session: "session-2",
          title: "Warranty Deed",
        }],
      },
    ], "Batch A"));

    render(
      <TitleReportPanel
        onError={vi.fn()}
        onGenerated={vi.fn()}
        onReadyChange={onReadyChange}
        onSession={onSession}
        request={request}
      />,
    );

    expect(screen.getByRole("region", { name: "Title report content" })).toBeVisible();
    expect(screen.getByText("Batch A")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Main Chain" })).not.toBeInTheDocument();
    expect(screen.getByTitle("Map for Main Chain")).toHaveAttribute(
      "src",
      "https://www.google.com/maps?q=Main%20Chain&output=embed&maptype=roadmap",
    );
    expect(screen.getByText("Warranty Deed")).toBeVisible();
    expect(onReadyChange).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "View" }));
    expect(onSession).toHaveBeenCalledWith("session-2");
    fireEvent.click(screen.getByRole("button", { name: "Regenerate" }));
    expect(hook.regenerate).toHaveBeenCalledTimes(1);
  });

  it("uses Radix collapsibles for multiple chains and opens the first", () => {
    useTitleReportStore.getState().setReady(request, prepareTitleReport([
      { title: "Chain One", records: [] },
      { title: "Chain Two", records: [] },
    ], "Batch A"));

    render(
      <TitleReportPanel
        onError={vi.fn()}
        onGenerated={vi.fn()}
        onReadyChange={vi.fn()}
        onSession={vi.fn()}
        request={request}
      />,
    );

    expect(screen.getByRole("button", { name: "Chain One" })).toHaveAttribute("data-state", "open");
    expect(screen.getByRole("button", { name: "Chain Two" })).toHaveAttribute("data-state", "closed");
    expect(screen.getByText("(2 chains)")).toBeVisible();
  });

  it("shows title report progress while the backend generates", () => {
    const onLoaderChange = vi.fn();
    const onReadyChange = vi.fn();
    useTitleReportStore.getState().begin(request);

    render(
      <TitleReportPanel
        onError={vi.fn()}
        onGenerated={vi.fn()}
        onLoaderChange={onLoaderChange}
        onReadyChange={onReadyChange}
        onSession={vi.fn()}
        request={request}
      />,
    );

    expect(onReadyChange).toHaveBeenLastCalledWith(true);
    expect(onLoaderChange).toHaveBeenLastCalledWith(null);
    expect(screen.getByText("Batch A")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Regenerate" })).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "GENERATING TITLE REPORT" })).toBeVisible();
    expect(screen.getByText("I’ll keep you updated as I generate the title report.")).toBeVisible();
  });

  it("keeps a load failure in the title report progress view", () => {
    useTitleReportStore.getState().begin(request);
    useTitleReportStore.getState().setError(request, {
      error: { error: "Failed to get chain set." },
      operation: "load",
    });
    progress.jobs = [{
      error: "Failed to get chain set.",
      jobId: "Batch A-data",
      message: "Retrieving Report...",
      phase: "failed",
    }];

    render(
      <TitleReportPanel
        onError={vi.fn()}
        onGenerated={vi.fn()}
        onReadyChange={vi.fn()}
        onSession={vi.fn()}
        request={request}
      />,
    );

    expect(screen.getByText("Batch A")).toBeVisible();
    expect(screen.getByRole("region", { name: "GENERATING TITLE REPORT" })).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to get chain set.");
  });
});
