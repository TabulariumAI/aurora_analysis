import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prepareAnalysis } from "../data/analysisData";
import { useAnalysisStore } from "../store/analysisStore";
import type { AnalysisRequest } from "../type/analysis.types";

const hook = vi.hoisted(() => ({
  regenerate: vi.fn(),
}));

vi.mock("../hook/useAnalysis", () => ({
  useAnalysis: vi.fn(() => ({ regenerate: hook.regenerate })),
}));

import { AnalysisPanel } from "../component/AnalysisPanel";

const request: AnalysisRequest = {
  authToken: "token-1",
  batch: "Batch A",
  apiGatewayUrl: "https://user.example",
  intervalMs: 10,
};

beforeEach(() => {
  hook.regenerate.mockReset();
  useAnalysisStore.getState().reset();
  useAnalysisStore.getState().open(request);
});

afterEach(() => {
  cleanup();
  useAnalysisStore.getState().reset();
});

describe("AnalysisPanel", () => {
  it("renders the single-chain report without an accordion title", () => {
    const onReadyChange = vi.fn();
    const onSession = vi.fn();
    useAnalysisStore.getState().setReady(request, prepareAnalysis([
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
      <AnalysisPanel
        onError={vi.fn()}
        onGenerated={vi.fn()}
        onReadyChange={onReadyChange}
        onSession={onSession}
        request={request}
      />,
    );

    expect(screen.getByRole("region", { name: "Title analysis" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Batch A" })).toBeVisible();
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
    useAnalysisStore.getState().setReady(request, prepareAnalysis([
      { title: "Chain One", records: [] },
      { title: "Chain Two", records: [] },
    ], "Batch A"));

    render(
      <AnalysisPanel
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

  it("reports pending while the title report is loading", () => {
    const onLoaderChange = vi.fn();
    const onReadyChange = vi.fn();

    render(
      <AnalysisPanel
        onError={vi.fn()}
        onGenerated={vi.fn()}
        onLoaderChange={onLoaderChange}
        onReadyChange={onReadyChange}
        onSession={vi.fn()}
        request={request}
      />,
    );

    expect(onReadyChange).toHaveBeenLastCalledWith(false);
    expect(onLoaderChange).toHaveBeenLastCalledWith(["Retrieving Indexes..."]);
  });
});
