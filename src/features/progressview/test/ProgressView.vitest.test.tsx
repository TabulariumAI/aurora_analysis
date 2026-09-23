import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProgressView } from "../component/ProgressView";

afterEach(cleanup);

describe("ProgressView", () => {
  it("renders scheduled step counts only from the current raw group member", () => {
    render(
      <ProgressView
        fillCompletion={false}
        intro="I’ll keep you updated as I generate the title report."
        jobs={[
          { jobId: "first", message: "Retrieving Report...", phase: "completed", progress: { completed: 1, total: 18, unit: "steps" } },
          { jobId: "second", message: "Retrieving Report...", phase: "started", progress: { completed: 18, total: 18, unit: "steps" } },
        ]}
        process="GENERATING TITLE REPORT"
      />,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("progressbar", { name: "Retrieving Report..." })).toHaveAttribute("aria-valuetext", "Step 18 of 18");
  });

  it("hides a completed event's counter and bar", () => {
    render(<ProgressView fillCompletion={false} intro="I’ll keep you updated as I generate the title report." jobs={[{
      jobId: "report",
      message: "Retrieving Report...",
      phase: "completed",
      progress: { completed: 18, total: 18, unit: "steps" },
    }]} process="GENERATING TITLE REPORT" />);

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(screen.queryByText("Step 18 of 18")).not.toBeInTheDocument();
  });

  it("groups only consecutive jobs with the same message for display", () => {
    render(
      <ProgressView
        fillCompletion={false}
        intro="I’ll keep you updated as I generate the title report."
        jobs={[
          { jobId: "first", message: "Retrieving Report...", phase: "completed" },
          { jobId: "second", message: "Retrieving Report...", phase: "started" },
          { jobId: "third", message: "Generating Report...", phase: "started" },
          { jobId: "fourth", message: "Retrieving Report...", phase: "started" },
        ]}
        process="GENERATING TITLE REPORT"
      />,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

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
    expect(screen.getByTestId("progress-intro").firstElementChild).toHaveAttribute("style", expect.stringContaining("border: 1px solid var(--primary-dark)"));
    expect(screen.getByTestId("progress-intro").firstElementChild).toHaveStyle({
      backgroundColor: "var(--gray-50)",
      color: "var(--primary-dark)",
    });
    const rows = within(screen.getByRole("list", { name: "GENERATING TITLE REPORT updates" })).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByLabelText("Completed")).toHaveStyle({
      backgroundColor: "#ECFDF3",
      border: "1px solid #15803D",
      color: "#15803D",
    });
    expect(within(rows[0]).getByTestId("progress-connector")).toHaveStyle({ borderLeftColor: "var(--gray-300)" });
    expect(within(rows[1]).getByLabelText("In progress")).toHaveAttribute("style", expect.stringContaining("border: 1px solid var(--primary-dark)"));
    expect(within(rows[1]).getByLabelText("In progress")).toHaveStyle({
      backgroundColor: "var(--gray-50)",
      color: "var(--primary-dark)",
    });
    expect(within(rows[1]).getByText("Generating Report..").parentElement).toHaveStyle({ backgroundColor: "var(--accent-surface)" });
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
    expect(within(rows[1]).getByLabelText("Completed")).toHaveAttribute("style", expect.stringContaining("border: 1px solid var(--primary-dark)"));
    expect(within(rows[1]).getByLabelText("Completed")).toHaveStyle({
      backgroundColor: "var(--gray-50)",
      color: "var(--primary-dark)",
      height: "2.5rem",
      width: "2.5rem",
    });
    expect(within(rows[0]).getByText("Indexes retrieved.").parentElement).toHaveStyle({ backgroundColor: "#ECFDF3" });
    expect(within(rows[1]).getByText("Title report ready.").parentElement).toHaveStyle({ backgroundColor: "var(--accent-surface)" });
  });
});
