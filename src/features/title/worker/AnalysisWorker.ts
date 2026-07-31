import type { MetadataPayload } from "aurorra-index";
import type { AnalysisError } from "../type/analysis.types";

type AnalysisResponse = {
  code?: string;
  data?: unknown;
  error?: string;
  message?: string;
  status?: unknown;
  success?: boolean;
};

function responseError(response: Response, data: AnalysisResponse): AnalysisError {
  return {
    code: data.code ?? (response.status === 401 ? "unauthorized" : "server_error"),
    details: data,
    error: data.error ?? data.message ?? response.statusText,
    status: response.status,
  };
}

async function analysisFetch(
  token: string,
  url: string,
  init: { body?: unknown; method: "GET" | "POST" },
): Promise<AnalysisResponse> {
  const response = await fetch(url, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  const raw = await response.text();
  let payload: AnalysisResponse = {};
  if (raw) {
    try {
      payload = JSON.parse(raw) as AnalysisResponse;
    } catch {
      throw {
        code: "parse_error",
        details: { body: raw },
        error: "Response body is not valid JSON.",
        status: response.status,
      } satisfies AnalysisError;
    }
  }
  if (
    !response.ok
    || payload.success === false
    || payload.status === "error"
    || payload.status === "FAILED"
  ) {
    throw responseError(response, payload);
  }
  return payload;
}

export function parseAnalysisData(data: unknown): unknown {
  if (typeof data !== "string") return data;
  try {
    return JSON.parse(data);
  } catch {
    throw {
      code: "parse_error",
      details: { data },
      error: "Response data is not valid JSON.",
    } satisfies AnalysisError;
  }
}

export async function getMetadata(
  baseUrl: string,
  token: string,
  session: string,
): Promise<MetadataPayload> {
  const response = await analysisFetch(
    token,
    `${baseUrl}/v1/index/${encodeURIComponent(session)}/data`,
    { method: "GET" },
  );
  return parseAnalysisData(response.data) as MetadataPayload;
}

export async function submitTitle(
  baseUrl: string,
  token: string,
  batch: string,
  session: string,
) {
  await analysisFetch(token, `${baseUrl}/v1/title/submit`, {
    body: { session, batch },
    method: "POST",
  });
}

export async function aggregateTitle(baseUrl: string, token: string, batch: string) {
  await analysisFetch(
    token,
    `${baseUrl}/v1/title/${encodeURIComponent(batch)}/aggregate`,
    { body: { session: "" }, method: "POST" },
  );
}

export async function getTitleStatus(baseUrl: string, token: string, batch: string) {
  const response = await analysisFetch(
    token,
    `${baseUrl}/v1/title/${encodeURIComponent(batch)}/status`,
    { method: "GET" },
  );
  return response.status === "completed";
}

export async function getTitleData(baseUrl: string, token: string, batch: string) {
  const response = await analysisFetch(
    token,
    `${baseUrl}/v1/title/${encodeURIComponent(batch)}/data`,
    { method: "GET" },
  );
  return parseAnalysisData(response.data);
}
