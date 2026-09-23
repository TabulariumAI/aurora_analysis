import { progressMessageStyles, progressPhaseStyles, progressStyles } from "../style/progress.styles";
import type { ProgressCount, ProgressJob, ProgressPhase, ProgressViewProps } from "../type/progress.types";

const motion = `
  @keyframes progressview-spin { to { transform: rotate(360deg); } }
  @keyframes progressview-pulse { 50% { box-shadow: 0 0 0 0.55rem rgba(0, 139, 163, 0); } }
  @keyframes progressview-indeterminate { 50% { opacity: 0.75; } }
  .progressview-active { animation: progressview-spin 0.9s linear infinite; }
  .progressview-active-ring { animation: progressview-pulse 1.8s ease-out infinite; }
  .progressview-indeterminate { animation: progressview-indeterminate 1.8s ease-in-out infinite; opacity: 0.55; width: 100%; }
  @media (prefers-reduced-motion: reduce) {
    .progressview-active, .progressview-active-ring, .progressview-indeterminate { animation: none; opacity: 0.55; }
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

type ProgressGroup = {
  current: ProgressJob;
  jobId: string;
  members: readonly ProgressJob[];
  message: string;
  phase: ProgressPhase;
};

function groupProgressJobs(jobs: readonly ProgressJob[]): readonly ProgressGroup[] {
  const groups: ProgressGroup[] = [];
  for (const job of jobs) {
    const previous = groups.at(-1);
    if (!previous || previous.message !== job.message) {
      groups.push({ current: job, jobId: job.jobId, members: [job], message: job.message, phase: job.phase });
      continue;
    }
    const members = [...previous.members, job];
    groups[groups.length - 1] = {
      ...previous,
      current: job,
      members,
      phase: members.some((member) => member.phase === "failed")
        ? "failed"
        : members.some((member) => member.phase === "started") ? "started" : job.phase,
    };
  }
  return groups;
}

function getCount(progress: ProgressCount | null | undefined) {
  if (!progress || !Number.isFinite(progress.completed) || !Number.isFinite(progress.total)
    || !Number.isInteger(progress.completed) || !Number.isInteger(progress.total) || progress.total <= 0) return undefined;
  return { completed: Math.min(Math.max(progress.completed, 0), progress.total), total: progress.total, unit: progress.unit };
}

function countText(count: NonNullable<ReturnType<typeof getCount>>) {
  if (count.unit === "pages") return `Page ${count.completed} of ${count.total}`;
  if (count.unit === "sessions") return `Session ${count.completed} of ${count.total}`;
  if (count.unit === "steps") return `Step ${count.completed} of ${count.total}`;
  return `${count.completed} of ${count.total} pages prepared`;
}

function countLabel(message: string, count: NonNullable<ReturnType<typeof getCount>>) {
  if (count.unit === "sessions") return "Linking sessions";
  if (count.unit === "prepared-pages" || count.unit === undefined) return "Pages prepared";
  return message;
}

export function ProgressView({ completion, completionJobId, fillCompletion, intro, jobs, process }: ProgressViewProps) {
  const groups = groupProgressJobs(jobs);
  const lastIndex = groups.length - 1;
  const completionMember = completionJobId == null ? jobs.at(-1) : jobs.find((job) => job.jobId === completionJobId);
  const completionIndex = completionMember == null ? -1 : groups.findIndex((group) => group.members.some((member) => member.jobId === completionMember.jobId));
  const completionVisible = completion != null && completionMember?.phase === "completed";
  const fillsCompletion = fillCompletion && completionVisible && completionIndex === lastIndex && groups[lastIndex]?.phase === "completed";

  return (
    <section aria-label={process} aria-live="polite" data-panel-scroll="true" data-testid="progress-view" style={progressStyles.root}>
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
          data-panel-scroll={fillsCompletion ? "true" : undefined}
          style={fillsCompletion ? {
            ...progressStyles.timeline,
            ...progressStyles.fillTimeline,
            gridTemplateRows: lastIndex > 0 ? `repeat(${lastIndex}, auto) minmax(0, 1fr)` : "minmax(0, 1fr)",
          } : progressStyles.timeline}
        >
          {groups.map((group, index) => {
            const fillsRow = fillsCompletion && index === lastIndex;
            const count = group.phase === "completed" ? undefined : getCount(group.current.progress);
            const indeterminate = group.phase === "started"
              && group.members.length > 1
              && group.members.every((member) => member.progress === undefined);
            return (
              <li data-phase={group.phase} key={group.jobId} style={fillsRow ? { ...progressStyles.row, ...progressStyles.fillRow } : progressStyles.row}>
                {index < lastIndex ? <span data-testid="progress-connector" style={progressStyles.connector} /> : null}
                <span
                  aria-current={group.phase === "started" ? "step" : undefined}
                  aria-label={group.phase === "started" ? "In progress" : group.phase === "completed" ? "Completed" : "Failed"}
                  className={group.phase === "started" ? "progressview-active-ring" : undefined}
                  style={{ ...progressStyles.icon, ...progressPhaseStyles[group.phase], ...(index === lastIndex && group.phase === "completed" ? progressStyles.finalIcon : {}) }}
                >
                  <ProgressIcon final={index === lastIndex} phase={group.phase} />
                </span>
                <div style={{ ...progressStyles.message, ...progressMessageStyles[group.phase], ...(index === lastIndex && group.phase === "completed" ? progressStyles.finalMessage : {}), ...(fillsRow ? progressStyles.fillMessage : {}) }}>
                  <span style={progressStyles.messageCopy}>{group.message}</span>
                  {count ? <><span style={progressStyles.pageCount}>{countText(count)}</span><div aria-label={countLabel(group.message, count)} aria-valuemax={count.total} aria-valuemin={0} aria-valuenow={count.completed} aria-valuetext={countText(count)} role="progressbar" style={progressStyles.bar}><span style={{ ...progressStyles.fill, width: `${100 * count.completed / count.total}%` }} /></div></> : null}
                  {indeterminate ? <div aria-label={group.message} role="progressbar" style={progressStyles.bar}><span className="progressview-indeterminate" style={progressStyles.fill} /></div> : null}
                  {group.members.filter((member) => member.phase === "failed").map((member) => <span key={member.jobId} role="alert" style={progressStyles.error}>{member.error}</span>)}
                  {completionVisible && index === completionIndex ? <div style={fillsRow ? { ...progressStyles.completion, ...progressStyles.fillCompletion } : progressStyles.completion}>{completion}</div> : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
