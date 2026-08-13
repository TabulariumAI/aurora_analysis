import { create } from "zustand";
import type {
  TitleReportFailure,
  TitleReportOperation,
  TitleReport,
  TitleReportRequest,
  TitleReportStatus,
} from "../type/titleReport.types";

type TitleReportStoreState = {
  failure: TitleReportFailure | null;
  message: string;
  operation: TitleReportOperation | null;
  report: TitleReport | null;
  request: TitleReportRequest | null;
  status: TitleReportStatus;
  begin(request: TitleReportRequest, operation: TitleReportOperation): boolean;
  open(request: TitleReportRequest): void;
  reset(): void;
  setError(request: TitleReportRequest, failure: TitleReportFailure): void;
  setMessage(request: TitleReportRequest, message: string): void;
  setReady(request: TitleReportRequest, report: TitleReport): void;
};

export const useTitleReportStore = create<TitleReportStoreState>()((set, get) => ({
  failure: null,
  message: "",
  operation: null,
  report: null,
  request: null,
  status: "idle",
  begin(request, operation) {
    const state = get();
    if (state.request !== request || state.status === "loading") return false;
    set({
      failure: null,
      message: "Retrieving Indexes...",
      operation,
      status: "loading",
    });
    return true;
  },
  open(request) {
    set({
      failure: null,
      message: "Retrieving Indexes...",
      operation: null,
      report: null,
      request,
      status: "idle",
    });
  },
  reset() {
    set({
      failure: null,
      message: "",
      operation: null,
      report: null,
      request: null,
      status: "idle",
    });
  },
  setError(request, failure) {
    if (get().request !== request) return;
    set({ failure, message: "", operation: failure.operation, status: "error" });
  },
  setMessage(request, message) {
    if (get().request !== request) return;
    set({ message });
  },
  setReady(request, report) {
    if (get().request !== request) return;
    set({
      failure: null,
      message: "",
      operation: null,
      report,
      status: "ready",
    });
  },
}));
