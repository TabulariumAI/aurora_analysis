import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useProgress } from "../hook/useProgress";

describe("useProgress", () => {
  it("retains completed title work and updates the active job", () => {
    const { result } = renderHook(() => useProgress("Batch A"));

    act(() => {
      result.current.receive({ jobId: "status", message: "Retrieving Indexes...", phase: "started" });
      result.current.receive({ jobId: "generate", message: "Generating Report..", phase: "started" });
      result.current.receive({ jobId: "generate", message: "Generating Report..", phase: "completed" });
    });

    expect(result.current.jobs).toEqual([
      { jobId: "status", message: "Retrieving Indexes...", phase: "completed" },
      { jobId: "generate", message: "Generating Report..", phase: "completed" },
    ]);
  });

  it("clears title progress and ignores stale updates for another batch", () => {
    const { rerender, result } = renderHook(({ batch }) => useProgress(batch), {
      initialProps: { batch: "Batch A" },
    });

    act(() => result.current.receive({ jobId: "status", message: "Retrieving Indexes...", phase: "started" }));
    const staleReceive = result.current.receive;
    rerender({ batch: "Batch B" });
    act(() => staleReceive({ jobId: "status", message: "Stale update", phase: "failed", error: "stale" }));

    expect(result.current.jobs).toEqual([]);
  });

  it("starts a fresh timeline when the same batch is regenerated", () => {
    const { result } = renderHook(() => useProgress("Batch A"));

    act(() => {
      result.current.receive({ jobId: "Batch A-status-0", message: "Retrieving Indexes...", phase: "started" });
      result.current.receive({ jobId: "Batch A-data", message: "Retrieving Report...", phase: "started" });
      result.current.reset();
      result.current.receive({ jobId: "Batch A-status-0", message: "Retrieving Indexes...", phase: "started" });
    });

    expect(result.current.jobs).toEqual([
      { jobId: "Batch A-status-0", message: "Retrieving Indexes...", phase: "started" },
    ]);
  });
});
