import { getParcelOptions } from "aurorra-index";
import type {
  AnalysisBadge,
  AnalysisBatchData,
  AnalysisChain,
  AnalysisError,
  AnalysisRecord,
  AnalysisReport,
  AnalysisRow,
  AnalysisWorkerClient,
} from "../type/analysis.types";

type SourceRecord = Record<string, unknown>;

const issues = [
  { key: "missing_heirs", label: "Missing Heirs" },
  { key: "fraud_forgery", label: "Fraud/Forgery" },
  { key: "clerical_errors", label: "Clerical Errors" },
  { key: "breaks_irregularities", label: "Breaks/Irregularities" },
  { key: "linkage_breaks", label: "Linkage Breaks" },
  { key: "number_date_party_mismatch", label: "Number/Date/Party Mismatches" },
  { key: "misindexed_suspected", label: "Misindexed/Suspected" },
  { key: "correction_needed", label: "Correction Needed" },
  { key: "improvements", label: "Improvements needed", emptyLabel: "No improvements needed." },
] as const;

function cleanText(value: unknown): string {
  return value === undefined || value === null ? "" : String(value).trim();
}

function stripHtml(value: unknown): string {
  return cleanText(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toBatchName(value: unknown): string {
  if (value && typeof value === "object" && "name" in value) {
    return cleanText((value as { name?: unknown }).name);
  }
  return cleanText(value);
}

function sanitizeBatchName(value: unknown): string {
  return toBatchName(value)
    .replace(/[<>:"/\\|?*]/g, "_")
    .replace(/^[\s.]+|[\s.]+$/g, "")
    .replace(/_+/g, "_");
}

function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined && item !== null)
      .map(cleanText);
  }
  if (typeof value === "string" || typeof value === "number") {
    const item = cleanText(value);
    return item ? [item] : [];
  }
  return [];
}

function normalizeRows(value: unknown): AnalysisRow[] {
  return Array.isArray(value)
    ? value.filter((row): row is AnalysisRow => Boolean(row) && typeof row === "object")
    : [];
}

function completeness(value: unknown): AnalysisBadge {
  if (value === null || value === undefined || value === "") {
    return { background: null, color: null, text: "" };
  }
  let percent: number | null = null;
  if (typeof value === "number") {
    percent = Math.round(value >= 0 && value <= 1 ? value * 100 : value);
  } else if (typeof value === "string") {
    const text = value.trim();
    const number = Number(text.endsWith("%") ? text.slice(0, -1) : text);
    if (Number.isFinite(number)) {
      percent = Math.round(!text.endsWith("%") && number >= 0 && number <= 1 ? number * 100 : number);
    }
  }
  if (percent === null) {
    return { background: null, color: null, text: "" };
  }
  if (percent < 80) {
    return { background: "#fee2e2", color: "#991b1b", text: `${percent}%` };
  }
  if (percent < 95) {
    return { background: "#fff7ed", color: "#9a3412", text: `${percent}%` };
  }
  return { background: "#e8f5e9", color: "#166534", text: `${percent}%` };
}

function breaks(value: unknown): AnalysisBadge {
  const number = typeof value === "number" ? value : Number(cleanText(value));
  if (!value || value === "None" || value === "0" || number === 0) {
    return { background: "#e8f5e9", color: "#166534", text: "None" };
  }
  if (Number.isFinite(number)) {
    return { background: "#fee2e2", color: "#991b1b", text: String(number) };
  }
  return { background: null, color: null, text: cleanText(value) };
}

function formatDate(value: unknown): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatSummary(value: unknown): string[] {
  const text = cleanText(value);
  if (!text) return [];
  return text
    .replace(/\. The/g, ".\nThe")
    .replace(/\. All/g, ".\nAll")
    .replace(/\. Marketability/g, ".\nMarketability")
    .replace(/\. No/g, ".\nNo")
    .split("\n");
}

function formatExplanation(value: unknown): string {
  return stripHtml(value)
    .replace(/^This is the current\s+/i, "This is ")
    .replace(/^Current document;\s*/i, "")
    .replace(/^\s*present\s*/i, "");
}

function prepareRecord(record: SourceRecord, chainIndex: number, recordIndex: number): AnalysisRecord {
  const className = cleanText(record.class);
  const identifiers = Array.isArray(record.identifiers)
    ? record.identifiers.filter((item): item is SourceRecord => Boolean(item) && typeof item === "object")
    : [];
  const details = [
    { label: "Role", value: record.role },
    { label: "Address", value: record.address },
    { label: "Parcel", value: record.number },
    { label: "Lot/Blocks", value: record.lotblocks },
    { label: "PLSS", value: record.plss },
    { label: "Metes/Bounds", value: record.metesbounds },
    { label: "Plats Ref", value: record.platsref },
    { label: "Docs Ref", value: record.docsref },
    { label: "Source", value: record.source },
    { label: "Page", value: record.page },
    { label: "Status", value: record.status },
  ]
    .map((item) => ({ label: item.label, value: cleanText(item.value) }))
    .filter((item) => item.value);
  const session = cleanText(record.session);

  return {
    className,
    code: cleanText(record.code),
    date: cleanText(record.date),
    details,
    explanation: formatExplanation(record.explanation),
    hasSession: Boolean(record.session),
    id: `record-${chainIndex}-${recordIndex}`,
    identifiers: [{ key: "class", value: className }, ...identifiers.map((item) => ({
      key: cleanText(item.key),
      value: cleanText(item.value),
    }))].filter((item) => item.key || item.value),
    required: cleanText(record.required).toUpperCase() === "YES",
    session: session || null,
    title: stripHtml(record.title),
  };
}

function prepareChain(source: SourceRecord, index: number): AnalysisChain {
  const title = cleanText(source.title) || `Chain ${index + 1}`;
  const records = Array.isArray(source.records)
    ? source.records.filter((record): record is SourceRecord => Boolean(record) && typeof record === "object")
    : [];

  return {
    breaks: breaks(source.breaks_gaps),
    completeness: completeness(source.completeness),
    conveyances: normalizeRows(source.conveyance),
    earliestSource: formatDate(source.earliest_source),
    encumbrances: normalizeRows(source.encumbrance),
    issues: issues.map((issue) => {
      const values = normalizeList(source[issue.key]);
      return {
        color: values.length === 0 ? "green" : values.length > 1 ? "red" : "orange",
        label: values.length > 0
          ? issue.label
          : ("emptyLabel" in issue ? issue.emptyLabel : `No ${issue.label} Found`),
        values,
      };
    }),
    lastUpdated: formatDate(source.last_updated),
    mapAddress: title,
    mortgages: normalizeRows(source.mortgage),
    records: records.map((record, recordIndex) => prepareRecord(record, index, recordIndex)),
    root: cleanText(source.root_of_title_ref) || "No root of title reference found.",
    summary: formatSummary(source.explanation),
    title,
  };
}

export function toAnalysisError(error: unknown, message: string): AnalysisError {
  const source = error as Partial<AnalysisError> & { message?: unknown };
  return {
    code: source?.code,
    details: source?.details,
    error: cleanText(source?.error || source?.message) || message,
    status: source?.status,
  };
}

export function prepareAnalysis(data: unknown, name: string): AnalysisReport {
  const chains = Array.isArray(data)
    ? data.filter((chain): chain is SourceRecord => Boolean(chain) && typeof chain === "object")
    : [];
  return {
    chains: chains.map(prepareChain),
    name: cleanText(name) || "Document Chain Set",
  };
}

export async function loadBatchData(
  client: AnalysisWorkerClient,
  token: string,
  session: string,
  current: unknown,
): Promise<AnalysisBatchData> {
  if (!session) {
    throw { code: "SESSION_MISSING", error: "Session is missing." } satisfies AnalysisError;
  }
  const metadata = await client.metadata(token, session);
  if (!Array.isArray(metadata?.indexes)) {
    throw {
      code: "METADATA_INDEXES_MISSING",
      error: "Metadata or indexes are missing.",
    } satisfies AnalysisError;
  }
  const parcel = getParcelOptions(metadata.indexes);
  return {
    address: cleanText(parcel.parcel_address),
    current: toBatchName(current),
    parcelId: cleanText(parcel.parcel_id),
    reference: cleanText(parcel.parcel_reference),
  };
}

export async function submitSession(
  client: AnalysisWorkerClient,
  token: string,
  batch: unknown,
  session: string,
): Promise<string> {
  const name = sanitizeBatchName(batch);
  if (!name) {
    throw { code: "BATCH_NAME_REQ", error: "Batch name is required." } satisfies AnalysisError;
  }
  if (!session) {
    throw { code: "SESSION_MISSING", error: "Session is missing." } satisfies AnalysisError;
  }
  await client.submit(token, name, session);
  return session;
}
