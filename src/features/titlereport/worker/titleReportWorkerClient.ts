import type {
  TitleReportWorkerClient,
  WorkerConfig,
} from "../type/titleReport.types";
import {
  aggregateTitle,
  getTitleData,
  getTitleStatus,
  generateTitle,
  submitTitle,
} from "./TitleReportWorker";

export function createTitleReportWorkerClient(config: WorkerConfig): TitleReportWorkerClient {
  return {
    aggregate: (token, batch, sessions) => aggregateTitle(config.apiBaseUrl, token, batch, sessions),
    data: (token, batch) => getTitleData(config.apiBaseUrl, token, batch),
    generate: (token, batch, sessions) => generateTitle(config.apiBaseUrl, token, batch, sessions),
    status: (token, batch, sessions, check) => getTitleStatus(config.apiBaseUrl, token, batch, sessions, check),
    submit: (token, batch, session) => submitTitle(config.apiBaseUrl, token, batch, session),
  };
}
