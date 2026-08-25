import { progressMessageStyles, progressPhaseStyles, progressStyles } from "../style/progress.styles";
import type { ProgressPhase, ProgressViewProps } from "../type/progress.types";

const motion = `
  @keyframes progressview-spin { to { transform: rotate(360deg); } }
  @keyframes progressview-pulse { 50% { box-shadow: 0 0 0 0.55rem rgba(0, 139, 163, 0); } }
  .progressview-active { animation: progressview-spin 0.9s linear infinite; }
  .progressview-active-ring { animation: progressview-pulse 1.8s ease-out infinite; }
  @media (prefers-reduced-motion: reduce) {
    .progressview-active, .progressview-active-ring { animation: none; }
  }
`;

function ProgressIcon({ final, phase }: { final: boolean; phase: ProgressPhase }) {
  if (phase === "started") {
    return (
      <svg aria-hidden="true" className="progressview-active" data-testid="progress-spinner" fill="none" height="34" viewBox="0 0 24 24" width="34">
        <circle cx="12" cy="12" opacity="0.24" r="8.5" stroke="currentColor" strokeWidth="2.2" />
        <path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
      </svg>
    );
  }
  if (phase === "completed") {
    if (final) {
      return (
        <svg aria-hidden="true" data-testid="progress-success-star" fill="none" height="20" viewBox="0 0 24 24" width="20">
          <path d="m12 2.5 2.8 5.7 6.3.9-4.6 4.5 1.1 6.3-5.6-3-5.6 3 1.1-6.3-4.6-4.5 6.3-.9L12 2.5Z" fill="currentColor" />
        </svg>
      );
    }
    return (
      <svg aria-hidden="true" data-testid="progress-completed-check" fill="none" height="20" viewBox="0 0 24 24" width="20">
        <path d="m7.5 12.2 3 3 6-6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" fill="none" height="20" viewBox="0 0 24 24" width="20">
      <path d="m8.5 8.5 7 7m0-7-7 7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" />
    </svg>
  );
}

export function ProgressView({ completion, completionJobId, fillCompletion, intro, jobs, process }: ProgressViewProps) {
  const lastIndex = jobs.length - 1;
  const completionIndex = completionJobId == null ? lastIndex : jobs.findIndex((job) => job.jobId === completionJobId);
  const fillsCompletion = fillCompletion && completion != null && completionIndex === lastIndex && jobs[lastIndex]?.phase === "completed";

  return (
    <section aria-label={process} aria-live="polite" data-testid="progress-view" style={progressStyles.root}>
      <style>{motion}</style>
      <div data-testid="progress-content" style={fillsCompletion ? { ...progressStyles.content, ...progressStyles.fillContent } : progressStyles.content}>
        <p data-testid="progress-caption" style={progressStyles.caption}>{process}</p>
        <div data-testid="progress-intro" style={progressStyles.intro}>
          <span aria-hidden="true" style={progressStyles.avatar}>
            <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
              <path d="M12 3.5 13.7 9l5.3 1.8-5.3 1.8L12 18l-1.7-5.4L5 10.8 10.3 9 12 3.5Z" fill="currentColor" />
            </svg>
          </span>
          {jobs.length > 0 ? <span aria-hidden="true" data-testid="progress-intro-connector" style={progressStyles.introConnector} /> : null}
          <p style={progressStyles.introCopy}>{intro}</p>
        </div>
        <ol
          aria-label={`${process} updates`}
          style={fillsCompletion ? {
            ...progressStyles.timeline,
            ...progressStyles.fillTimeline,
            gridTemplateRows: lastIndex > 0 ? `repeat(${lastIndex}, auto) minmax(0, 1fr)` : "minmax(0, 1fr)",
          } : progressStyles.timeline}
        >
          {jobs.map((job, index) => {
            const fillsRow = fillsCompletion && index === lastIndex;
            return (
              <li data-phase={job.phase} key={job.jobId} style={fillsRow ? { ...progressStyles.row, ...progressStyles.fillRow } : progressStyles.row}>
                {index < lastIndex ? <span data-testid="progress-connector" style={progressStyles.connector} /> : null}
                <span
                  aria-current={job.phase === "started" ? "step" : undefined}
                  aria-label={job.phase === "started" ? "In progress" : job.phase === "completed" ? "Completed" : "Failed"}
                  className={job.phase === "started" ? "progressview-active-ring" : undefined}
                  style={{ ...progressStyles.icon, ...progressPhaseStyles[job.phase], ...(index === lastIndex && job.phase === "completed" ? progressStyles.finalIcon : {}) }}
                >
                  <ProgressIcon final={index === lastIndex} phase={job.phase} />
                </span>
                <div style={{ ...progressStyles.message, ...progressMessageStyles[job.phase], ...(index === lastIndex && job.phase === "completed" ? progressStyles.finalMessage : {}), ...(fillsRow ? progressStyles.fillMessage : {}) }}>
                  <span style={progressStyles.messageCopy}>{job.message}</span>
                  {job.phase === "failed" ? <span role="alert" style={progressStyles.error}>{job.error}</span> : null}
                  {completion && index === completionIndex && job.phase === "completed" ? <div style={fillsRow ? { ...progressStyles.completion, ...progressStyles.fillCompletion } : progressStyles.completion}>{completion}</div> : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
