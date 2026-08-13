import type { ReactNode } from "react";

export type TitleReportError = {
  code?: string;
  details?: unknown;
  error: string;
  status?: number;
};

export type TitleReportBadge = {
  background: string | null;
  color: string | null;
  text: string;
};

export type TitleReportDetail = {
  label: string;
  value: string;
};

export type TitleReportIssue = {
  color: "green" | "orange" | "red";
  label: string;
  values: string[];
};

export type TitleReportRecord = {
  className: string;
  code: string;
  date: string;
  details: TitleReportDetail[];
  explanation: string;
  hasSession: boolean;
  id: string;
  identifiers: Array<{ key: string; value: string }>;
  required: boolean;
  session: string | null;
  title: string;
};

export type TitleReportRow = Record<string, unknown>;

export type TitleReportChain = {
  breaks: TitleReportBadge;
  completeness: TitleReportBadge;
  conveyances: TitleReportRow[];
  earliestSource: string;
  encumbrances: TitleReportRow[];
  issues: TitleReportIssue[];
  lastUpdated: string;
  mapAddress: string;
  mortgages: TitleReportRow[];
  records: TitleReportRecord[];
  root: string;
  summary: string[];
  title: string;
};

export type TitleReport = {
  chains: TitleReportChain[];
  name: string;
};

export type TitleReportOperation = "load" | "regenerate";
export type TitleReportStatus = "idle" | "loading" | "ready" | "error";

export type TitleReportFailure = {
  error: TitleReportError;
  operation: TitleReportOperation;
};

export type TitleReportRequest = {
  apiGatewayUrl: string;
  authToken: string;
  batch: string;
  intervalMs: number;
};

export type TitleReportWorkerClient = {
  aggregate(token: string, batch: string): Promise<void>;
  data(token: string, batch: string): Promise<unknown>;
  status(token: string, batch: string): Promise<boolean>;
  submit(token: string, batch: string, session: string): Promise<void>;
};

export type TitleReportPanelProps = {
  onError(failure: TitleReportFailure): void;
  onGenerated(): void;
  onLoaderChange?(lines: readonly string[] | null): void;
  onReadyChange(ready: boolean): void;
  onSession(session: string): void;
  request: TitleReportRequest;
  titleAction: ReactNode;
};

export type WorkerConfig = {
  apiBaseUrl: string;
};
