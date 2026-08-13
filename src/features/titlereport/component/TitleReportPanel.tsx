import { useEffect } from "react";
import { titleReportStyles } from "../style/titleReportStyles";
import { useTitleReport } from "../hook/useTitleReport";
import { useTitleReportStore } from "../store/titleReportStore";
import type { TitleReportPanelProps } from "../type/titleReport.types";
import { ChainPanel } from "./ChainPanel";

export function TitleReportPanel({
  onError,
  onGenerated,
  onLoaderChange,
  onReadyChange,
  onSession,
  request,
  titleAction,
}: TitleReportPanelProps) {
  const message = useTitleReportStore((state) => state.message);
  const report = useTitleReportStore((state) => state.report);
  const status = useTitleReportStore((state) => state.status);
  const { regenerate } = useTitleReport({ onError, onGenerated, request });

  useEffect(() => {
    onReadyChange(status !== "idle" && status !== "loading");
  }, [onReadyChange, status]);

  useEffect(() => {
    onLoaderChange?.(status === "idle" || status === "loading" ? (message ? [message] : null) : null);
  }, [message, onLoaderChange, status]);

  if (status === "idle" || status === "loading" || !report) {
    return <section aria-label="Title report content" style={titleReportStyles.panel} />;
  }

  return (
    <section aria-label="Title report content" style={titleReportStyles.panel}>
      <div style={titleReportStyles.report}>
        <header style={titleReportStyles.header}>
          <h2 style={titleReportStyles.title}>{report.name}</h2>
          <div style={titleReportStyles.headerActions}>
            <span style={titleReportStyles.count}>
              ({report.chains.length} chain{report.chains.length === 1 ? "" : "s"})
            </span>
            <button
              aria-label="Regenerate"
              onClick={() => void regenerate()}
              style={titleReportStyles.regenerate}
              type="button"
            >
              ↻ Regenerate
            </button>
            {titleAction}
          </div>
        </header>
        {report.chains.length ? (
          <div style={titleReportStyles.chainList}>
            {report.chains.map((chain, index) => (
              <ChainPanel
                chain={chain}
                first={index === 0}
                key={`${chain.title}-${index}`}
                multiple={report.chains.length > 1}
                onSession={onSession}
              />
            ))}
          </div>
        ) : (
          <div style={titleReportStyles.empty}>No data available.</div>
        )}
      </div>
    </section>
  );
}
