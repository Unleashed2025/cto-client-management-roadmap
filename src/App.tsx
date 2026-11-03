"use client";

import * as React from "react";
import { Download, FileSpreadsheet, Plus, RefreshCcw, ShieldCheck, Trash2 } from "lucide-react";

type AuditCategory = "data-infra" | "network" | "client-compute" | "software" | "cyber" | "other";

type AuditRow = {
  id: string;
  category: AuditCategory;
  subcategory: string;
  name: string;
  supplier: string;
  status: string;
  notes: string;
  flagged: boolean;
};

const CATEGORY_LABEL: Record<AuditCategory, string> = {
  "data-infra": "Data Infrastructure",
  network: "Network Infrastructure",
  "client-compute": "Client Compute",
  software: "Software",
  cyber: "Cyber Controls",
  other: "Other",
};

const BRAND = {
  navy: [7, 26, 63] as [number, number, number],
  cyan: [0, 212, 255] as [number, number, number],
  purple: [126, 58, 237] as [number, number, number],
  pink: [255, 42, 160] as [number, number, number],
  orange: [248, 140, 34] as [number, number, number],
  bg: [235, 248, 255] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  slate: [82, 97, 115] as [number, number, number],
  line: [217, 231, 245] as [number, number, number],
};

function normalise(value: unknown) {
  return String(value ?? "").trim();
}

function slugText(value: unknown) {
  return normalise(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function inferCategory(sheetName: string, headers: string[]): AuditCategory {
  const text = slugText([sheetName, ...headers].join(" "));
  if (/(server|san|data infra|infrastructure|virtual machine|vmware|hyper v)/.test(text)) return "data-infra";
  if (/(network|switch|firewall|wifi|wi fi|wireless|access point|ap)/.test(text)) return "network";
  if (/(client compute|laptop|desktop|tablet|ipad|chromebook|device category)/.test(text)) return "client-compute";
  if (/(software|system|application|licen[cs]e)/.test(text)) return "software";
  if (/(cyber|mfa|backup|control|security|installed)/.test(text)) return "cyber";
  return "other";
}

function inferSubcategory(category: AuditCategory, rowText: string) {
  const text = slugText(rowText);
  if (category === "data-infra") {
    if (/san switch|fibre channel|fiber channel|brocade/.test(text)) return "SAN switches";
    if (/san|storage|powerstore|powervault|unity|nimble|msa/.test(text)) return "SAN storage";
    if (/virtual|vmware|hyper v|\bvm\b/.test(text)) return "VMs / virtual machines";
    return "Physical servers";
  }
  if (category === "network") {
    if (/core/.test(text) && /switch/.test(text)) return "Core switches";
    if (/edge/.test(text) && /switch/.test(text)) return "Edge switches";
    if (/firewall|fortigate|sonicwall|watchguard|palo alto/.test(text)) return "Firewalls";
    if (/wifi|wi fi|wireless|access point|\bap\b|unifi|ruckus|aruba/.test(text)) return "Wi-Fi access points";
    return "Other network";
  }
  if (category === "client-compute") {
    if (/managed/.test(text) && /laptop/.test(text)) return "Managed laptops";
    if (/laptop|notebook/.test(text)) return "Laptops";
    if (/desktop|\bpc\b/.test(text)) return "Desktops";
    if (/ipad/.test(text)) return "iPads";
    if (/tablet/.test(text)) return "Tablets";
    if (/chromebook/.test(text)) return "Chromebooks";
    if (/unmanaged/.test(text)) return "Unmanaged";
    return "Other";
  }
  return "";
}

function looksFlagged(rowText: string) {
  const text = slugText(rowText);
  return /(flag|expired|end of life|eol|eosl|out of support|unsupported|unknown|partial|not installed|\bno\b|critical|high|fail|missing|risk)/.test(text);
}

function pickField(record: Record<string, unknown>, patterns: RegExp[]) {
  const entry = Object.entries(record).find(([key]) => patterns.some((pattern) => pattern.test(slugText(key))));
  return normalise(entry?.[1]);
}

function buildRowsFromRecords(sheetName: string, records: Record<string, unknown>[]) {
  if (records.length === 0) return [];
  const headers = Object.keys(records[0] ?? {});
  const category = inferCategory(sheetName, headers);

  return records
    .map((record, index): AuditRow | null => {
      const rowText = Object.values(record).map(normalise).filter(Boolean).join(" ");
      if (!rowText || rowText.length < 3) return null;
      const name =
        pickField(record, [/name|device|asset|server|control|software|system|application|category|area/]) ||
        normalise(Object.values(record).find(Boolean)) ||
        `${sheetName} row ${index + 1}`;
      const supplier = pickField(record, [/supplier|vendor|manufacturer|make|model|solution|coverage/]);
      const status = pickField(record, [/status|installed|risk|priority|support|warranty|lifecycle|score/]);
      const notes = pickField(record, [/note|comment|finding|reason|remediation|action|evidence/]);
      return {
        id: crypto.randomUUID(),
        category,
        subcategory: inferSubcategory(category, `${name} ${supplier} ${status} ${notes} ${rowText}`),
        name,
        supplier,
        status,
        notes,
        flagged: looksFlagged(`${status} ${notes} ${rowText}`),
      };
    })
    .filter((row): row is AuditRow => row != null);
}

function emptyRow(): AuditRow {
  return {
    id: crypto.randomUUID(),
    category: "data-infra",
    subcategory: "Physical servers",
    name: "",
    supplier: "",
    status: "",
    notes: "",
    flagged: false,
  };
}

export function AuditBuilder() {
  const [clientName, setClientName] = React.useState("Temporary audit");
  const [rows, setRows] = React.useState<AuditRow[]>([]);
  const [categoryFilter, setCategoryFilter] = React.useState<AuditCategory | "all">("all");
  const [status, setStatus] = React.useState("No data is stored. This temporary audit resets when the page is closed or refreshed.");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const visibleRows = categoryFilter === "all" ? rows : rows.filter((row) => row.category === categoryFilter);
  const flaggedRows = rows.filter((row) => row.flagged);
  const categories = (Object.keys(CATEGORY_LABEL) as AuditCategory[]).filter((category) => rows.some((row) => row.category === category));

  async function handleUpload(file: File | null) {
    if (!file) return;
    if (!/\.(xlsx|xls|xlsm|xlsb|csv)$/i.test(file.name)) {
      setStatus("Choose an Excel workbook or CSV file (.xlsx, .xls, .xlsm, .xlsb, or .csv).");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setStatus("Reading spreadsheet in this browser session...");
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      let populatedSheets = 0;
      const parsedRows = workbook.SheetNames.flatMap((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
        const sheetRows = buildRowsFromRecords(sheetName, records);
        if (sheetRows.length > 0) populatedSheets += 1;
        return sheetRows;
      });
      setRows(parsedRows);
      setClientName(file.name.replace(/\.(xlsx|xls|xlsm|xlsb|csv)$/i, "") || "Temporary audit");
      setStatus(
        `Loaded ${parsedRows.length.toLocaleString("en-GB")} line item(s) from ${populatedSheets.toLocaleString("en-GB")} populated sheet(s) locally. Nothing was saved to the core app.`,
      );
    } catch (error) {
      console.error("Unable to read audit workbook", error);
      setRows([]);
      setStatus("This spreadsheet could not be read. Check that the file is a valid Excel workbook or CSV and try again.");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function updateRow(id: string, patch: Partial<AuditRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function resetBuilder() {
    setRows([]);
    setClientName("Temporary audit");
    setCategoryFilter("all");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setStatus("Reset complete. No temporary audit data remains on this page.");
  }

  async function exportReport() {
    const [{ default: jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const autoTable = autoTableModule.default;
    const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 40;
    let logoDataUrl: string | null = null;
    try {
      const logo = await fetch(`${import.meta.env.BASE_URL}unleashed-logo-white.png`);
      const blob = await logo.blob();
      logoDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      logoDataUrl = null;
    }

    const drawLogo = (x: number, y: number, w: number) => {
      if (!logoDataUrl) return;
      doc.addImage(logoDataUrl, "PNG", x, y, w, w * (397 / 1822));
    };
    const drawHeader = (page: number, title: string) => {
      doc.setFillColor(...BRAND.bg);
      doc.rect(0, 0, pageWidth, pageHeight, "F");
      const x = 18;
      const y = 14;
      const w = pageWidth - 36;
      const h = 58;
      doc.setFillColor(...BRAND.navy);
      doc.roundedRect(x, y, w, h, 7, 7, "F");
      doc.setFillColor(...BRAND.cyan);
      doc.rect(x + 16, y + 15, 50, 28, "F");
      doc.setTextColor(...BRAND.navy);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(String(page).padStart(2, "0"), x + 41, y + 33, { align: "center" });
      doc.setTextColor(...BRAND.white);
      doc.setFontSize(19);
      doc.text(title, x + 78, y + 31, { maxWidth: w - 365 });
      drawLogo(x + w - 210, y + 12, 180);
      const stripeW = w / 3;
      doc.setFillColor(...BRAND.cyan);
      doc.rect(x, y + h, stripeW, 4, "F");
      doc.setFillColor(...BRAND.purple);
      doc.rect(x + stripeW, y + h, stripeW, 4, "F");
      doc.setFillColor(...BRAND.pink);
      doc.rect(x + stripeW * 2, y + h, w - stripeW * 2, 4, "F");
    };

    doc.setFillColor(...BRAND.navy);
    doc.rect(0, 0, pageWidth, pageHeight, "F");
    doc.setFillColor(10, 92, 174);
    doc.ellipse(pageWidth - 105, -12, 118, 118, "F");
    doc.setFillColor(...BRAND.pink);
    doc.ellipse(55, pageHeight + 6, 96, 96, "F");
    drawLogo(pageWidth - 300, 58, 240);
    doc.setFillColor(...BRAND.cyan);
    doc.roundedRect(margin, 92, 124, 28, 5, 5, "F");
    doc.setTextColor(...BRAND.navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("AUDIT BUILDER", margin + 62, 110, { align: "center" });
    doc.setTextColor(...BRAND.white);
    doc.setFontSize(32);
    doc.text("Temporary audit report", margin, 200);
    doc.setFontSize(16);
    doc.text(clientName, margin, 245, { maxWidth: pageWidth - margin * 2 });
    doc.setFontSize(10);
    doc.setTextColor(216, 243, 255);
    doc.text(`Generated ${new Date().toLocaleDateString("en-GB")}`, margin, 280);
    doc.setTextColor(...BRAND.cyan);
    doc.text("No audit data was saved to the Lifecycle app.", margin, pageHeight - 40);

    let page = 1;
    for (const category of categories) {
      const categoryRows = rows.filter((row) => row.category === category);
      const categoryFlagged = categoryRows.filter((row) => row.flagged);
      page += 1;
      doc.addPage();
      drawHeader(page, `${CATEGORY_LABEL[category]} — highlights`);
      const y = 110;
      const tileGap = 18;
      const tileW = (pageWidth - margin * 2 - tileGap * 3) / 4;
      [
        { label: "Items audited", value: categoryRows.length, c: BRAND.navy },
        { label: "Flagged", value: categoryFlagged.length, c: BRAND.pink },
        { label: "Healthy", value: categoryRows.length - categoryFlagged.length, c: BRAND.purple },
        { label: "Flag rate", value: categoryRows.length ? `${Math.round((categoryFlagged.length / categoryRows.length) * 100)}%` : "0%", c: BRAND.orange },
      ].forEach((tile, index) => {
        const x = margin + index * (tileW + tileGap);
        doc.setFillColor(...tile.c);
        doc.roundedRect(x, y, tileW, 72, 12, 12, "F");
        doc.setTextColor(...BRAND.white);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.text(String(tile.value), x + 14, y + 32);
        doc.setFontSize(7);
        doc.text(tile.label.toUpperCase(), x + 14, y + 58);
      });

      page += 1;
      doc.addPage();
      drawHeader(page, `${CATEGORY_LABEL[category]} — inventory`);
      autoTable(doc, {
        startY: 112,
        head: [["Subcategory", "Item", "Supplier / Model", "Status", "Flagged", "Notes"]],
        body: categoryRows.map((row) => [
          row.subcategory || "—",
          row.name,
          row.supplier || "Not recorded",
          row.status || "Review",
          row.flagged ? "Yes" : "No",
          row.notes || "—",
        ]),
        theme: "grid",
        headStyles: { fillColor: BRAND.navy, textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 7, cellPadding: 3, valign: "top" },
        margin: { left: margin, right: margin, top: 50 },
        columnStyles: {
          0: { cellWidth: 90 },
          1: { cellWidth: 145 },
          2: { cellWidth: 125 },
          3: { cellWidth: 70 },
          4: { cellWidth: 50 },
          5: { cellWidth: pageWidth - margin * 2 - 90 - 145 - 125 - 70 - 50 },
        },
      });

      page += 1;
      doc.addPage();
      drawHeader(page, `${CATEGORY_LABEL[category]} — strategy`);
      const cardW = (pageWidth - margin * 2 - 24) / 2;
      const drawCard = (x: number, yPos: number, w: number, h: number, title: string, text: string, fill: [number, number, number], dark = false) => {
        doc.setFillColor(...fill);
        doc.roundedRect(x, yPos, w, h, 16, 16, "F");
        doc.setTextColor(...(dark ? BRAND.white : BRAND.navy));
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(title, x + 22, yPos + 32);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(doc.splitTextToSize(text, w - 44), x + 22, yPos + 58);
      };
      drawCard(margin, 112, cardW, 135, "What this means", `${categoryFlagged.length} of ${categoryRows.length} audited item(s) need attention or review. Use the inventory extract to validate ownership, lifecycle, supplier and remediation detail.`, BRAND.white);
      drawCard(margin + cardW + 24, 112, cardW, 135, "What if we do nothing", "Risk, supportability and cost exposure remain unmanaged. Unsupported or incomplete items should be reviewed before they become operational incidents or project blockers.", [10, 92, 174], true);
      const roadmapW = (pageWidth - margin * 2 - 44) / 3;
      [
        ["3 months", "Validate the flagged items, confirm ownership, and agree quick wins."],
        ["12 months", "Convert priority remediation into budgeted projects and refresh cycles."],
        ["2 years", "Move to a repeatable lifecycle review and annual audit cadence."],
      ].forEach(([title, text], index) => {
        drawCard(margin + index * (roadmapW + 22), 282, roadmapW, 145, title, text, BRAND.white);
      });
    }

    doc.save(`${clientName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "audit"}-temporary-audit-report.pdf`);
  }

  return (
    <main className="min-h-screen bg-[#EBF8FF] px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[28px] bg-[#071A3F] p-8 text-white shadow-2xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-[#00D4FF]">Temporary audit link</p>
              <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] md:text-6xl">Audit Builder</h1>
              <p className="mt-4 max-w-3xl text-sm font-semibold text-blue-100">
                Upload, edit, add line items, and generate a branded audit report without saving anything to the core Lifecycle app.
              </p>
            </div>
            <img src={`${import.meta.env.BASE_URL}unleashed-logo-white.png`} alt="Unleashed" className="h-auto w-64 max-w-full object-contain" />
          </div>
          <div className="mt-8 grid h-2 grid-cols-3 overflow-hidden rounded-full">
            <div className="bg-[#00D4FF]" />
            <div className="bg-[#7E3AED]" />
            <div className="bg-[#FF28A0]" />
          </div>
        </section>

        <section className="grid gap-4 rounded-[28px] bg-white/90 p-5 shadow-xl ring-1 ring-[#D9E7F5] lg:grid-cols-[1.2fr_1fr_auto_auto] lg:items-end">
          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-600">Audit / client name</span>
            <input value={clientName} onChange={(event) => setClientName(event.target.value)} className="w-full rounded-2xl border border-[#D9E7F5] px-4 py-3 font-bold outline-none focus:border-[#00D4FF]" />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-600">Upload spreadsheet</span>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.xlsm,.xlsb,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void handleUpload(event.target.files?.[0] ?? null)} className="w-full rounded-2xl border border-dashed border-[#7E3AED] bg-[#EBF8FF] px-4 py-3 text-sm font-bold" />
          </label>
          <button onClick={() => setRows((current) => [emptyRow(), ...current])} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#7E3AED] px-5 py-3 text-sm font-black text-white">
            <Plus className="size-4" /> Add line
          </button>
          <button onClick={exportReport} disabled={rows.length === 0} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FF28A0] px-5 py-3 text-sm font-black text-white disabled:opacity-40">
            <Download className="size-4" /> Report
          </button>
        </section>

        <p className="rounded-2xl bg-white/80 px-5 py-3 text-sm font-bold text-slate-600 ring-1 ring-[#D9E7F5]">{status}</p>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            ["Items audited", rows.length, "bg-[#071A3F]"],
            ["Flagged", flaggedRows.length, "bg-[#FF28A0]"],
            ["Categories", categories.length, "bg-[#7E3AED]"],
            ["Stored records", 0, "bg-[#00D4FF] text-[#071A3F]"],
          ].map(([label, value, className]) => (
            <div key={String(label)} className={`rounded-[24px] p-6 text-white shadow-lg ${className}`}>
              <div className="text-3xl font-black">{String(value)}</div>
              <div className="mt-6 text-xs font-black uppercase tracking-[0.16em]">{String(label)}</div>
            </div>
          ))}
        </section>

        <section className="rounded-[28px] bg-white/95 p-5 shadow-xl ring-1 ring-[#D9E7F5]">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-black tracking-[-0.04em]">Temporary audit line items</h2>
              <p className="text-sm font-semibold text-slate-500">Edits only live on this page. Refreshing or closing the link clears them.</p>
            </div>
            <div className="flex gap-2">
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as AuditCategory | "all")} className="rounded-2xl border border-[#D9E7F5] px-3 py-2 text-sm font-bold">
                <option value="all">All categories</option>
                {(Object.keys(CATEGORY_LABEL) as AuditCategory[]).map((category) => (
                  <option key={category} value={category}>{CATEGORY_LABEL[category]}</option>
                ))}
              </select>
              <button onClick={resetBuilder} className="inline-flex items-center gap-2 rounded-2xl border border-[#D9E7F5] px-4 py-2 text-sm font-black text-slate-700">
                <RefreshCcw className="size-4" /> Reset
              </button>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[24px] border border-dashed border-[#D9E7F5] bg-[#EBF8FF] p-12 text-center">
              <FileSpreadsheet className="size-12 text-[#7E3AED]" />
              <h3 className="mt-4 text-xl font-black">Upload a workbook to begin</h3>
              <p className="mt-2 max-w-xl text-sm font-semibold text-slate-600">
                The audit builder parses spreadsheet rows locally, lets the auditor amend them, and generates a report without touching the saved Lifecycle client data.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full border-separate border-spacing-y-2 text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.16em] text-slate-500">
                  <tr>
                    <th className="px-3">Category</th>
                    <th className="px-3">Subcategory</th>
                    <th className="px-3">Item</th>
                    <th className="px-3">Supplier / Model</th>
                    <th className="px-3">Status</th>
                    <th className="px-3">Flagged</th>
                    <th className="px-3">Notes</th>
                    <th className="px-3" />
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr key={row.id} className="bg-[#F8FCFF] align-top shadow-sm">
                      <td className="rounded-l-2xl p-2">
                        <select value={row.category} onChange={(event) => updateRow(row.id, { category: event.target.value as AuditCategory })} className="w-44 rounded-xl border border-[#D9E7F5] px-2 py-2 font-semibold">
                          {(Object.keys(CATEGORY_LABEL) as AuditCategory[]).map((category) => (
                            <option key={category} value={category}>{CATEGORY_LABEL[category]}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2"><input value={row.subcategory} onChange={(event) => updateRow(row.id, { subcategory: event.target.value })} className="w-40 rounded-xl border border-[#D9E7F5] px-2 py-2" /></td>
                      <td className="p-2"><input value={row.name} onChange={(event) => updateRow(row.id, { name: event.target.value })} className="w-52 rounded-xl border border-[#D9E7F5] px-2 py-2" /></td>
                      <td className="p-2"><input value={row.supplier} onChange={(event) => updateRow(row.id, { supplier: event.target.value })} className="w-44 rounded-xl border border-[#D9E7F5] px-2 py-2" /></td>
                      <td className="p-2"><input value={row.status} onChange={(event) => updateRow(row.id, { status: event.target.value })} className="w-36 rounded-xl border border-[#D9E7F5] px-2 py-2" /></td>
                      <td className="p-2 text-center">
                        <input type="checkbox" checked={row.flagged} onChange={(event) => updateRow(row.id, { flagged: event.target.checked })} className="mt-3 size-5 accent-[#FF28A0]" />
                      </td>
                      <td className="p-2"><textarea value={row.notes} onChange={(event) => updateRow(row.id, { notes: event.target.value })} className="h-12 w-64 rounded-xl border border-[#D9E7F5] px-2 py-2" /></td>
                      <td className="rounded-r-2xl p-2">
                        <button onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} className="rounded-xl p-2 text-[#FF28A0] hover:bg-[#FFEAF7]">
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="flex items-center gap-3 rounded-[24px] bg-[#071A3F] p-5 text-sm font-bold text-white">
          <ShieldCheck className="size-5 text-[#00D4FF]" />
          This link is intentionally isolated: it uses in-page temporary state, does not call the import API, and does not create or update clients, sites, assets, projects, or reports in the core app.
        </section>
      </div>
    </main>
  );
}
