import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TitleReportPanel } from "../component/TitleReportPanel";
import { useTitleReportStore } from "../store/titleReportStore";
import type { TitleReportRequest } from "../type/titleReport.types";

const client = vi.hoisted(() => ({
  aggregate: vi.fn(), data: vi.fn(), generate: vi.fn(), status: vi.fn(), submit: vi.fn(),
}));
vi.mock("../worker/titleReportWorkerClient", () => ({ createTitleReportWorkerClient: () => client }));

const request: TitleReportRequest = {
  apiGatewayUrl: "https://gateway.test", authToken: "token-1", intervalMs: 0,
  batch: "Batch A", batchCode: "a", batchGroup: "user", sessions: ["first", "second"],
};
const onGenerated = vi.fn();
const onError = vi.fn();

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((complete) => { resolve = complete; });
  return { promise, resolve };
}

function Report() {
  const request = useTitleReportStore((state) => state.request);
  return request ? <TitleReportPanel request={request} onGenerated={onGenerated} onError={onError} onReadyChange={vi.fn()} onSession={vi.fn()} /> : null;
}

beforeEach(() => {
  vi.resetAllMocks();
  client.submit.mockResolvedValue(undefined);
  client.generate.mockResolvedValue(undefined);
  client.aggregate.mockResolvedValue(undefined);
  client.status.mockResolvedValue(true);
  client.data.mockResolvedValue([{ title: "Main Chain", records: [] }]);
  useTitleReportStore.getState().open(request);
});
afterEach(() => {
  cleanup();
  useTitleReportStore.getState().reset();
});

it("shows linking progress immediately, links sequentially, then generates and loads", async () => {
  const first = deferred();
  const second = deferred();
  const generation = deferred();
  client.submit.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  client.generate.mockReturnValueOnce(generation.promise);
  render(<Report />);
  expect(screen.getByRole("region", { name: "GENERATING TITLE REPORT" })).toBeVisible();
  expect(screen.getByText("Linking session 1 of 2...")).toBeVisible();
  const linking = screen.getByText("Linking session 1 of 2...");
  expect(client.submit).toHaveBeenCalledExactlyOnceWith("token-1", "Batch A", "first");
  expect(client.generate).not.toHaveBeenCalled();
  expect(client.status).not.toHaveBeenCalled();
  await act(async () => first.resolve());
  expect(screen.getByText("Linking session 2 of 2...")).toBeVisible();
  expect(screen.getAllByText(/^Linking session/)).toHaveLength(1);
  expect(screen.getByText("Linking session 2 of 2...")).toBe(linking);
  expect(linking.closest("li")).toHaveAttribute("data-phase", "started");
  expect(client.submit).toHaveBeenLastCalledWith("token-1", "Batch A", "second");
  expect(client.generate).not.toHaveBeenCalled();
  await act(async () => second.resolve());
  expect(screen.getByText("Starting report generation...")).toBeVisible();
  expect(screen.getAllByText(/^Linking session/)).toHaveLength(1);
  expect(linking.closest("li")).toHaveAttribute("data-phase", "completed");
  expect(client.generate).toHaveBeenCalledExactlyOnceWith("token-1", "Batch A");
  expect(client.status).not.toHaveBeenCalled();
  await act(async () => generation.resolve());
  await waitFor(() => expect(useTitleReportStore.getState().status).toBe("ready"));
  expect(client.data).toHaveBeenCalledExactlyOnceWith("token-1", "Batch A");
  expect(onGenerated).toHaveBeenCalledTimes(1);
  expect(onError).not.toHaveBeenCalled();
});

it.each([0, 1, 2])("keeps failure at submission stage %s in progress and stops the remaining work", async (stage) => {
  if (stage === 0) client.submit.mockRejectedValueOnce({ error: "Link unavailable" });
  if (stage === 1) client.submit.mockResolvedValueOnce(undefined).mockRejectedValueOnce({ error: "Link unavailable" });
  if (stage === 2) client.generate.mockRejectedValueOnce({ error: "Generation unavailable" });
  render(<Report />);
  expect(await screen.findByRole("alert")).toHaveTextContent(stage === 2 ? "Generation unavailable" : "Link unavailable");
  expect(screen.getByRole("region", { name: "GENERATING TITLE REPORT" })).toBeVisible();
  expect(screen.getAllByText(/^Linking session/)).toHaveLength(1);
  expect(screen.getByText(/^Linking session/).closest("li")).toHaveAttribute("data-phase", stage === 2 ? "completed" : "failed");
  expect(client.submit).toHaveBeenCalledTimes(Math.min(stage + 1, 2));
  expect(client.generate).toHaveBeenCalledTimes(stage === 2 ? 1 : 0);
  expect(client.status).not.toHaveBeenCalled();
  expect(client.data).not.toHaveBeenCalled();
  expect(onGenerated).not.toHaveBeenCalled();
  expect(onError).toHaveBeenCalledTimes(1);
});

it("generates an explicitly empty session selection without adding sessions", async () => {
  useTitleReportStore.getState().open({ ...request, sessions: [] });
  render(<Report />);
  await waitFor(() => expect(useTitleReportStore.getState().status).toBe("ready"));
  expect(client.submit).not.toHaveBeenCalled();
  expect(client.generate).toHaveBeenCalledTimes(1);
});

it("restores a report without submitting sessions or requesting generation", async () => {
  const { sessions: _sessions, ...restored } = request;
  useTitleReportStore.getState().open(restored);
  render(<Report />);
  await waitFor(() => expect(useTitleReportStore.getState().status).toBe("ready"));
  expect(client.submit).not.toHaveBeenCalled();
  expect(client.generate).not.toHaveBeenCalled();
  expect(onGenerated).not.toHaveBeenCalled();
});

it("refreshes and regenerates a linked report without submitting it again", async () => {
  render(<Report />);
  await waitFor(() => expect(useTitleReportStore.getState().status).toBe("ready"));
  act(() => useTitleReportStore.getState().refresh());
  await waitFor(() => expect(client.data).toHaveBeenCalledTimes(2));
  expect(client.aggregate).toHaveBeenCalledExactlyOnceWith("token-1", "Batch A");
  act(() => useTitleReportStore.getState().refresh());
  await waitFor(() => expect(client.data).toHaveBeenCalledTimes(3));
  expect(client.submit).toHaveBeenCalledTimes(2);
  expect(client.generate).toHaveBeenCalledTimes(1);
  expect(client.aggregate).toHaveBeenCalledTimes(2);
});

it("retries failed linking through refresh", async () => {
  client.submit.mockRejectedValueOnce({ error: "Link unavailable" });
  render(<Report />);
  await screen.findByRole("alert");
  act(() => useTitleReportStore.getState().refresh());
  await waitFor(() => expect(useTitleReportStore.getState().status).toBe("ready"));
  expect(client.submit.mock.calls.map((args) => args[2])).toEqual(["first", "first", "second"]);
  expect(client.generate).toHaveBeenCalledTimes(1);
});

it("retries data retrieval without submitting an accepted generation again", async () => {
  client.data.mockRejectedValueOnce({ error: "Data unavailable" });
  render(<Report />);
  await screen.findByRole("alert");
  act(() => useTitleReportStore.getState().refresh());
  await waitFor(() => expect(useTitleReportStore.getState().status).toBe("ready"));
  expect(client.submit).toHaveBeenCalledTimes(2);
  expect(client.generate).toHaveBeenCalledTimes(1);
  expect(client.data).toHaveBeenCalledTimes(2);
});

it.each(["close", "replace"])("stops a pending submission after %s", async (action) => {
  const pending = deferred();
  client.submit.mockReturnValueOnce(pending.promise);
  render(<Report />);
  expect(client.submit).toHaveBeenCalledTimes(1);
  act(() => {
    if (action === "close") useTitleReportStore.getState().reset();
    else useTitleReportStore.getState().open({ ...request, batch: "Batch B", sessions: [] });
  });
  await act(async () => pending.resolve());
  expect(client.submit).toHaveBeenCalledTimes(1);
  expect(client.generate.mock.calls).not.toContainEqual(["token-1", "Batch A"]);
  expect(client.status.mock.calls).not.toContainEqual(["token-1", "Batch A"]);
});

it("stops polling after the report closes during generation", async () => {
  const pending = deferred();
  client.generate.mockReturnValueOnce(pending.promise);
  render(<Report />);
  await waitFor(() => expect(client.generate).toHaveBeenCalledTimes(1));
  act(() => useTitleReportStore.getState().reset());
  await act(async () => pending.resolve());
  expect(client.status).not.toHaveBeenCalled();
  expect(client.data).not.toHaveBeenCalled();
  expect(onGenerated).not.toHaveBeenCalled();
});

it("retries an aggregate failure through refresh without resubmitting", async () => {
  render(<Report />);
  await waitFor(() => expect(useTitleReportStore.getState().status).toBe("ready"));
  client.aggregate.mockRejectedValueOnce({ error: "Service unavailable" });
  act(() => useTitleReportStore.getState().refresh());
  expect(await screen.findByRole("alert")).toHaveTextContent("Aggregation failed: Service unavailable");
  expect(client.data).toHaveBeenCalledTimes(1);
  act(() => useTitleReportStore.getState().refresh());
  await waitFor(() => expect(client.data).toHaveBeenCalledTimes(2));
  expect(client.aggregate).toHaveBeenCalledTimes(2);
  expect(client.submit).toHaveBeenCalledTimes(2);
  expect(client.generate).toHaveBeenCalledTimes(1);
});

it.each(["close", "replace", "refresh"])("ignores pending aggregation after %s", async (action) => {
  render(<Report />);
  await waitFor(() => expect(useTitleReportStore.getState().status).toBe("ready"));
  const pending = deferred();
  client.aggregate.mockReturnValueOnce(pending.promise);
  act(() => useTitleReportStore.getState().refresh());
  await waitFor(() => expect(client.aggregate).toHaveBeenCalledTimes(1));
  act(() => {
    if (action === "close") useTitleReportStore.getState().reset();
    else if (action === "replace") useTitleReportStore.getState().open({ ...request, batch: "Batch B", sessions: [] });
    else useTitleReportStore.getState().refresh();
  });
  if (action !== "close") await waitFor(() => expect(useTitleReportStore.getState().status).toBe("ready"));
  const statusCalls = client.status.mock.calls.length;
  const dataCalls = client.data.mock.calls.length;
  const notifications = onGenerated.mock.calls.length;
  await act(async () => pending.resolve());
  expect(client.status).toHaveBeenCalledTimes(statusCalls);
  expect(client.data).toHaveBeenCalledTimes(dataCalls);
  expect(onGenerated).toHaveBeenCalledTimes(notifications);
});
