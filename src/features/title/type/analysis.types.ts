import type { MetadataPayload } from "aurorra-index";

export type AnalysisError = {
  code?: string;
  details?: unknown;
  error: string;
  status?: number;
};

export type AnalysisBatchData = {
  address: string;
  current: string;
  parcelId: string;
  reference: string;
};

export type AnalysisBadge = {
  background: string | null;
  color: string | null;
  text: string;
};

export type AnalysisDetail = {
  label: string;
  value: string;
};

export type AnalysisIssue = {
  color: "green" | "orange" | "red";
  label: string;
  values: string[];
};

export type AnalysisRecord = {
  className: string;
  code: string;
  date: string;
  details: AnalysisDetail[];
  explanation: string;
  hasSession: boolean;
  id: string;
  identifiers: Array<{ key: string; value: string }>;
  required: boolean;
  session: string | null;
  title: string;
};

export type AnalysisRow = Record<string, unknown>;

export type AnalysisChain = {
  breaks: AnalysisBadge;
  completeness: AnalysisBadge;
  conveyances: AnalysisRow[];
  earliestSource: string;
  encumbrances: AnalysisRow[];
  issues: AnalysisIssue[];
  lastUpdated: string;
  mapAddress: string;
  mortgages: AnalysisRow[];
  records: AnalysisRecord[];
  root: string;
  summary: string[];
  title: string;
};

export type AnalysisReport = {
  chains: AnalysisChain[];
  name: string;
};

export type AnalysisOperation = "load" | "regenerate";
export type AnalysisStatus = "idle" | "loading" | "ready" | "error";

export type AnalysisFailure = {
  error: AnalysisError;
  operation: AnalysisOperation;
};

export type AnalysisRequest = {
  apiGatewayUrl: string;
  authToken: string;
  batch: string;
  intervalMs: number;
};

export type AnalysisWorkerClient = {
  aggregate(token: string, batch: string): Promise<void>;
  data(token: string, batch: string): Promise<unknown>;
  metadata(token: string, session: string): Promise<MetadataPayload>;
  status(token: string, batch: string): Promise<boolean>;
  submit(token: string, batch: string, session: string): Promise<void>;
};

export type AnalysisPanelProps = {
  onError(failure: AnalysisFailure): void;
  onGenerated(): void;
  onSession(session: string): void;
  request: AnalysisRequest;
};

export type WorkerConfig = {
  apiBaseUrl: string;
};
