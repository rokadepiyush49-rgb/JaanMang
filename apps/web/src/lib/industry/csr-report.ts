import type { CompanyProfile } from "./types";
import type { CsrPositionDto } from "./service";

/**
 * The CSR statement, rendered in the browser.
 *
 * Printed rather than generated as a binary. Opening a print window with a
 * stylesheet gives a real PDF through the browser's own "Save as PDF", on every
 * platform, with no dependency and no 300 kB of PDF library in the bundle — and
 * the thing a finance team actually does with this document is print it.
 *
 * Every figure comes from `/industry/csr`, which sums the sponsorships this
 * company approved and the benefits attached to them. Nothing on the statement
 * is entered by the company: a CSR disclosure whose numbers the discloser typed
 * is a disclosure worth nothing, and this one can be checked line by line
 * against the government's own ledger.
 */

const money = (v: number) =>
  `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const DOC_STATUS: Record<string, string> = {
  not_started: "Not started",
  drafted: "Drafted",
  submitted: "Submitted",
  certified: "Certified",
  filed: "Filed",
};

export function csrStatementHtml(company: CompanyProfile, position: CsrPositionDto): string {
  const rows = position.benefits
    .map(
      (b) => `
      <tr>
        <td>${escapeHtml(b.title)}</td>
        <td>${escapeHtml(b.problemId)}</td>
        <td>${escapeHtml(b.scheduleViiItem ?? `Section ${b.qualifyingSection}`)}</td>
        <td class="n">${money(b.amount)}</td>
        <td class="n">${money(b.estimatedRelief)}</td>
        <td>${DOC_STATUS[b.documentation] ?? b.documentation}${
          b.certificateNo ? `<br /><span class="muted">${escapeHtml(b.certificateNo)}</span>` : ""
        }</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>CSR statement — ${escapeHtml(company.name)} — ${escapeHtml(position.financialYear)}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font: 11pt/1.5 "Georgia", "Times New Roman", serif; color: #16181d; margin: 0; }
  h1 { font-size: 17pt; margin: 0 0 2mm; }
  h2 { font-size: 11pt; text-transform: uppercase; letter-spacing: .08em; margin: 9mm 0 3mm; color: #555f6d; }
  .sub { color: #555f6d; margin: 0 0 7mm; font-size: 10pt; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  th { text-align: left; border-bottom: 1.2pt solid #16181d; padding: 2mm 2mm 1.5mm; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .05em; }
  td { border-bottom: .4pt solid #d7dae0; padding: 2mm; vertical-align: top; }
  td.n, th.n { text-align: right; white-space: nowrap; }
  .muted { color: #767f8c; font-size: 8.5pt; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; }
  .cell { border: .4pt solid #d7dae0; padding: 3mm; }
  .cell .k { font-size: 8pt; text-transform: uppercase; letter-spacing: .05em; color: #555f6d; }
  .cell .v { font-size: 13pt; margin-top: 1mm; }
  footer { margin-top: 10mm; border-top: .4pt solid #d7dae0; padding-top: 3mm; font-size: 8.5pt; color: #555f6d; }
  @media print { .noprint { display: none; } }
</style>
</head>
<body>
  <h1>Corporate Social Responsibility statement</h1>
  <p class="sub">
    ${escapeHtml(company.legalName || company.name)} · Financial year ${escapeHtml(position.financialYear)}<br />
    Prepared ${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })} from verified project records on Jan Setu
  </p>

  <div class="grid">
    <div class="cell"><div class="k">Allocated</div><div class="v">${money(position.allocated)}</div></div>
    <div class="cell"><div class="k">Committed</div><div class="v">${money(position.committed)}</div></div>
    <div class="cell"><div class="k">Unspent</div><div class="v">${money(position.remaining)}</div></div>
    <div class="cell"><div class="k">Estimated relief</div><div class="v">${money(position.estimatedRelief)}</div></div>
  </div>

  <h2>Projects funded</h2>
  ${
    rows
      ? `<table>
    <thead>
      <tr>
        <th>Project</th><th>Reference</th><th>Schedule VII head</th>
        <th class="n">Committed</th><th class="n">Relief</th><th>Documentation</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`
      : `<p class="muted">No sponsorships were approved in this financial year.</p>`
  }

  <h2>Basis of preparation</h2>
  <p class="muted">
    Every figure above is the sum of sponsorships this company approved through Jan Setu and the
    benefits recorded against them. None of it is self-reported: each project reference resolves to
    a citizen problem the district government validated, and each committed amount appears in the
    public funding ledger under the same reference. ${position.certified} of
    ${position.certified + position.outstanding} utilisation certificates are filed.
  </p>
  <p class="muted">
    This statement is a record of what was committed and delivered. It is not a tax computation and
    does not constitute professional advice; the relief figures are estimates for planning.
  </p>

  <footer>
    Jan Setu · ${escapeHtml(company.name)} · ${escapeHtml(position.financialYear)} ·
    Generated ${new Date().toISOString()}
  </footer>

  <p class="noprint" style="margin-top:8mm">
    <button onclick="window.print()" style="font:inherit;padding:2mm 4mm">Print or save as PDF</button>
  </p>
</body>
</html>`;
}

/**
 * Open the statement in a print window.
 *
 * A new window rather than a download: the sandboxed download paths a browser
 * offers for generated content are the ones most likely to be blocked, and a
 * print view the user can read before committing to a file is better anyway.
 */
export function openCsrStatement(company: CompanyProfile, position: CsrPositionDto): boolean {
  const win = window.open("", "_blank", "noopener,width=900,height=1200");
  if (!win) return false;
  win.document.write(csrStatementHtml(company, position));
  win.document.close();
  return true;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
