import type {
  AnalysisWorkerClient,
  WorkerConfig,
} from "../type/analysis.types";
import {
  aggregateTitle,
  getMetadata,
  getTitleData,
  getTitleStatus,
  submitTitle,
} from "./AnalysisWorker";

export function createAnalysisWorkerClient(config: WorkerConfig): AnalysisWorkerClient {
  return {
    aggregate: (token, batch) => aggregateTitle(config.apiBaseUrl, token, batch),
    data: (token, batch) => getTitleData(config.apiBaseUrl, token, batch),
    metadata: (token, session) => getMetadata(config.apiBaseUrl, token, session),
    status: (token, batch) => getTitleStatus(config.apiBaseUrl, token, batch),
    submit: (token, batch, session) => submitTitle(config.apiBaseUrl, token, batch, session),
  };
}
