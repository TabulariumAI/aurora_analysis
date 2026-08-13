import type {
  TitleReportWorkerClient,
  WorkerConfig,
} from "../type/titleReport.types";
import {
  aggregateTitle,
  getTitleData,
  getTitleStatus,
  submitTitle,
} from "./TitleReportWorker";

export function createTitleReportWorkerClient(config: WorkerConfig): TitleReportWorkerClient {
  return {
    aggregate: (token, batch) => aggregateTitle(config.apiBaseUrl, token, batch),
    data: (token, batch) => getTitleData(config.apiBaseUrl, token, batch),
    status: (token, batch) => getTitleStatus(config.apiBaseUrl, token, batch),
    submit: (token, batch, session) => submitTitle(config.apiBaseUrl, token, batch, session),
  };
}
