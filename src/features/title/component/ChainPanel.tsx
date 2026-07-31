import * as Collapsible from "@radix-ui/react-collapsible";
import type { ReactNode } from "react";
import { analysisStyles } from "../style/analysisStyles";
import type {
  AnalysisChain,
  AnalysisRow,
} from "../type/analysis.types";

type ChainPanelProps = {
  chain: AnalysisChain;
  first: boolean;
  multiple: boolean;
  onSession(session: string): void;
};

type TableColumn = {
  field: string;
  label: string;
  width: string;
};

function InfoBlock({
  children,
  color = "#f4f4fa",
  label,
}: {
  children: ReactNode;
  color?: string;
  label: string;
}) {
  return (
    <section>
      <div style={analysisStyles.caption}>{label}</div>
      <div style={analysisStyles.infoBody(color)}>{children}</div>
    </section>
  );
}

function DataTable({
  columns,
  empty,
  label,
  rows,
}: {
  columns: TableColumn[];
  empty: string;
  label: string;
  rows: AnalysisRow[];
}) {
  if (!rows.length) {
    return <InfoBlock label={label}>{empty}</InfoBlock>;
  }
  return (
    <div style={analysisStyles.tableWrap}>
      <table style={analysisStyles.table}>
        <caption style={analysisStyles.tableCaption}>{label}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.field} style={{ ...analysisStyles.tableHead, width: column.width }}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column.field} style={analysisStyles.tableCell}>
                  {String(row[column.field] || "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChainBody({ chain, onSession }: Pick<ChainPanelProps, "chain" | "onSession">) {
  return (
    <div style={analysisStyles.chainBody}>
      <div style={analysisStyles.mapCard}>
        <iframe
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer"
          src={`https://www.google.com/maps?q=${encodeURIComponent(chain.mapAddress)}&output=embed&maptype=roadmap`}
          style={analysisStyles.mapFrame}
          title={`Map for ${chain.title}`}
        />
      </div>

      <div style={analysisStyles.tableWrap}>
        <table style={analysisStyles.statusTable}>
          <thead>
            <tr>
              {["Completeness", "Breaks/Gaps", "Last Updated", "Earliest Source"].map((label) => (
                <th key={label} style={{ ...analysisStyles.tableHead, textAlign: "center" }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...analysisStyles.tableCell, textAlign: "center" }}>
                {chain.completeness.text ? (
                  <span style={analysisStyles.badge(
                    chain.completeness.background,
                    chain.completeness.color,
                  )}>
                    {chain.completeness.text}
                  </span>
                ) : null}
              </td>
              <td style={{ ...analysisStyles.tableCell, textAlign: "center" }}>
                {chain.breaks.text ? (
                  <span style={analysisStyles.badge(
                    chain.breaks.background,
                    chain.breaks.color,
                  )}>
                    {chain.breaks.text}
                  </span>
                ) : null}
              </td>
              <td style={{ ...analysisStyles.tableCell, textAlign: "center" }}>
                {chain.lastUpdated}
              </td>
              <td style={{ ...analysisStyles.tableCell, textAlign: "center" }}>
                {chain.earliestSource}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={analysisStyles.tableWrap}>
        <table style={analysisStyles.table}>
          <caption style={analysisStyles.tableCaption}>Records in Chain</caption>
          <thead>
            <tr>
              <th style={{ ...analysisStyles.tableHead, width: "25%" }}>Title</th>
              <th style={{ ...analysisStyles.tableHead, width: "60%" }}>Explanation</th>
              <th style={{ ...analysisStyles.tableHead, width: "15%" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {chain.records.map((record) => {
              const borderColor = record.hasSession
                ? "green"
                : record.code
                  ? record.required ? "red" : "orange"
                  : record.required ? "orange" : "silver";
              const explanation = record.explanation
                ? record.explanation.charAt(0).toUpperCase() + record.explanation.slice(1)
                : "";
              return (
                <tr key={record.id}>
                  <td style={{
                    ...analysisStyles.tableCell,
                    borderLeft: `0.15rem solid ${borderColor}`,
                    lineHeight: 1.4,
                    whiteSpace: "pre-line",
                  }}>
                    {record.date ? `${record.title}\nRecorded at ${record.date}` : record.title}
                  </td>
                  <td style={analysisStyles.tableCell}>
                    <div style={analysisStyles.recordCode}>{record.code}</div>
                    <div style={analysisStyles.recordExplanation}>{explanation}</div>
                    {record.identifiers.length ? (
                      <ul style={analysisStyles.recordList}>
                        {record.identifiers.map((identifier, index) => (
                          <li key={`${identifier.key}-${index}`}>
                            {identifier.key || "id"}: {identifier.value}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {record.details.length ? (
                      <>
                        <div style={analysisStyles.detailLabel}>Details</div>
                        <ul style={analysisStyles.recordList}>
                          {record.details.map((detail) => (
                            <li key={detail.label}>{detail.label}: {detail.value}</li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </td>
                  <td style={analysisStyles.tableCell}>
                    {record.session ? (
                      <button
                        onClick={() => onSession(record.session as string)}
                        style={analysisStyles.link}
                        type="button"
                      >
                        View
                      </button>
                    ) : (
                      <span style={analysisStyles.recordMissing}>
                        The {record.className || "record"} record is not present.
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <InfoBlock label="Chain Summary">
        {chain.summary.map((line, index) => (
          <span key={index} style={{ display: "block" }}>
            {line.startsWith("No ") ? <><strong>No</strong>{line.slice(2)}</> : line}
          </span>
        ))}
      </InfoBlock>
      <InfoBlock label="Root of Title Reference">{chain.root}</InfoBlock>

      {chain.issues.map((issue) => (
        issue.values.length ? (
          <InfoBlock color={issue.color} key={issue.label} label={issue.label}>
            {issue.values.join(" | ")}
          </InfoBlock>
        ) : (
          <div key={issue.label} style={analysisStyles.issueEmpty}>{issue.label}</div>
        )
      ))}

      <DataTable
        columns={[
          { field: "date", label: "Date", width: "18%" },
          { field: "grantees", label: "Grantees", width: "24%" },
          { field: "grantors", label: "Grantors", width: "24%" },
          { field: "title_company", label: "Title Company", width: "20%" },
          { field: "amount", label: "Amount", width: "14%" },
        ]}
        empty="No conveyance data available."
        label="Conveyance"
        rows={chain.conveyances}
      />
      <DataTable
        columns={[
          { field: "date", label: "Date", width: "18%" },
          { field: "borrowers", label: "Borrowers", width: "24%" },
          { field: "lender", label: "Lender", width: "24%" },
          { field: "status", label: "Status", width: "20%" },
          { field: "amount", label: "Amount", width: "14%" },
        ]}
        empty="No mortgage data available."
        label="Mortgage"
        rows={chain.mortgages}
      />
      <DataTable
        columns={[
          { field: "date", label: "Date", width: "18%" },
          { field: "parties", label: "Parties", width: "24%" },
          { field: "enc_type", label: "Type", width: "24%" },
          { field: "status", label: "Status", width: "20%" },
          { field: "amount", label: "Amount", width: "14%" },
        ]}
        empty="No encumbrance data available."
        label="Encumbrance"
        rows={chain.encumbrances}
      />
    </div>
  );
}

export function ChainPanel({
  chain,
  first,
  multiple,
  onSession,
}: ChainPanelProps) {
  if (!multiple) {
    return (
      <section style={analysisStyles.chainSection}>
        <ChainBody chain={chain} onSession={onSession} />
      </section>
    );
  }
  return (
    <Collapsible.Root defaultOpen={first} style={analysisStyles.chainSection}>
      <Collapsible.Trigger asChild>
        <button style={analysisStyles.chainTrigger} type="button">{chain.title}</button>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <ChainBody chain={chain} onSession={onSession} />
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
