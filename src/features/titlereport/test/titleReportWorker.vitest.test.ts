import { describe, expect, it, vi } from "vitest";
import { createTitleReportWorkerClient } from "../worker/titleReportWorkerClient";

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

describe("title report worker client", () => {
  it("treats a previously failed report as a cache miss but reports polling failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => response({ status: "error", data: "Generation failed", matches: false })));
    const client = createTitleReportWorkerClient({ apiBaseUrl: "https://user.example" });
    await expect(client.status("token", "Batch", ["s1"], true)).resolves.toBe(false);
    await expect(client.status("token", "Batch", ["s1"])).rejects.toMatchObject({ error: "Generation failed" });
    await expect(client.status("token", "Batch", undefined, true)).rejects.toMatchObject({ error: "Generation failed" });
    vi.unstubAllGlobals();
  });

  it("does not treat HTTP failures as cache misses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ error: "Unavailable" }, 503)));
    const client = createTitleReportWorkerClient({ apiBaseUrl: "https://user.example" });
    await expect(client.status("token", "Batch", ["s1"], true)).rejects.toMatchObject({ status: 503 });
    vi.unstubAllGlobals();
  });

  it.each([true, false])("checks the server comparison for selected sessions: %s", async (matches) => {
    const fetchMock = vi.fn().mockResolvedValue(response({ status: "completed", matches, etag: "selection" }));
    vi.stubGlobal("fetch", fetchMock);
    const client = createTitleReportWorkerClient({ apiBaseUrl: "https://user.example" });
    await expect(client.status("token", "Batch", ["s1", "s&2"])).resolves.toBe(matches);
    expect(fetchMock.mock.calls[0][0]).toBe("https://user.example/v1/title/Batch/status?session=s1&session=s%262");
    vi.unstubAllGlobals();
  });

  it("ignores ETag comparison without session IDs", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ status: "completed", matches: false }));
    vi.stubGlobal("fetch", fetchMock);
    const client = createTitleReportWorkerClient({ apiBaseUrl: "https://user.example" });
    await expect(client.status("token", "Batch")).resolves.toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe("https://user.example/v1/title/Batch/status");
    vi.unstubAllGlobals();
  });

  it("forwards the selection on initial and explicit generation", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => response({ status: "processing" }));
    vi.stubGlobal("fetch", fetchMock);
    const client = createTitleReportWorkerClient({ apiBaseUrl: "https://user.example" });
    await client.generate("token", "Batch", ["s1"]);
    await client.aggregate("token", "Batch", ["s1"]);
    expect(fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body))).toEqual([
      { session: "", sessions: ["s1"] }, { session: "", sessions: ["s1"] },
    ]);
    vi.unstubAllGlobals();
  });

  it("downloads completed report JSON from the returned Azure Blob SAS URL", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ data: "", status: "completed" }))
      .mockResolvedValueOnce(response({
        batch: "Batch A",
        data: "https://storage.example/Batch%20A/titlereport.json?sig=token",
        sessions: null,
        status: "completed",
      }))
      .mockResolvedValueOnce(response([{ title: "Main Chain" }]));
    vi.stubGlobal("fetch", fetchMock);
    const client = createTitleReportWorkerClient({ apiBaseUrl: "https://user.example" });

    await expect(client.status("token-1", "Batch A")).resolves.toBe(true);
    await expect(client.data("token-1", "Batch A")).resolves.toEqual([{ title: "Main Chain" }]);

    expect(fetchMock.mock.calls.map(([url, init]) => ({
      headers: init?.headers,
      method: init?.method,
      url,
    }))).toEqual([
      {
        headers: {
          Authorization: "Bearer token-1",
          "Content-Type": "application/json",
        },
        method: "GET",
        url: "https://user.example/v1/title/Batch%20A/status",
      },
      {
        headers: {
          Authorization: "Bearer token-1",
          "Content-Type": "application/json",
        },
        method: "GET",
        url: "https://user.example/v1/title/Batch%20A/data",
      },
      {
        headers: undefined,
        method: undefined,
        url: "https://storage.example/Batch%20A/titlereport.json?sig=token",
      },
    ]);
    vi.unstubAllGlobals();
  });

  it("uses the active title API routes", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ success: true }))
      .mockResolvedValueOnce(response({ success: true, status: "processing" }))
      .mockResolvedValueOnce(response({ success: true, status: "processing" }))
      .mockResolvedValueOnce(response({ success: true, status: "completed" }))
      .mockResolvedValueOnce(response({
        batch: "Batch A",
        data: "https://storage.example/Batch%20A/titlereport.json?sig=token",
        sessions: null,
        status: "completed",
      }))
      .mockResolvedValueOnce(response([{ title: "Main Chain" }]));
    vi.stubGlobal("fetch", fetchMock);
    const client = createTitleReportWorkerClient({ apiBaseUrl: "https://user.example" });

    await client.submit("token-1", "Batch A", "session-1");
    await client.generate("token-1", "Batch A");
    await client.aggregate("token-1", "Batch A");
    await expect(client.status("token-1", "Batch A")).resolves.toBe(true);
    await expect(client.data("token-1", "Batch A")).resolves.toEqual([{ title: "Main Chain" }]);

    expect(fetchMock.mock.calls.map(([url, init]) => ({
      body: init?.body,
      method: init?.method,
      token: init?.headers?.Authorization,
      url,
    }))).toEqual([
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
        url: "https://user.example/v1/title/Batch%20A/generations",
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
      {
        body: undefined,
        method: undefined,
        token: undefined,
        url: "https://storage.example/Batch%20A/titlereport.json?sig=token",
      },
    ]);
    vi.unstubAllGlobals();
  });

  it("does not download a Blob when the data route reports an error", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({
        batch: "Batch A",
        data: "Title report failed.",
        sessions: null,
        status: "error",
      }));
    vi.stubGlobal("fetch", fetchMock);
    const client = createTitleReportWorkerClient({ apiBaseUrl: "https://user.example" });

    await expect(client.data("token-1", "Batch A")).rejects.toMatchObject({
      error: "Title report failed.",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("preserves backend and parsing failures", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(response({ success: false, code: "failed", message: "Title failed" }, 500))
      .mockResolvedValueOnce(new Response("not-json", { status: 200 })));
    const client = createTitleReportWorkerClient({ apiBaseUrl: "https://user.example" });

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
