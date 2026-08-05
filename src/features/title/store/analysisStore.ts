import { create } from "zustand";
import type {
  AnalysisFailure,
  AnalysisOperation,
  AnalysisReport,
  AnalysisRequest,
  AnalysisStatus,
} from "../type/analysis.types";

type AnalysisStoreState = {
  failure: AnalysisFailure | null;
  message: string;
  operation: AnalysisOperation | null;
  report: AnalysisReport | null;
  request: AnalysisRequest | null;
  status: AnalysisStatus;
  begin(request: AnalysisRequest, operation: AnalysisOperation): boolean;
  open(request: AnalysisRequest): void;
  reset(): void;
  setError(request: AnalysisRequest, failure: AnalysisFailure): void;
  setMessage(request: AnalysisRequest, message: string): void;
  setReady(request: AnalysisRequest, report: AnalysisReport): void;
};

export const useAnalysisStore = create<AnalysisStoreState>()((set, get) => ({
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
