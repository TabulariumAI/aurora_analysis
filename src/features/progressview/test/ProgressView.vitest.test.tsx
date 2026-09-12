import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProgressView } from "../component/ProgressView";

afterEach(cleanup);

describe("ProgressView", () => {
  it("renders title progress as an accessible ordered timeline", () => {
    render(
      <ProgressView
        fillCompletion={false}
        intro="I’ll keep you updated as I generate the title report."
        jobs={[
          { jobId: "status", message: "Retrieving Indexes...", phase: "completed" },
          { jobId: "generate", message: "Generating Report..", phase: "started" },
          { error: "Title service unavailable", jobId: "data", message: "Retrieving Report...", phase: "failed" },
        ]}
        process="GENERATING TITLE REPORT"
      />,
    );

    expect(screen.getByTestId("progress-view")).toHaveAttribute("data-panel-scroll", "true");
    expect(screen.getByTestId("progress-caption")).toHaveTextContent("GENERATING TITLE REPORT");
    expect(screen.getByText("I’ll keep you updated as I generate the title report.")).toBeVisible();
    expect(screen.getByTestId("progress-intro").firstElementChild).toHaveStyle({
      backgroundColor: "#F0F6FA",
      border: "1px solid #1B7FA6",
      color: "#1B7FA6",
    });
    const rows = within(screen.getByRole("list", { name: "GENERATING TITLE REPORT updates" })).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByLabelText("Completed")).toHaveStyle({
      backgroundColor: "#ECF7F1",
      border: "1px solid #1E8E5E",
      color: "#1E8E5E",
    });
    expect(within(rows[0]).getByTestId("progress-connector")).toHaveStyle({ borderLeftColor: "#B7C8CF" });
    expect(within(rows[1]).getByLabelText("In progress")).toHaveStyle({
      backgroundColor: "#F0F6FA",
      border: "1px solid #1B7FA6",
      color: "#1B7FA6",
    });
    expect(within(rows[1]).getByText("Generating Report..").parentElement).toHaveStyle({ backgroundColor: "rgba(27, 127, 166, 0.05)" });
    expect(within(rows[1]).getByTestId("progress-spinner")).toBeVisible();
    expect(within(rows[2]).getByRole("alert")).toHaveTextContent("Title service unavailable");
    expect(rows[2]).toHaveAttribute("data-phase", "failed");
    expect(screen.getAllByTestId("progress-connector")).toHaveLength(2);
  });

  it("uses the success star only for the final completed row", () => {
    render(
      <ProgressView
        fillCompletion={false}
        intro="I’ll keep you updated as I generate the title report."
        jobs={[
          { jobId: "indexes", message: "Indexes retrieved.", phase: "completed" },
          { jobId: "report", message: "Title report ready.", phase: "completed" },
        ]}
        process="GENERATING TITLE REPORT"
      />,
    );

    const rows = screen.getAllByRole("listitem");
    expect(within(rows[0]).getByTestId("progress-completed-check")).toBeVisible();
    expect(within(rows[1]).getByTestId("progress-success-star")).toBeVisible();
    expect(within(rows[1]).getByTestId("progress-success-star").querySelector("path")).toHaveAttribute("d", "m12 2.5 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.5 6.3-.9L12 2.5Z");
    expect(within(rows[1]).getByLabelText("Completed")).toHaveStyle({
      backgroundColor: "#F0F6FA",
      border: "1px solid #1B7FA6",
      color: "#1B7FA6",
      height: "2.5rem",
      width: "2.5rem",
    });
    expect(within(rows[0]).getByText("Indexes retrieved.").parentElement).toHaveStyle({ backgroundColor: "rgba(30, 142, 94, 0.05)" });
    expect(within(rows[1]).getByText("Title report ready.").parentElement).toHaveStyle({ backgroundColor: "rgba(27, 127, 166, 0.05)" });
  });
});
