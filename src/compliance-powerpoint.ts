import type PptxGenJS from "pptxgenjs";
import type { AssessmentAnswer, AssessmentDepth, BenchmarkDefinition } from "./compliance-benchmarks";
import { AI_ORGANISATION_FIELDS, AI_SCORE_RATINGS, calculateAiReadiness, type AiScoreValue } from "./ai-data-readiness";
import { downloadBlob } from "./download-file";

const COLORS = {
  navy: "071A3F",
  cyan: "00D4FF",
  purple: "7E3AED",
  pink: "FF2AA0",
  orange: "F88C22",
  slate: "64748B",
  bg: "EBF8FF",
  white: "FFFFFF",
  line: "D9E7F5",
};

type BenchmarkResponse = { answer: AssessmentAnswer; evidence: string; score?: AiScoreValue };

function scoreLabel(score: AiScoreValue): string {
  if (score === "na") return "N/A";
  if (score === null || score === undefined) return "Not scored";
  return `${score} – ${AI_SCORE_RATINGS[score]?.label ?? ""}`;
}

function answerLabel(answer: AssessmentAnswer): string {
  return {
    "not-assessed": "Not assessed",
    pass: "Pass",
    partial: "Partial",
    fail: "Fail",
    "not-applicable": "Not applicable",
  }[answer];
}

function tableRows(headers: string[], rows: string[][]): PptxGenJS.TableRow[] {
  return [
    headers.map((header) => ({
      text: header,
      options: { bold: true, color: COLORS.white, fill: { color: COLORS.navy }, valign: "middle" as const },
    })),
    ...rows.map((row) => row.map((cell) => ({ text: cell, options: { color: "1E293B", fill: { color: COLORS.white }, valign: "top" as const } }))),
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
    console.error("Unable to load compliance report logo", error);
    return null;
  }
}

export async function exportCompliancePowerPoint(
  benchmark: BenchmarkDefinition,
  responses: Record<string, BenchmarkResponse>,
  clientName: string,
  cisTier: 1 | 2 | 3,
  assessmentDepth: AssessmentDepth,
  organisation: Record<string, string> = {},
) {
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  const logo = await logoDataUrl();
  const assessmentLabel = assessmentDepth === "pre" ? "Pre-readiness assessment" : "Full readiness assessment";
  const sourceQuestions = assessmentDepth === "pre" ? benchmark.preQuestions : benchmark.fullQuestions;
  const questions = sourceQuestions.filter((question) => benchmark.id !== "cis" || assessmentDepth === "pre" || (question.tier ?? 1) <= cisTier);
  const sections = [...new Set(questions.map((question) => question.section))];
  const counts = questions.reduce((summary, question) => {
    const answer = responses[question.id]?.answer ?? "not-assessed";
    summary[answer] += 1;
    return summary;
  }, { "not-assessed": 0, pass: 0, partial: 0, fail: 0, "not-applicable": 0 } as Record<AssessmentAnswer, number>);
  const assessed = counts.pass + counts.partial + counts.fail + counts["not-applicable"];
  const applicable = questions.length - counts["not-applicable"];
  const readiness = applicable > 0 ? Math.round(((counts.pass + counts.partial * 0.5) / applicable) * 100) : 0;
  const passReady = questions.length > 0 && assessed === questions.length && counts.partial === 0 && counts.fail === 0;
  const maturity = benchmark.scoring === "maturity";
  const aiResult = maturity ? calculateAiReadiness(questions, (id) => responses[id]?.score) : null;

  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Unleashed";
  pptx.company = "Unleashed";
  pptx.subject = `${benchmark.title} ${assessmentLabel.toLowerCase()}`;
  pptx.title = `${benchmark.title} — ${assessmentLabel} — ${clientName}`;
  pptx.theme = { headFontFace: "Aptos Display", bodyFontFace: "Aptos" };
  let slideNumber = 0;

  const addLogo = (slide: PptxGenJS.Slide) => {
    if (logo) slide.addImage({ data: logo, x: 10.65, y: 0.27, w: 2.15, h: 2.15 * (397 / 1822) });
    else slide.addText("UNLEASHED", { x: 10.65, y: 0.27, w: 2.15, h: 0.32, color: COLORS.white, bold: true, fontSize: 17, align: "right" });
  };
  const addHeader = (slide: PptxGenJS.Slide, title: string, subtitle: string, color = COLORS.purple) => {
    slideNumber += 1;
    slide.background = { color: COLORS.bg };
    slide.addShape(pptx.ShapeType.roundRect, { x: 0.28, y: 0.18, w: 12.77, h: 0.78, rectRadius: 0.08, fill: { color: COLORS.navy }, line: { color: COLORS.navy } });
    slide.addShape(pptx.ShapeType.rect, { x: 0.52, y: 0.38, w: 0.68, h: 0.37, fill: { color }, line: { color } });
    slide.addText(String(slideNumber).padStart(2, "0"), { x: 0.52, y: 0.42, w: 0.68, h: 0.2, bold: true, fontSize: 10, color: COLORS.navy, align: "center", margin: 0 });
    slide.addText(title, { x: 1.42, y: 0.31, w: 8.5, h: 0.3, bold: true, fontSize: 20, color: COLORS.white, margin: 0 });
    slide.addText(subtitle, { x: 1.42, y: 0.65, w: 8.5, h: 0.16, fontSize: 8, color: "D8F3FF", margin: 0 });
    addLogo(slide);
    slide.addShape(pptx.ShapeType.rect, { x: 0.28, y: 0.96, w: 4.26, h: 0.05, fill: { color: COLORS.cyan }, line: { color: COLORS.cyan } });
    slide.addShape(pptx.ShapeType.rect, { x: 4.54, y: 0.96, w: 4.26, h: 0.05, fill: { color: COLORS.purple }, line: { color: COLORS.purple } });
    slide.addShape(pptx.ShapeType.rect, { x: 8.8, y: 0.96, w: 4.25, h: 0.05, fill: { color: COLORS.pink }, line: { color: COLORS.pink } });
  };
  const addFooter = (slide: PptxGenJS.Slide, text: string) => {
    slide.addText(text, { x: 0.55, y: 7.16, w: 12.2, h: 0.16, fontSize: 7.5, italic: true, color: COLORS.slate, margin: 0 });
  };

  const cover = pptx.addSlide();
  slideNumber += 1;
  cover.background = { color: COLORS.navy };
  cover.addShape(pptx.ShapeType.ellipse, { x: 11.35, y: -0.65, w: 2.5, h: 2.5, fill: { color: "0A5CAE" }, line: { color: "0A5CAE" } });
  cover.addShape(pptx.ShapeType.ellipse, { x: -0.62, y: 6.28, w: 2.1, h: 2.1, fill: { color: COLORS.pink }, line: { color: COLORS.pink } });
  addLogo(cover);
  cover.addShape(pptx.ShapeType.roundRect, { x: 0.65, y: 1.1, w: 2.5, h: 0.42, rectRadius: 0.05, fill: { color: COLORS.cyan }, line: { color: COLORS.cyan } });
  cover.addText("COMPLIANCE BENCHMARK", { x: 0.65, y: 1.22, w: 2.5, h: 0.16, bold: true, fontSize: 10, color: COLORS.navy, align: "center", margin: 0 });
  cover.addText(benchmark.title, { x: 0.65, y: 2.05, w: 10.8, h: 0.75, bold: true, fontSize: 30, color: COLORS.white, margin: 0 });
  cover.addText(clientName, { x: 0.65, y: 3.08, w: 10.7, h: 0.4, fontSize: 20, bold: true, color: COLORS.white, margin: 0 });
  cover.addText(`${assessmentLabel} · ${benchmark.version} · Generated ${new Date().toLocaleDateString("en-GB")}`, { x: 0.65, y: 3.65, w: 10.5, h: 0.25, fontSize: 11, color: "D8F3FF", margin: 0 });
  cover.addText("Indicative readiness assessment — not a certification decision.", { x: 0.65, y: 6.9, w: 8.5, h: 0.22, fontSize: 10, color: COLORS.cyan, margin: 0 });

  const summary = pptx.addSlide();
  addHeader(summary, "Readiness Summary", `${clientName} · ${benchmark.title} · ${assessmentLabel}`, COLORS.purple);
  const metrics = [
    ["Questions", questions.length, COLORS.navy],
    ["Assessed", `${aiResult ? aiResult.scored : assessed}/${questions.length}`, COLORS.purple],
    [aiResult ? "At or above minimum" : "Pass", aiResult ? aiResult.scored - aiResult.belowMinimum : counts.pass, "059669"],
    ["Readiness", `${aiResult ? aiResult.percent : readiness}%`, COLORS.cyan],
  ] as const;
  metrics.forEach(([label, value, color], index) => {
    const x = 0.55 + index * 3.15;
    summary.addShape(pptx.ShapeType.roundRect, { x, y: 1.3, w: 2.82, h: 0.95, rectRadius: 0.06, fill: { color }, line: { color } });
    summary.addText(String(value), { x: x + 0.16, y: 1.48, w: 2.3, h: 0.28, bold: true, fontSize: 24, color: color === COLORS.cyan ? COLORS.navy : COLORS.white, margin: 0 });
    summary.addText(label.toUpperCase(), { x: x + 0.16, y: 1.88, w: 2.3, h: 0.16, bold: true, fontSize: 8, color: color === COLORS.cyan ? COLORS.navy : COLORS.white, margin: 0 });
  });
  const resultColor = aiResult
    ? aiResult.scored === 0 ? COLORS.slate : aiResult.band.status === "Green" ? "059669" : aiResult.band.status === "Amber" ? "B45309" : "B91C1C"
    : passReady ? "059669" : counts.fail + counts.partial + counts["not-assessed"] > 0 ? "B91C1C" : COLORS.slate;
  const resultText = aiResult
    ? aiResult.scored === 0 ? "NOT YET SCORED" : `${aiResult.band.status.toUpperCase()} — ${aiResult.band.label.toUpperCase()}`
    : passReady ? "PASS-READY" : assessed > 0 ? "FAIL / NOT READY" : "NOT YET ASSESSED";
  summary.addShape(pptx.ShapeType.roundRect, { x: 0.55, y: 2.65, w: 12.2, h: 1.15, rectRadius: 0.06, fill: { color: COLORS.white }, line: { color: resultColor, pt: 2 } });
  summary.addText(aiResult ? "WEIGHTED AI READINESS RESULT" : "INDICATIVE CURRENT-STATE RESULT", { x: 0.82, y: 2.92, w: 4.2, h: 0.18, fontSize: 9, bold: true, color: resultColor, margin: 0 });
  summary.addText(resultText, { x: 0.82, y: 3.2, w: 11.4, h: 0.3, fontSize: 21, bold: true, color: resultColor, margin: 0 });
  if (aiResult && aiResult.criticalControls.length > 0) {
    summary.addText(`Critical deficiency (score 0): ${aiResult.criticalControls.map((question) => question.reference).join(", ")} — result capped at Amber.`, { x: 5.4, y: 2.92, w: 7.2, h: 0.18, fontSize: 9, bold: true, color: "B91C1C", align: "right", margin: 0 });
  }
  summary.addTable(aiResult ? tableRows(
    ["Section (weight)", "Avg /5"],
    aiResult.sectionScores.map((item) => [`${item.section} (${item.weight}%)`, item.average === null ? "—" : item.average.toFixed(1)]),
  ) : tableRows(
    ["Result", "Count"],
    [
      ["Pass", String(counts.pass)],
      ["Partial", String(counts.partial)],
      ["Fail", String(counts.fail)],
      ["Not assessed", String(counts["not-assessed"])],
      ["Not applicable", String(counts["not-applicable"])],
    ],
  ), { x: 0.55, y: 4.2, w: 4.2, h: 2.2, colW: [2.7, 1.5], rowH: aiResult ? 0.25 : 0.34, fontSize: aiResult ? 8 : 9, margin: 0.05, border: { color: COLORS.line, pt: 1 }, autoPage: false });
  summary.addShape(pptx.ShapeType.roundRect, { x: 5.05, y: 4.2, w: 7.7, h: 2.2, rectRadius: 0.06, fill: { color: COLORS.white }, line: { color: COLORS.line, pt: 1 } });
  summary.addText("Assessment basis", { x: 5.35, y: 4.5, w: 2.5, h: 0.25, bold: true, fontSize: 14, color: COLORS.navy, margin: 0 });
  summary.addText(`${benchmark.notice}\n\nOfficial source: ${benchmark.sourceUrl}`, { x: 5.35, y: 4.95, w: 7.05, h: 1.05, fontSize: 10, color: COLORS.slate, breakLine: false, margin: 0 });
  addFooter(summary, "All content is editable. Validate findings against the authoritative framework and independent assessor requirements.");

  if (maturity) {
    const orgSlide = pptx.addSlide();
    addHeader(orgSlide, "Organisation Information", `${clientName} · ${benchmark.title}`, COLORS.cyan);
    orgSlide.addTable(tableRows(
      ["Field", "Response"],
      AI_ORGANISATION_FIELDS.map((field) => [`${field.id} · ${field.label}`, organisation[field.id]?.trim() || "Not recorded"]),
    ), { x: 0.55, y: 1.3, w: 12.2, colW: [4.2, 8], rowH: 0.34, fontSize: 8.5, margin: 0.05, border: { color: COLORS.line, pt: 0.8 }, autoPage: false });
    addFooter(orgSlide, "Organisation information is not scored.");
  }

  for (const section of sections) {
    const sectionQuestions = questions.filter((question) => question.section === section);
    for (let start = 0; start < sectionQuestions.length; start += 3) {
      const pageQuestions = sectionQuestions.slice(start, start + 3);
      const slide = pptx.addSlide();
      const page = Math.floor(start / 3) + 1;
      const pages = Math.ceil(sectionQuestions.length / 3);
      addHeader(slide, pages > 1 ? `${section} (${page}/${pages})` : section, `${clientName} · ${benchmark.shortTitle} · ${assessmentLabel}`, COLORS.purple);
      slide.addTable(tableRows(
        ["Question", "Result", "Client Answer / Evidence"],
        pageQuestions.map((question) => {
          const response = responses[question.id] ?? { answer: "not-assessed" as AssessmentAnswer, evidence: "" };
          const prefixes = [
            question.reference,
            question.tier ? `IG${question.tier}` : "",
            question.answerType,
          ].filter(Boolean).join(" · ");
          return [`${prefixes ? `${prefixes}\n` : ""}${question.prompt}`, maturity ? scoreLabel(response.score) : answerLabel(response.answer), response.evidence || "No answer or evidence recorded"];
        }),
      ), {
        x: 0.55,
        y: 1.3,
        w: 12.2,
        h: 5.75,
        colW: [6.1, 1.35, 4.75],
        rowH: 1.72,
        fontSize: 8.2,
        margin: 0.055,
        border: { color: COLORS.line, pt: 0.8 },
        autoPage: false,
      });
      addFooter(slide, `${pageQuestions.length} of ${sectionQuestions.length} section question(s) · ${benchmark.sourceLabel}`);
    }
  }

  const output = await pptx.write({ outputType: "blob", compression: true });
  if (!(output instanceof Blob)) throw new Error("Compliance PowerPoint generation did not return a downloadable file.");
  downloadBlob(
    output,
    `Unleashed-${benchmark.shortTitle.replace(/[^a-z0-9]+/gi, "-")}-${assessmentDepth}-readiness-${clientName.replace(/[^a-z0-9]+/gi, "-")}-${new Date().toISOString().slice(0, 10)}.pptx`,
  );
}
