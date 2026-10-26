import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prepareTitleReport } from "../data/titleReportData";
import { useTitleReportStore } from "../store/titleReportStore";
import type { TitleReportRequest } from "../type/titleReport.types";

vi.mock("../hook/useTitleReport", () => ({
  useTitleReport: vi.fn(() => ({})),
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
  batchId: "batch-a", batchCode: "batch-a",
  batchGroup: "user",
  apiGatewayUrl: "https://user.example",
  intervalMs: 10,
};

beforeEach(() => {
  progress.jobs = [];
  progress.receive.mockReset();
  progress.reset.mockReset();
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
    expect(screen.getByRole("region", { name: "Title report content" }).querySelector("[data-panel-scroll='true']")).toBeTruthy();
    expect(screen.queryByText("Batch A")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Main Chain" })).not.toBeInTheDocument();
    expect(screen.getByTitle("Map for Main Chain")).toHaveAttribute(
      "src",
      "https://www.google.com/maps?q=Main%20Chain&output=embed&maptype=roadmap",
    );
    expect(screen.getByText("Warranty Deed")).toBeVisible();
    expect(onReadyChange).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "View Warranty Deed D-1" }));
    expect(onSession).toHaveBeenCalledWith("session-2");
    expect(screen.queryByRole("button", { name: "Regenerate" })).not.toBeInTheDocument();
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
    expect(screen.queryByText("(2 chains)")).not.toBeInTheDocument();
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
    expect(screen.queryByText("Batch A")).not.toBeInTheDocument();
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

    expect(screen.queryByText("Batch A")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "GENERATING TITLE REPORT" })).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to get chain set.");
  });
});

it("identifies each record action while preserving visible text and its session destination", () => {
  const onSession = vi.fn();
  useTitleReportStore.getState().setReady(request, prepareTitleReport([{
    title: "Main Chain",
    records: [
      { title: "Warranty Deed", code: "D-1", session: "session-1" },
      { title: "Warranty Deed", code: "D-2", session: "session-2" },
      { title: "Mortgage", code: "", session: "session-3" },
      { title: "<b>Release</b>", code: "R & 3", session: "session-4" },
      { title: "Missing Deed", code: "D-4", class: "deed", session: null },
    ],
  }], "Batch A"));
  render(<TitleReportPanel onGenerated={vi.fn()} onReadyChange={vi.fn()} onSession={onSession} request={request} />);
  const names = ["View Warranty Deed D-1", "View Warranty Deed D-2", "View Mortgage", "View Release R & 3"];
  for (const [index, name] of names.entries()) {
    const button = screen.getByRole("button", { name });
    expect(button).toHaveTextContent(/^View$/);
    expect(button).toHaveAttribute("type", "button");
    fireEvent.click(button);
    expect(onSession).toHaveBeenNthCalledWith(index + 1, `session-${index + 1}`);
  }
  expect(screen.getAllByRole("button")).toHaveLength(4);
  expect(screen.queryByRole("button", { name: "View" })).not.toBeInTheDocument();
  expect(screen.getByText("The deed record is not present.")).toBeVisible();
});
