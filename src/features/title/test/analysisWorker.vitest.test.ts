import { describe, expect, it, vi } from "vitest";
import { createAnalysisWorkerClient } from "../worker/analysisWorkerClient";

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

describe("analysis worker client", () => {
  it("uses the active title and metadata API routes", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ data: JSON.stringify({ indexes: [] }) }))
      .mockResolvedValueOnce(response({ success: true }))
      .mockResolvedValueOnce(response({ success: true, status: "processing" }))
      .mockResolvedValueOnce(response({ success: true, status: "completed" }))
      .mockResolvedValueOnce(response({ data: JSON.stringify([{ title: "Main Chain" }]) }));
    vi.stubGlobal("fetch", fetchMock);
    const client = createAnalysisWorkerClient({ apiBaseUrl: "https://user.example" });

    await expect(client.metadata("token-1", "session/1")).resolves.toEqual({ indexes: [] });
    await client.submit("token-1", "Batch A", "session-1");
    await client.aggregate("token-1", "Batch A");
    await expect(client.status("token-1", "Batch A")).resolves.toBe(true);
    await expect(client.data("token-1", "Batch A")).resolves.toEqual([{ title: "Main Chain" }]);

    expect(fetchMock.mock.calls.map(([url, init]) => ({
      body: init.body,
      method: init.method,
      token: init.headers.Authorization,
      url,
    }))).toEqual([
      {
        body: undefined,
        method: "GET",
        token: "Bearer token-1",
        url: "https://user.example/v1/index/session%2F1/data",
      },
      {
        body: JSON.stringify({ session: "session-1", batch: "Batch A" }),
        method: "POST",
        token: "Bearer token-1",
        url: "https://user.example/v1/title/submit",
      },
      {
        body: JSON.stringify({ session: "" }),
        method: "POST",
        token: "Bearer token-1",
        url: "https://user.example/v1/title/Batch%20A/aggregate",
      },
      {
        body: undefined,
        method: "GET",
        token: "Bearer token-1",
        url: "https://user.example/v1/title/Batch%20A/status",
      },
      {
        body: undefined,
        method: "GET",
        token: "Bearer token-1",
        url: "https://user.example/v1/title/Batch%20A/data",
      },
    ]);
    vi.unstubAllGlobals();
  });

  it("preserves backend and parsing failures", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(response({ success: false, code: "failed", message: "Title failed" }, 500))
      .mockResolvedValueOnce(new Response("not-json", { status: 200 })));
    const client = createAnalysisWorkerClient({ apiBaseUrl: "https://user.example" });

    await expect(client.status("token-1", "Batch A")).rejects.toMatchObject({
      code: "failed",
      error: "Title failed",
      status: 500,
    });
    await expect(client.data("token-1", "Batch A")).rejects.toMatchObject({
      code: "parse_error",
      error: "Response body is not valid JSON.",
      status: 200,
    });
    vi.unstubAllGlobals();
  });
});
