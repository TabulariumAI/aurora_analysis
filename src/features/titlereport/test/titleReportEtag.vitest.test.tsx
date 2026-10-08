import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TitleReportPanel } from "../component/TitleReportPanel";
import { useTitleReportStore } from "../store/titleReportStore";
import type { TitleReportRequest } from "../type/titleReport.types";

const client = vi.hoisted(() => ({
  aggregate: vi.fn(), data: vi.fn(), generate: vi.fn(), status: vi.fn(), submit: vi.fn(),
}));
vi.mock("../worker/titleReportWorkerClient", () => ({ createTitleReportWorkerClient: () => client }));
const generated = vi.fn();
const request: TitleReportRequest = {
  apiGatewayUrl: "https://gateway", authToken: "token", batch: "Batch", batchCode: "batch",
  batchGroup: "user", intervalMs: 0, sessions: ["s1", "s2"],
};
function Report() {
  const current = useTitleReportStore((state) => state.request);
  return current && <TitleReportPanel request={current} onGenerated={generated} onReadyChange={vi.fn()} onSession={vi.fn()} />;
}
beforeEach(() => {
  vi.resetAllMocks();
  client.status.mockResolvedValue(true);
  client.data.mockResolvedValue([{ title: "Existing report", records: [] }]);
  useTitleReportStore.getState().open(request);
});
afterEach(() => { cleanup(); useTitleReportStore.getState().reset(); });

it("loads a matching report immediately without submission, generation, polling, or generated notification", async () => {
  render(<Report />);
  await waitFor(() => expect(useTitleReportStore.getState().status).toBe("ready"));
  expect(client.status).toHaveBeenCalledExactlyOnceWith("token", "Batch", request.sessions, true);
  expect(client.data).toHaveBeenCalledTimes(1);
  expect(client.submit).not.toHaveBeenCalled();
  expect(client.generate).not.toHaveBeenCalled();
  expect(client.aggregate).not.toHaveBeenCalled();
  expect(generated).not.toHaveBeenCalled();
});

it("checks before submission and sends the same selection to generation and polling", async () => {
  client.status.mockResolvedValueOnce(false).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  render(<Report />);
  await waitFor(() => expect(useTitleReportStore.getState().status).toBe("ready"));
  expect(client.status.mock.invocationCallOrder[0]).toBeLessThan(client.submit.mock.invocationCallOrder[0]);
  expect(client.submit.mock.calls).toEqual([["token", "Batch", "s1"], ["token", "Batch", "s2"]]);
  expect(client.generate).toHaveBeenCalledExactlyOnceWith("token", "Batch", request.sessions);
  expect(client.status.mock.calls).toEqual([["token", "Batch", request.sessions, true], ["token", "Batch", request.sessions], ["token", "Batch", request.sessions]]);
  expect(generated).toHaveBeenCalledTimes(1);
});

it("explicitly regenerates a matching report without resubmitting sessions", async () => {
  render(<Report />);
  await waitFor(() => expect(useTitleReportStore.getState().status).toBe("ready"));
  act(() => useTitleReportStore.getState().refresh());
  await waitFor(() => expect(client.data).toHaveBeenCalledTimes(2));
  expect(client.aggregate).toHaveBeenCalledExactlyOnceWith("token", "Batch", request.sessions);
  expect(client.submit).not.toHaveBeenCalled();
  expect(client.generate).not.toHaveBeenCalled();
  expect(generated).toHaveBeenCalledTimes(1);
});

it("rechecks when reopened with a different selection", async () => {
  render(<Report />);
  await waitFor(() => expect(useTitleReportStore.getState().status).toBe("ready"));
  client.status.mockResolvedValueOnce(false);
  act(() => useTitleReportStore.getState().open({ ...request, sessions: ["s3"] }));
  await waitFor(() => expect(client.data).toHaveBeenCalledTimes(2));
  expect(client.submit).toHaveBeenCalledExactlyOnceWith("token", "Batch", "s3");
  expect(client.generate).toHaveBeenCalledExactlyOnceWith("token", "Batch", ["s3"]);
});

it("stops on a status failure before any mutation", async () => {
  client.status.mockRejectedValueOnce({ error: "Status unavailable" });
  render(<Report />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Status unavailable");
  expect(client.submit).not.toHaveBeenCalled();
  expect(client.generate).not.toHaveBeenCalled();
  expect(client.data).not.toHaveBeenCalled();
});

it.each(["close", "replace"])("ignores a pending comparison after %s", async (action) => {
  let resolve!: (value: boolean) => void;
  client.status.mockReturnValueOnce(new Promise<boolean>((done) => { resolve = done; }));
  render(<Report />);
  await waitFor(() => expect(client.status).toHaveBeenCalledTimes(1));
  act(() => {
    if (action === "close") useTitleReportStore.getState().reset();
    else useTitleReportStore.getState().open({ ...request, batch: "Other", sessions: ["s3"] });
  });
  await act(async () => resolve(false));
  expect(client.submit).not.toHaveBeenCalled();
  expect(client.generate).not.toHaveBeenCalled();
  expect(client.data.mock.calls).not.toContainEqual(["token", "Batch"]);
});

it("keeps the no-session read and explicit refresh flow", async () => {
  useTitleReportStore.getState().open({ ...request, sessions: undefined });
  render(<Report />);
  await waitFor(() => expect(useTitleReportStore.getState().status).toBe("ready"));
  expect(client.status).toHaveBeenCalledExactlyOnceWith("token", "Batch", undefined, true);
  act(() => useTitleReportStore.getState().refresh());
  await waitFor(() => expect(client.data).toHaveBeenCalledTimes(2));
  expect(client.aggregate).toHaveBeenCalledExactlyOnceWith("token", "Batch", undefined);
  expect(client.submit).not.toHaveBeenCalled();
});
