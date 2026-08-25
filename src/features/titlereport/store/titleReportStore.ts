import { create } from "zustand";
import type {
  TitleReportFailure,
  TitleReport,
  TitleReportRequest,
  TitleReportStatus,
} from "../type/titleReport.types";

type TitleReportStoreState = {
  failure: TitleReportFailure | null;
  operation: "load" | null;
  report: TitleReport | null;
  request: TitleReportRequest | null;
  status: TitleReportStatus;
  begin(request: TitleReportRequest): boolean;
  open(request: TitleReportRequest): void;
  reset(): void;
  setError(request: TitleReportRequest, failure: TitleReportFailure): void;
  setReady(request: TitleReportRequest, report: TitleReport): void;
};

export const useTitleReportStore = create<TitleReportStoreState>()((set, get) => ({
  failure: null,
  operation: null,
  report: null,
  request: null,
  status: "idle",
  begin(request) {
    const state = get();
    if (state.request !== request || state.status === "loading") return false;
    set({
      failure: null,
      operation: "load",
      status: "loading",
    });
    return true;
  },
  open(request) {
    set({
      failure: null,
      operation: null,
      report: null,
      request,
      status: "idle",
    });
  },
  reset() {
    set({
      failure: null,
      operation: null,
      report: null,
      request: null,
      status: "idle",
    });
  },
  setError(request, failure) {
    if (get().request !== request) return;
    set({ failure, operation: failure.operation, status: "error" });
  },
  setReady(request, report) {
    if (get().request !== request) return;
    set({
      failure: null,
      operation: null,
      report,
      status: "ready",
    });
  },
}));
