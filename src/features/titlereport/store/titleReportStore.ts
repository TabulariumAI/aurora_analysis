import { create } from "zustand";
import type {
  TitleReportFailure,
  TitleReport,
  TitleReportRequest,
  TitleReportStatus,
} from "../type/titleReport.types";

type TitleReportStoreState = {
  busy: boolean;
  failure: TitleReportFailure | null;
  operation: "load" | null;
  regenerate: boolean;
  report: TitleReport | null;
  request: TitleReportRequest | null;
  status: TitleReportStatus;
  submitted: boolean;
  begin(request: TitleReportRequest): boolean;
  open(request: TitleReportRequest): void;
  refresh(): void;
  reset(): void;
  setError(request: TitleReportRequest, failure: TitleReportFailure): void;
  setReady(request: TitleReportRequest, report: TitleReport): void;
  setSubmitted(request: TitleReportRequest): void;
};

const initialState = {
  busy: false,
  failure: null,
  operation: null,
  regenerate: false,
  report: null,
  request: null,
  status: "idle" as const,
  submitted: false,
};

export const useTitleReportStore = create<TitleReportStoreState>()((set, get) => ({
  ...initialState,
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
    set({ ...initialState, busy: request.sessions !== undefined, request });
  },
  refresh() {
    const { busy, request, submitted } = get();
    if (!request || busy) return;
    set({
      ...initialState,
      busy: request.sessions !== undefined && !submitted,
      regenerate: request.sessions === undefined || submitted,
      request: { ...request },
      submitted,
    });
  },
  reset() {
    set(initialState);
  },
  setSubmitted(request) {
    if (get().request !== request) return;
    set({ busy: false, submitted: true });
  },
  setError(request, failure) {
    if (get().request !== request) return;
    set({ busy: false, failure, operation: failure.operation, status: "error" });
  },
  setReady(request, report) {
    if (get().request !== request) return;
    set({
      busy: false,
      failure: null,
      operation: null,
      report,
      status: "ready",
    });
  },
}));
