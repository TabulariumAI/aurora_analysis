import { describe, expect, it } from "vitest";
import { titleReportStyles } from "../style/titleReportStyles";

describe("title report styles", () => {
  it("uses the workspace card hierarchy and action target", () => {
    expect(titleReportStyles.caption).toMatchObject({ color: "var(--primary)" });
    expect(titleReportStyles.chainSection).toMatchObject({
      background: "var(--white)",
      border: "1px solid var(--border-card)",
      borderRadius: "var(--radius-card)",
      boxShadow: "var(--shadow-card)",
    });
    expect(titleReportStyles.chainTrigger).toMatchObject({
      background: "var(--gray-100)",
      color: "var(--title-ink)",
      minHeight: "2.75rem",
    });
  });
});
