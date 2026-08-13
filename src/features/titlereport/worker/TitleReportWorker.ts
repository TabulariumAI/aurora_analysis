import type { TitleReportError } from "../type/titleReport.types";

type TitleReportResponse = {
  code?: string;
  data?: unknown;
  error?: string;
  message?: string;
  status?: unknown;
  success?: boolean;
};

function responseError(response: Response, data: TitleReportResponse): TitleReportError {
  return {
    code: data.code ?? (response.status === 401 ? "unauthorized" : "server_error"),
    details: data,
    error: data.error ?? data.message ?? response.statusText,
    status: response.status,
  };
}

async function titleReportFetch(
  token: string,
  url: string,
  init: { body?: unknown; method: "GET" | "POST" },
): Promise<TitleReportResponse> {
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
  let payload: TitleReportResponse = {};
  if (raw) {
    try {
      payload = JSON.parse(raw) as TitleReportResponse;
    } catch {
      throw {
        code: "parse_error",
        details: { body: raw },
        error: "Response body is not valid JSON.",
        status: response.status,
      } satisfies TitleReportError;
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

export function parseTitleReportData(data: unknown): unknown {
  if (typeof data !== "string") return data;
  try {
    return JSON.parse(data);
  } catch {
    throw {
      code: "parse_error",
      details: { data },
      error: "Response data is not valid JSON.",
    } satisfies TitleReportError;
  }
}

export async function submitTitle(
  baseUrl: string,
  token: string,
  batch: string,
  session: string,
) {
  await titleReportFetch(token, `${baseUrl}/v1/title/submit`, {
    body: { session, batch },
    method: "POST",
  });
}

export async function aggregateTitle(baseUrl: string, token: string, batch: string) {
  await titleReportFetch(
    token,
    `${baseUrl}/v1/title/${encodeURIComponent(batch)}/aggregate`,
    { body: { session: "" }, method: "POST" },
  );
}

export async function getTitleStatus(baseUrl: string, token: string, batch: string) {
  const response = await titleReportFetch(
    token,
    `${baseUrl}/v1/title/${encodeURIComponent(batch)}/status`,
    { method: "GET" },
  );
  return response.status === "completed";
}

export async function getTitleData(baseUrl: string, token: string, batch: string) {
  const response = await titleReportFetch(
    token,
    `${baseUrl}/v1/title/${encodeURIComponent(batch)}/data`,
    { method: "GET" },
  );
  return parseTitleReportData(response.data);
}
