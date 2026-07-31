import { describe, expect, it, vi } from "vitest";
import {
  loadBatchData,
  prepareAnalysis,
  submitSession,
} from "../data/analysisData";
import type { AnalysisWorkerClient } from "../type/analysis.types";

function client(): AnalysisWorkerClient {
  return {
    aggregate: vi.fn(),
    data: vi.fn(),
    metadata: vi.fn(async () => ({
      indexes: [
        { aspect: "parcel_id", value: "PID-1" },
        { aspect: "parcel_address", value: "10 Main Street" },
        { aspect: "parcel_reference", value: "REF-1" },
      ],
    })),
    status: vi.fn(),
    submit: vi.fn(),
  };
}

describe("analysis data", () => {
  it("prepares the complete title report without generated identifiers", () => {
    const report = prepareAnalysis([
      {
        title: "  Main Chain  ",
        completeness: "82%",
        breaks_gaps: 2,
        last_updated: "2024-02-01T12:00:00Z",
        earliest_source: "2023-01-15T12:00:00Z",
        explanation: "Summary. The title is limited. No owner match.",
        root_of_title_ref: "",
        missing_heirs: ["heir a", null],
        improvements: [],
        conveyance: [{ date: "2024-01-01" }],
        mortgage: [{ lender: "Bank" }],
        encumbrance: [{ parties: "Party" }],
        records: [
          {
            title: "<b>Warranty</b> Deed",
            date: "2024-01-02",
            required: "YES",
            session: "S-1",
            class: "deed",
            code: "C-1",
            explanation: "This is the current transfer",
            identifiers: [{ key: "book", value: "10" }],
            role: "grantor",
            page: "4",
          },
        ],
      },
    ], "");

    expect(report.name).toBe("Document Chain Set");
    expect(report.chains[0]).toMatchObject({
      title: "Main Chain",
      completeness: {
        background: "#fff7ed",
        color: "#9a3412",
        text: "82%",
      },
      breaks: {
        background: "#fee2e2",
        color: "#991b1b",
        text: "2",
      },
      lastUpdated: "2024-02-01",
      earliestSource: "2023-01-15",
      root: "No root of title reference found.",
      summary: ["Summary.", "The title is limited.", "No owner match."],
    });
    expect(report.chains[0].issues[0]).toEqual({
      color: "orange",
      label: "Missing Heirs",
      values: ["heir a"],
    });
    expect(report.chains[0].issues[8]).toEqual({
      color: "green",
      label: "No improvements needed.",
      values: [],
    });
    expect(report.chains[0].records[0]).toMatchObject({
      id: "record-0-0",
      title: "Warranty Deed",
      required: true,
      hasSession: true,
      explanation: "This is transfer",
      identifiers: [
        { key: "class", value: "deed" },
        { key: "book", value: "10" },
      ],
      details: [
        { label: "Role", value: "grantor" },
        { label: "Page", value: "4" },
      ],
    });
  });

  it("loads assignment data and submits a sanitized batch", async () => {
    const worker = client();

    await expect(loadBatchData(
      worker,
      "token-1",
      "session-1",
      { name: "Batch A" },
    )).resolves.toEqual({
      address: "10 Main Street",
      current: "Batch A",
      parcelId: "PID-1",
      reference: "REF-1",
    });
    await expect(submitSession(
      worker,
      "token-1",
      "batch<>:\"/\\\\|?*..1",
      "session-1",
    )).resolves.toBe("session-1");
    expect(worker.submit).toHaveBeenCalledWith("token-1", "batch_..1", "session-1");
  });

  it("rejects missing assignment inputs", async () => {
    const worker = client();
    vi.mocked(worker.metadata).mockResolvedValue({});

    await expect(loadBatchData(worker, "token-1", "session-1", null)).rejects.toMatchObject({
      code: "METADATA_INDEXES_MISSING",
      error: "Metadata or indexes are missing.",
    });
    await expect(submitSession(worker, "token-1", "....", "session-1")).rejects.toMatchObject({
      code: "BATCH_NAME_REQ",
      error: "Batch name is required.",
    });
    await expect(submitSession(worker, "token-1", "Batch A", "")).rejects.toMatchObject({
      code: "SESSION_MISSING",
      error: "Session is missing.",
    });
  });
});
