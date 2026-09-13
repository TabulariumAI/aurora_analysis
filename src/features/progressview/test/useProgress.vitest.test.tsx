import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useProgress } from "../hook/useProgress";

describe("useProgress", () => {
  it("updates one numbered job in place and completes it when the next stage starts", () => {
    const { result } = renderHook(() => useProgress("Batch A"));
    for (let index = 1; index <= 7; index++) {
      act(() => result.current.receive({ jobId: "link", message: `Linking session ${index} of 7...`, phase: "started" }));
      expect(result.current.jobs).toEqual([
        { jobId: "link", message: `Linking session ${index} of 7...`, phase: "started" },
      ]);
    }
    act(() => result.current.receive({ jobId: "generate", message: "Starting report generation...", phase: "started" }));
    expect(result.current.jobs).toEqual([
      { jobId: "link", message: "Linking session 7 of 7...", phase: "completed" },
      { jobId: "generate", message: "Starting report generation...", phase: "started" },
    ]);
  });

  it("keeps different jobs separate even when their display text matches", () => {
    const { result } = renderHook(() => useProgress("Batch A"));
    act(() => {
      result.current.receive({ jobId: "status-1", message: "Retrieving Report...", phase: "started" });
      result.current.receive({ jobId: "status-2", message: "Retrieving Report...", phase: "started" });
      result.current.receive({ jobId: "status-2", message: "Retrieving Report...", phase: "started" });
    });
    expect(result.current.jobs).toEqual([
      { jobId: "status-1", message: "Retrieving Report...", phase: "completed" },
      { jobId: "status-2", message: "Retrieving Report...", phase: "started" },
    ]);
  });

  it("fails the single numbered row and clears it before a retry", () => {
    const { result } = renderHook(() => useProgress("Batch A"));
    act(() => {
      result.current.receive({ jobId: "link", message: "Linking session 1 of 3...", phase: "started" });
      result.current.receive({ jobId: "link", message: "Linking session 2 of 3...", phase: "started" });
      result.current.receive({ jobId: "link", message: "Linking session 2 of 3...", phase: "failed", error: "Link failed" });
    });
    expect(result.current.jobs).toEqual([
      { jobId: "link", message: "Linking session 2 of 3...", phase: "failed", error: "Link failed" },
    ]);
    act(() => {
      result.current.reset();
      result.current.receive({ jobId: "link", message: "Linking session 1 of 3...", phase: "started" });
    });
    expect(result.current.jobs).toEqual([
      { jobId: "link", message: "Linking session 1 of 3...", phase: "started" },
    ]);
  });

  it("retains completed title work and updates the active job", () => {
    const { result } = renderHook(() => useProgress("Batch A"));

    act(() => {
      result.current.receive({ jobId: "status", message: "Retrieving Indexes...", phase: "started" });
      result.current.receive({ jobId: "generate", message: "Generating Report...", phase: "started" });
      result.current.receive({ jobId: "generate", message: "Generating Report...", phase: "completed" });
    });

    expect(result.current.jobs).toEqual([
      { jobId: "status", message: "Retrieving Indexes...", phase: "completed" },
      { jobId: "generate", message: "Generating Report...", phase: "completed" },
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
