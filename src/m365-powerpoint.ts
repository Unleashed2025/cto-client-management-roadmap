import type PptxGenJS from "pptxgenjs";
import { downloadBlob } from "./download-file";
import {
  CONTROL_SECTIONS,
  PRIORITY,
  TENANT_FIELDS,
  controlSummary,
  finalClass,
  itemCalc,
  pct,
  scenarios,
  sortedRegister,
  type M365State,
} from "./m365-hardening";

const COLORS = { navy: "071A3F", cyan: "00D4FF", purple: "7E3AED", pink: "FF2AA0", slate: "64748B", bg: "EBF8FF", white: "FFFFFF", line: "D9E7F5" };

function rows(headers: string[], body: string[][]): PptxGenJS.TableRow[] {
  return [
    headers.map((header) => ({ text: header, options: { bold: true, color: COLORS.white, fill: { color: COLORS.navy }, valign: "middle" as const } })),
    ...body.map((row) => row.map((cell) => ({ text: cell, options: { color: "1E293B", fill: { color: COLORS.white }, valign: "top" as const } }))),
  ];
}

async function logoDataUrl(): Promise<string | null> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}unleashed-logo-white.png`);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Unable to load report logo", error);
    return null;
  }
}

export async function exportM365PowerPoint(state: M365State, clientName: string) {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  const logo = await logoDataUrl();
  const title = "Microsoft 365 Security Assessment";
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Unleashed";
  pptx.company = "Unleashed";
  pptx.title = `${title} — ${clientName}`;
  pptx.theme = { headFontFace: "Aptos Display", bodyFontFace: "Aptos" };
  let slideNumber = 0;

  const addLogo = (slide: PptxGenJS.Slide) => {
    if (logo) slide.addImage({ data: logo, x: 10.65, y: 0.27, w: 2.15, h: 2.15 * (397 / 1822) });
    else slide.addText("UNLEASHED", { x: 10.65, y: 0.27, w: 2.15, h: 0.32, color: COLORS.white, bold: true, fontSize: 17, align: "right" });
  };
  const addHeader = (slide: PptxGenJS.Slide, heading: string, subtitle: string, color = COLORS.purple) => {
    slideNumber += 1;
    slide.background = { color: COLORS.bg };
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.28, y: 0.18, w: 12.77, h: 0.78, rectRadius: 0.08, fill: { color: COLORS.navy }, line: { color: COLORS.navy } });
    slide.addShape(pptx.ShapeType.rect, { x: 0.52, y: 0.38, w: 0.68, h: 0.37, fill: { color }, line: { color } });
    slide.addText(String(slideNumber).padStart(2, "0"), { x: 0.52, y: 0.42, w: 0.68, h: 0.2, bold: true, fontSize: 10, color: COLORS.navy, align: "center", margin: 0 });
    slide.addText(heading, { x: 1.42, y: 0.31, w: 8.9, h: 0.3, bold: true, fontSize: 20, color: COLORS.white, margin: 0 });
    slide.addText(subtitle, { x: 1.42, y: 0.65, w: 8.9, h: 0.16, fontSize: 8, color: "D8F3FF", margin: 0 });
    addLogo(slide);
  };
  const footer = (slide: PptxGenJS.Slide, text: string) => slide.addText(text, { x: 0.55, y: 7.16, w: 12.2, h: 0.16, fontSize: 7.5, italic: true, color: COLORS.slate, margin: 0 });
  const table = (slide: PptxGenJS.Slide, data: PptxGenJS.TableRow[], opts: Partial<PptxGenJS.TableProps>) =>
    slide.addTable(data, { margin: 0.05, border: { color: COLORS.line, pt: 0.8 }, autoPage: false, ...opts } as PptxGenJS.TableProps);
  const sub = `${clientName} · ${title}`;
  const dash = (v?: string) => v?.trim() || "—";
  const estimate = "Estimated Microsoft Secure Score improvement — not a guaranteed result. Based on Microsoft Secure Score data and Unleashed's assessment.";

  const cover = pptx.addSlide();
  slideNumber += 1;
  cover.background = { color: COLORS.navy };
  addLogo(cover);
  cover.addText(title, { x: 0.65, y: 2.05, w: 10.8, h: 0.75, bold: true, fontSize: 30, color: COLORS.white, margin: 0 });
  cover.addText(clientName, { x: 0.65, y: 3.08, w: 10.7, h: 0.4, fontSize: 20, bold: true, color: COLORS.white, margin: 0 });
  cover.addText(`Generated ${new Date().toLocaleDateString("en-GB")}`, { x: 0.65, y: 3.65, w: 10.5, h: 0.25, fontSize: 11, color: "D8F3FF", margin: 0 });

  const sc = scenarios(state);

  const overview = pptx.addSlide();
  addHeader(overview, "Tenant overview", sub);
  table(overview, rows(["Item", "Detail"], TENANT_FIELDS.map((f) => [f.label, dash(state.tenant[f.k])])), { x: 0.55, y: 1.25, w: 12.2, colW: [3.4, 8.8], rowH: 0.42, fontSize: 10 });

  const scores = pptx.addSlide();
  addHeader(scores, "Secure Score — current and predicted", sub, COLORS.cyan);
  table(scores, rows(["Scenario", "Secure Score", "Improvement"], [
    ["Current", pct(sc.overall.current), "—"],
    ["After priority recommendations", pct(sc.overall.priority), `+${(sc.overall.priority - sc.overall.current).toFixed(1)} percentage points`],
    ["After all recommendations", pct(sc.overall.all), `+${(sc.overall.all - sc.overall.current).toFixed(1)} percentage points`],
    ["Actual after remediation", sc.overall.actual === null ? "—" : pct(sc.overall.actual), sc.overall.actual === null ? "—" : `${(sc.overall.actual - sc.overall.current >= 0 ? "+" : "")}${(sc.overall.actual - sc.overall.current).toFixed(1)} percentage points`],
  ]), { x: 0.55, y: 1.25, w: 12.2, colW: [4.6, 3, 4.6], rowH: 0.45, fontSize: 11 });
  table(scores, rows(["Area", "Current points", "Available", "Current", "After priority", "After all"], [
    ...sc.pillars.map((p) => [p.pillar, String(p.cur), String(p.avail), pct(p.current), pct(p.priority), pct(p.all)]),
    ["Overall", String(sc.cur), String(sc.max), pct(sc.overall.current), pct(sc.overall.priority), pct(sc.overall.all)],
  ]), { x: 0.55, y: 3.6, w: 12.2, colW: [3, 1.8, 1.6, 1.8, 2, 2], rowH: 0.4, fontSize: 10 });
  footer(scores, estimate);

  const dash2 = pptx.addSlide();
  addHeader(dash2, "Secure Score dashboard", sub, COLORS.cyan);
  const dial = (x: number, value: number, label: string, caption: string) => {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    const color = v >= 75 ? "059669" : v >= 50 ? "F59E0B" : "B91C1C";
    dash2.addShape(pptx.ShapeType.roundRect, { x, y: 1.3, w: 3.95, h: 1.75, rectRadius: 0.06, fill: { color: COLORS.white }, line: { color: COLORS.line, pt: 1 } });
    dash2.addChart(pptx.ChartType.doughnut, [{ name: label, labels: [label, "Remaining"], values: [v, 100 - v] }], { x: x + 0.12, y: 1.38, w: 1.6, h: 1.6, holeSize: 72, chartColors: [color, "E2E8F0"], showLegend: false, showLabel: false, showValue: false, showPercent: false, dataBorder: { pt: 0, color: "FFFFFF" } });
    dash2.addText(`${v}%`, { x: x + 0.12, y: 1.9, w: 1.6, h: 0.5, align: "center", bold: true, fontSize: 20, color, margin: 0 });
    dash2.addText(label, { x: x + 1.85, y: 1.75, w: 1.95, h: 0.3, bold: true, fontSize: 13, color: COLORS.navy, margin: 0 });
    dash2.addText(caption, { x: x + 1.85, y: 2.1, w: 1.95, h: 0.6, fontSize: 9, color: COLORS.slate, valign: "top", margin: 0 });
  };
  dial(0.55, sc.overall.current, "Current", "Secure Score today");
  dial(4.675, sc.overall.priority, "After priorities", `+${(sc.overall.priority - sc.overall.current).toFixed(1)} points if priority items are done`);
  dial(8.8, sc.overall.all, "After all", `+${(sc.overall.all - sc.overall.current).toFixed(1)} points if all items are done`);
  const card = (x: number, w: number, heading: string) => {
    dash2.addShape(pptx.ShapeType.roundRect, { x, y: 3.2, w, h: 3.8, rectRadius: 0.06, fill: { color: COLORS.white }, line: { color: COLORS.line, pt: 1 } });
    dash2.addText(heading, { x: x + 0.25, y: 3.32, w: w - 0.5, h: 0.3, bold: true, fontSize: 14, color: COLORS.navy, margin: 0 });
  };
  card(0.55, 7.4, "Secure Score by area");
  card(8.2, 4.55, "Control status");
  const areas = [...sc.pillars].reverse();
  dash2.addChart(pptx.ChartType.bar, [
    { name: "After all", labels: areas.map((p) => p.pillar), values: areas.map((p) => Math.round(p.all * 10) / 10) },
    { name: "After priorities", labels: areas.map((p) => p.pillar), values: areas.map((p) => Math.round(p.priority * 10) / 10) },
    { name: "Current", labels: areas.map((p) => p.pillar), values: areas.map((p) => Math.round(p.current * 10) / 10) },
  ], { x: 0.7, y: 3.65, w: 7.1, h: 3.3, barDir: "bar", barGrouping: "clustered", chartColors: ["00D4FF", "7E3AED", "FF2AA0"], valAxisMinVal: 0, valAxisMaxVal: 100, showValue: true, dataLabelFontSize: 8, dataLabelFormatCode: "0\"%\"", showLegend: true, legendPos: "b", legendFontSize: 9, catAxisLabelFontSize: 10, valAxisLabelFontSize: 9, valGridLine: { color: "E2E8F0", size: 0.5 }, barGapWidthPct: 50 });
  const status = { inPlace: 0, partial: 0, notIn: 0, other: 0 };
  let totalControls = 0;
  for (const section of CONTROL_SECTIONS) {
    const c = controlSummary(state, section);
    status.inPlace += c["In place"]; status.partial += c["Partially in place"]; status.notIn += c["Not in place"];
    totalControls += section.controls.length;
  }
  status.other = totalControls - status.inPlace - status.partial - status.notIn;
  dash2.addChart(pptx.ChartType.doughnut, [{ name: "Controls", labels: ["In place", "Partially in place", "Not in place", "Not assessed / other"], values: [status.inPlace, status.partial, status.notIn, Math.max(0, status.other)] }], { x: 8.35, y: 3.65, w: 4.25, h: 3.3, holeSize: 55, chartColors: ["059669", "F59E0B", "B91C1C", "94A3B8"], showLegend: true, legendPos: "b", legendFontSize: 9, showPercent: false, showValue: true, dataLabelColor: COLORS.white, dataLabelFontSize: 10, dataBorder: { pt: 1, color: "FFFFFF" } });
  footer(dash2, estimate);

  for (const section of CONTROL_SECTIONS) {
    const counts = controlSummary(state, section);
    const slide = pptx.addSlide();
    addHeader(slide, section.title, `${sub} · ${counts["In place"]} in place · ${counts["Partially in place"]} partial · ${counts["Not in place"]} not in place`, COLORS.pink);
    table(slide, rows(["Control", "Status", "Finding / evidence"], section.controls.map((c, i) => {
      const v = state.controls[`${section.id}:${i}`];
      return [c, v?.status || "Not assessed", dash(v?.note)];
    })), { x: 0.55, y: 1.25, w: 12.2, colW: [3.6, 2, 6.6], rowH: 0.5, fontSize: 9.5 });
  }

  const top10 = sortedRegister(state.register.filter((i) => finalClass(i) === PRIORITY)).slice(0, 10);
  top10.forEach((i, idx) => {
    const c = itemCalc(i);
    const slide = pptx.addSlide();
    addHeader(slide, `Priority ${String(idx + 1).padStart(2, "0")}: ${i.action || "Untitled"}`, sub, COLORS.pink);
    table(slide, rows(["Risk", "Microsoft points available", "Estimated gain", "Effort", "User impact"], [[dash(i.risk), String(c.remaining), `+${c.gain}`, dash(i.effort), dash(i.impact)]]), { x: 0.55, y: 1.25, w: 12.2, rowH: 0.4, fontSize: 11 });
    table(slide, rows(["Topic", "Detail"], [
      ["Current situation", dash(i.finding || i.currentConfig)],
      ["Why this matters", dash(i.riskText)],
      ["Unleashed recommendation", dash(i.recommendation)],
      ["Expected outcome", `Estimated Secure Score movement of +${c.gain} points. ${i.implNotes ? `Notes: ${i.implNotes}` : ""}`.trim()],
    ]), { x: 0.55, y: 2.45, w: 12.2, colW: [2.6, 9.6], rowH: [0.38, 0.85, 0.85, 0.85, 0.85], fontSize: 10.5 });
    footer(slide, estimate);
  });

  const rest = sortedRegister(state.register.filter((i) => !top10.includes(i)));
  for (let start = 0; start < Math.max(rest.length, 1); start += 10) {
    const slide = pptx.addSlide();
    addHeader(slide, "Remaining recommendations", sub, COLORS.cyan);
    table(slide, rows(["Recommendation", "Risk", "Available pts", "Est. gain", "Effort", "Priority"], rest.slice(start, start + 10).map((i) => {
      const c = itemCalc(i);
      return [i.action || "Untitled", dash(i.risk), String(c.remaining), `+${c.gain}`, dash(i.effort), finalClass(i)];
    })), { x: 0.55, y: 1.25, w: 12.2, colW: [4.6, 1.2, 1.5, 1.3, 1.5, 2.1], rowH: 0.45, fontSize: 10 });
    footer(slide, estimate);
  }

  const delivery = pptx.addSlide();
  addHeader(delivery, "Delivery tracker", sub, COLORS.purple);
  table(delivery, rows(["Improvement", "Owner", "Status", "Target date", "Predicted gain", "Actual points"], sortedRegister(state.register).slice(0, 12).map((i) => [i.action || "Untitled", dash(i.owner), dash(i.status), dash(i.target), `+${itemCalc(i).gain}`, dash(i.actualPts)])), { x: 0.55, y: 1.25, w: 12.2, colW: [4.4, 1.8, 1.5, 1.6, 1.4, 1.5], rowH: 0.42, fontSize: 10 });
  footer(delivery, `Unleashed assessment: current ${pct(sc.overall.current)} · predicted after priority remediation ${pct(sc.overall.priority)} · actual ${sc.overall.actual === null ? "to be recorded" : pct(sc.overall.actual)}.`);

  const output = await pptx.write({ outputType: "blob", compression: true });
  if (!(output instanceof Blob)) throw new Error("PowerPoint generation did not return a downloadable file.");
  downloadBlob(output, `Unleashed-M365-Security-${clientName.replace(/[^a-z0-9]+/gi, "-")}-${new Date().toISOString().slice(0, 10)}.pptx`);
}
