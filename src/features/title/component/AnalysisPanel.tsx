import * as Progress from "@radix-ui/react-progress";
import { analysisStyles } from "../style/analysisStyles";
import { useAnalysis } from "../hook/useAnalysis";
import { useAnalysisStore } from "../store/analysisStore";
import type { AnalysisPanelProps } from "../type/analysis.types";
import { ChainPanel } from "./ChainPanel";

export function AnalysisPanel({
  onError,
  onGenerated,
  onSession,
  request,
}: AnalysisPanelProps) {
  const message = useAnalysisStore((state) => state.message);
  const report = useAnalysisStore((state) => state.report);
  const status = useAnalysisStore((state) => state.status);
  const { regenerate } = useAnalysis({ onError, onGenerated, request });

  if (status === "idle" || status === "loading" || !report) {
    return (
      <section aria-label="Title analysis" style={analysisStyles.panel}>
        <div aria-live="polite" style={analysisStyles.loading}>
          <div style={analysisStyles.loadingText}>{message}</div>
          <Progress.Root aria-label="Generating title report" style={analysisStyles.progressRoot}>
            <Progress.Indicator style={analysisStyles.progressIndicator} />
          </Progress.Root>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Title analysis" style={analysisStyles.panel}>
      <div style={analysisStyles.report}>
        <header style={analysisStyles.header}>
          <h2 style={analysisStyles.title}>{report.name}</h2>
          <div style={analysisStyles.headerActions}>
            <span style={analysisStyles.count}>
              ({report.chains.length} chain{report.chains.length === 1 ? "" : "s"})
            </span>
            <button
              aria-label="Regenerate"
              onClick={() => void regenerate()}
              style={analysisStyles.regenerate}
              type="button"
            >
              ↻ Regenerate
            </button>
          </div>
        </header>
        {report.chains.length ? (
          <div style={analysisStyles.chainList}>
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
          <div style={analysisStyles.empty}>No data available.</div>
        )}
      </div>
    </section>
  );
}
