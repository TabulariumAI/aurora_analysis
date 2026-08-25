import { useEffect } from "react";
import { ProgressView } from "../../progressview/component/ProgressView";
import { useProgress } from "../../progressview/hook/useProgress";
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
}: TitleReportPanelProps) {
  const report = useTitleReportStore((state) => state.report);
  const status = useTitleReportStore((state) => state.status);
  const progress = useProgress(request.batch);
  const { regenerate } = useTitleReport({
    onError,
    onGenerated,
    onProgress: progress.receive,
    request,
    resetProgress: progress.reset,
  });

  useEffect(() => {
    onReadyChange(status !== "idle");
  }, [onReadyChange, status]);

  useEffect(() => {
    onLoaderChange?.(null);
  }, [onLoaderChange]);

  const inProgress = status === "idle" || status === "loading" || !report;

  return (
    <section aria-label="Title report content" style={titleReportStyles.panel}>
      <div data-title-report-controls="true" style={titleReportStyles.header}>
        <strong style={titleReportStyles.title}>{report?.name ?? request.batch}</strong>
        <div style={titleReportStyles.headerActions}>
          {report ? (
            <span style={titleReportStyles.count}>
              ({report.chains.length} chain{report.chains.length === 1 ? "" : "s"})
            </span>
          ) : null}
          {report ? (
            <button
              aria-label="Regenerate"
              onClick={() => void regenerate()}
              style={titleReportStyles.regenerate}
              type="button"
            >
              ↻ Regenerate
            </button>
          ) : null}
        </div>
      </div>
      {inProgress ? (
        <ProgressView
          fillCompletion={false}
          intro="I’ll keep you updated as I generate the title report."
          jobs={progress.jobs}
          process="GENERATING TITLE REPORT"
        />
      ) : (
        <div style={titleReportStyles.report}>
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
      )}
    </section>
  );
}
