import type { CSSProperties } from "react";
import type { ProgressPhase } from "../type/progress.types";

export const progressStyles = {
  root: {
    width: "100%",
    height: "100%",
    minHeight: "0",
    overflowY: "auto",
    boxSizing: "border-box",
  },
  content: {
    width: "100%",
    maxWidth: "42rem",
    minHeight: "0",
    display: "grid",
    gap: "1.35rem",
    margin: "0 auto",
    padding: "clamp(1.5rem, 4vh, 3rem) clamp(1.25rem, 6vw, 4rem) 3rem",
    boxSizing: "border-box",
    textAlign: "left",
  },
  caption: {
    margin: "0 0 -0.55rem 3.6rem",
    color: "var(--slate-500)",
    fontSize: "0.75rem",
    fontWeight: 700,
    letterSpacing: "0.06em",
    lineHeight: "1.35",
    textTransform: "uppercase",
  },
  intro: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "2.75rem minmax(0, 1fr)",
    alignItems: "start",
    gap: "0.85rem",
  },
  avatar: {
    display: "inline-grid",
    width: "2.5rem",
    height: "2.5rem",
    placeItems: "center",
    borderRadius: "var(--radius-pill)",
    backgroundColor: "var(--gray-50)",
    border: "1px solid var(--primary-dark)",
    color: "var(--primary-dark)",
    position: "relative",
    zIndex: 1,
  },
  introConnector: {
    position: "absolute",
    top: "2.5rem",
    bottom: "-1.35rem",
    left: "1.34rem",
    borderLeftStyle: "dotted",
    borderLeftWidth: "2px",
    borderLeftColor: "var(--gray-300)",
  },
  introCopy: {
    margin: "0",
    padding: "0.7rem 0.95rem",
    borderRadius: "var(--radius-card)",
    backgroundColor: "var(--accent-surface)",
    color: "var(--body-ink)",
    fontSize: "0.98rem",
    lineHeight: "1.5",
  },
  timeline: {
    display: "grid",
    width: "100%",
    margin: "0",
    padding: "0",
    listStyle: "none",
  },
  row: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "2.75rem minmax(0, 1fr)",
    alignItems: "start",
    minHeight: "4.9rem",
    gap: "0.85rem",
  },
  connector: {
    position: "absolute",
    top: "2.5rem",
    bottom: "-0.15rem",
    left: "1.34rem",
    borderLeftStyle: "dotted",
    borderLeftWidth: "2px",
    borderLeftColor: "var(--gray-300)",
  },
  icon: {
    position: "relative",
    zIndex: 1,
    display: "inline-grid",
    width: "2.5rem",
    height: "2.5rem",
    justifySelf: "center",
    placeItems: "center",
    borderRadius: "var(--radius-pill)",
    boxSizing: "border-box",
  },
  finalIcon: {
    backgroundColor: "var(--gray-50)",
    border: "1px solid var(--primary-dark)",
    color: "var(--primary-dark)",
  },
  finalMessage: {
    backgroundColor: "var(--accent-surface)",
  },
  message: {
    display: "grid",
    minWidth: "0",
    gap: "0.28rem",
    margin: "0 0 1.15rem",
    padding: "0.72rem 0.9rem",
    borderRadius: "var(--radius-card)",
    fontSize: "1rem",
    fontWeight: 600,
    lineHeight: "1.45",
    boxSizing: "border-box",
  },
  messageCopy: {
    color: "var(--title-ink)",
  },
  error: {
    color: "#b42318",
    fontSize: "0.88rem",
    fontWeight: 500,
    lineHeight: "1.45",
    overflowWrap: "anywhere",
  },
  completion: {
    display: "grid",
    minWidth: "0",
    width: "100%",
    marginTop: "0.35rem",
  },
  fillContent: {
    height: "100%",
    gridTemplateRows: "auto auto minmax(0, 1fr)",
  },
  fillTimeline: {
    minHeight: 0,
    overflowY: "auto",
  },
  fillRow: {
    alignItems: "stretch",
    minHeight: 0,
    overflow: "hidden",
  },
  fillMessage: {
    gridTemplateRows: "auto minmax(0, 1fr)",
    minHeight: 0,
    overflow: "hidden",
  },
  fillCompletion: {
    height: "100%",
    minHeight: 0,
    overflow: "hidden",
  },
} satisfies Record<string, CSSProperties>;

export const progressPhaseStyles: Record<ProgressPhase, CSSProperties> = {
  started: {
    width: "3.25rem",
    height: "3.25rem",
    backgroundColor: "var(--gray-50)",
    border: "1px solid var(--primary-dark)",
    boxShadow: "0 0 0 0.3rem rgba(0, 93, 108, 0.12)",
    color: "var(--primary-dark)",
  },
  completed: {
    backgroundColor: "#ECFDF3",
    border: "1px solid #15803D",
    color: "#15803D",
  },
  failed: {
    backgroundColor: "#FEF2F2",
    color: "#991B1B",
  },
};

export const progressMessageStyles: Record<ProgressPhase, CSSProperties> = {
  started: {
    backgroundColor: "var(--accent-surface)",
  },
  completed: {
    backgroundColor: "#ECFDF3",
  },
  failed: {
    backgroundColor: "#FEF2F2",
  },
};
