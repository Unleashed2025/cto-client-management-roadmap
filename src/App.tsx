import * as React from "react";
import {
  AlertTriangle,
  ClipboardCheck,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileSpreadsheet,
  LayoutDashboard,
  Plus,
  Presentation,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import {
  ASSET_CATEGORIES,
  ASSET_CATEGORY_SLUGS,
  assessRows,
  categoryGroups,
  createBlankAudit,
  createEmptyRow,
  parseAuditWorkbook,
  type AssetCategorySlug,
  type AssetFieldConfig,
  type AuditContact,
  type AuditRow,
  type BrowserAudit,
  type HighLevelInfo,
} from "./audit-model";
import { exportPowerPointReport } from "./powerpoint-report";
import { exportCompliancePowerPoint } from "./compliance-powerpoint";
import {
  BENCHMARKS,
  BENCHMARK_IDS,
  type AssessmentAnswer,
  type AssessmentDepth,
  type BenchmarkDefinition,
  type BenchmarkId,
} from "./compliance-benchmarks";

type ViewKey = "overview" | "high-level" | "compliance-overview" | `compliance:${BenchmarkId}` | AssetCategorySlug;
type BenchmarkResponse = { answer: AssessmentAnswer; evidence: string };
type BenchmarkResponseSet = Record<string, BenchmarkResponse>;

const INITIAL_VISIBLE_ROWS = 200;

type HighLevelField = { key: keyof Omit<HighLevelInfo, "contacts">; label: string; type?: string };

const HIGH_LEVEL_SECTIONS: Array<{ title: string; description: string; accent: string; fields: HighLevelField[] }> = [
  {
    title: "Organisation",
    description: "Trust or organisation identity",
    accent: "bg-[#071A3F]",
    fields: [{ key: "schoolTrustName", label: "School / Trust Name" }],
  },
  {
    title: "Site",
    description: "Primary audited location",
    accent: "bg-[#00D4FF]",
    fields: [
      { key: "siteName", label: "Site Name" },
      { key: "addressLine1", label: "Address Line 1" },
      { key: "addressLine2", label: "Address Line 2" },
      { key: "townCity", label: "Town / City" },
      { key: "county", label: "County" },
      { key: "postcode", label: "Postcode" },
    ],
  },
  {
    title: "Audit",
    description: "Audit ownership and date",
    accent: "bg-[#7E3AED]",
    fields: [
      { key: "auditDate", label: "Audit Date", type: "date" },
      { key: "auditor", label: "Auditor" },
    ],
  },
  {
    title: "Estate size",
    description: "Headline people and device counts",
    accent: "bg-[#FF2AA0]",
    fields: [
      { key: "staffCount", label: "Number of Staff", type: "number" },
      { key: "studentCount", label: "Number of Students", type: "number" },
      { key: "deviceCount", label: "Number of Devices", type: "number" },
    ],
  },
];

function rowTitle(row: AuditRow): string {
  return String(row[ASSET_CATEGORIES[row.auditCategory].titleField] ?? "Untitled item");
}

function FieldEditor({
  field,
  value,
  onChange,
  compact = false,
}: {
  field: AssetFieldConfig;
  value: unknown;
  onChange: (value: unknown) => void;
  compact?: boolean;
}) {
  const className = compact
    ? "min-w-32 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs outline-none focus:border-[#7E3AED] focus:ring-2 focus:ring-[#7E3AED]/10"
    : "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#7E3AED] focus:ring-2 focus:ring-[#7E3AED]/10";

  if (field.type === "select") {
    return (
      <select value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} className={className}>
        <option value="">Select...</option>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    );
  }
  if (field.type === "boolean") {
    const selected = value === true ? "true" : value === false ? "false" : "partial";
    return (
      <select
        value={selected}
        onChange={(event) => onChange(event.target.value === "true" ? true : event.target.value === "false" ? false : null)}
        className={className}
      >
        <option value="true">Yes</option>
        <option value="false">No</option>
        <option value="partial">Partial / Unknown</option>
      </select>
    );
  }
  if (field.type === "textarea") {
    return (
      <textarea
        value={String(value ?? "")}
        onChange={(event) => onChange(event.target.value)}
        rows={compact ? 2 : 3}
        className={`${className} min-w-48 resize-y`}
      />
    );
  }
  const dateIsIso = field.type !== "date" || !value || /^\d{4}-\d{2}-\d{2}$/.test(String(value));
  return (
    <input
      type={field.type === "number" ? "number" : field.type === "date" && dateIsIso ? "date" : "text"}
      value={String(value ?? "")}
      onChange={(event) => onChange(field.type === "number" ? (event.target.value === "" ? "" : Number(event.target.value)) : event.target.value)}
      className={className}
    />
  );
}

function AddItemModal({
  category,
  onClose,
  onSave,
}: {
  category: AssetCategorySlug;
  onClose: () => void;
  onSave: (values: Record<string, unknown>) => void;
}) {
  const config = ASSET_CATEGORIES[category];
  const [values, setValues] = React.useState<Record<string, unknown>>({});
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071A3F]/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[26px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#7E3AED]">Asset workspace</p>
            <h2 className="mt-1 text-2xl font-black">Add {config.label} Item</h2>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <div className="grid max-h-[68vh] gap-4 overflow-y-auto p-6 md:grid-cols-2">
          {config.fields.map((field) => (
            <label key={field.key} className={field.type === "textarea" ? "space-y-1.5 md:col-span-2" : "space-y-1.5"}>
              <span className="text-xs font-bold text-slate-600">
                {field.label}{field.required && <span className="text-[#FF2AA0]"> *</span>}
              </span>
              <FieldEditor field={field} value={values[field.key]} onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))} />
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700">Cancel</button>
          <button
            onClick={() => {
              onSave(values);
              onClose();
            }}
            className="rounded-xl bg-[#7E3AED] px-5 py-2.5 text-sm font-black text-white"
          >
            Add item
          </button>
        </div>
      </div>
    </div>
  );
}

function RiskBadge({ row }: { row: AuditRow }) {
  if (row.flagged) {
    return (
      <div className="flex min-w-64 items-start gap-2 text-xs text-red-700">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
        <span>{row.flagReasons.join("; ")}</span>
      </div>
    );
  }
  if (row.warnReasons.length > 0) {
    return (
      <div className="flex min-w-64 items-start gap-2 text-xs text-amber-700">
        <Clock3 className="mt-0.5 size-4 shrink-0" />
        <span>{row.warnReasons.join("; ")}</span>
      </div>
    );
  }
  return (
    <div className="flex min-w-44 items-center gap-2 text-xs text-emerald-700">
      <CheckCircle2 className="size-4" /> No critical flag
    </div>
  );
}

function ComplianceOverview({ onOpen }: { onOpen: (id: BenchmarkId) => void }) {
  return (
    <div className="space-y-5">
      <div className="rounded-[26px] bg-[#071A3F] p-7 text-white shadow-xl">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00D4FF]">Compliance benchmarks</p>
        <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">Current-state readiness assessments</h2>
        <p className="mt-3 max-w-4xl text-sm font-semibold leading-6 text-white/75">
          Complete evidence-led questionnaires to identify whether the current environment is ready to pass each benchmark.
          Results are indicative readiness findings, not certification decisions.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {BENCHMARK_IDS.map((id) => {
          const benchmark = BENCHMARKS[id];
          return (
            <article key={id} className="rounded-[26px] bg-white p-6 shadow-xl ring-1 ring-[#D9E7F5]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7E3AED]">{benchmark.version}</p>
                  <h3 className="mt-1 text-2xl font-black tracking-[-0.03em]">{benchmark.title}</h3>
                </div>
                <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#EBF8FF] text-[#7E3AED]">
                  <ClipboardCheck className="size-5" />
                </div>
              </div>
              <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">{benchmark.description}</p>
              <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-900">{benchmark.notice}</div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button onClick={() => onOpen(id)} className="rounded-xl bg-[#7E3AED] px-4 py-2.5 text-sm font-black text-white">
                  Start assessment
                </button>
                <a href={benchmark.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-black text-[#7E3AED]">
                  Official source <ExternalLink className="size-4" />
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function ComplianceAssessment({
  benchmark,
  responses,
  assessmentDepth,
  onAssessmentDepthChange,
  cisTier,
  onCisTierChange,
  onChange,
  onReset,
  onBack,
  onExport,
  exporting,
}: {
  benchmark: BenchmarkDefinition;
  responses: BenchmarkResponseSet;
  assessmentDepth: AssessmentDepth;
  onAssessmentDepthChange: (depth: AssessmentDepth) => void;
  cisTier: 1 | 2 | 3;
  onCisTierChange: (tier: 1 | 2 | 3) => void;
  onChange: (questionId: string, patch: Partial<BenchmarkResponse>) => void;
  onReset: () => void;
  onBack: () => void;
  onExport: () => void;
  exporting: boolean;
}) {
  const assessmentQuestions = assessmentDepth === "pre" ? benchmark.preQuestions : benchmark.fullQuestions;
  const visibleQuestions = assessmentQuestions.filter((question) => benchmark.id !== "cis" || assessmentDepth === "pre" || (question.tier ?? 1) <= cisTier);
  const result = visibleQuestions.reduce((summary, question) => {
    const answer = responses[question.id]?.answer ?? "not-assessed";
    summary[answer] += 1;
    return summary;
  }, { "not-assessed": 0, pass: 0, partial: 0, fail: 0, "not-applicable": 0 } as Record<AssessmentAnswer, number>);
  const assessed = result.pass + result.partial + result.fail + result["not-applicable"];
  const applicable = visibleQuestions.length - result["not-applicable"];
  const score = applicable > 0 ? Math.round(((result.pass + result.partial * 0.5) / applicable) * 100) : 0;
  const ready = visibleQuestions.length > 0 && assessed === visibleQuestions.length && result.partial === 0 && result.fail === 0;
  const started = assessed > 0;
  const sections = [...new Set(visibleQuestions.map((question) => question.section))];

  return (
    <div className="space-y-5">
      <div className="rounded-[26px] bg-white p-6 shadow-xl ring-1 ring-[#D9E7F5]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <button onClick={onBack} className="text-xs font-black uppercase tracking-[0.16em] text-[#7E3AED]">← Compliance benchmarks</button>
            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">{benchmark.title}</h2>
            <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-600">{benchmark.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {benchmark.id === "cis" && assessmentDepth === "full" && (
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold">
                Target group
                <select value={cisTier} onChange={(event) => onCisTierChange(Number(event.target.value) as 1 | 2 | 3)} className="bg-transparent font-black text-[#7E3AED] outline-none">
                  <option value={1}>IG1</option>
                  <option value={2}>IG2</option>
                  <option value={3}>IG3</option>
                </select>
              </label>
            )}
            <button onClick={onReset} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700">Reset answers</button>
            <button onClick={onExport} disabled={exporting} className="inline-flex items-center gap-2 rounded-xl bg-[#7E3AED] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">
              <Presentation className="size-4" /> {exporting ? "Generating..." : "PowerPoint report"}
            </button>
            <a href={benchmark.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-[#071A3F] px-4 py-2.5 text-sm font-black text-white">
              {benchmark.sourceLabel} <ExternalLink className="size-4" />
            </a>
          </div>
        </div>
        <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-900">{benchmark.notice}</div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <button
            onClick={() => onAssessmentDepthChange("pre")}
            className={`rounded-2xl border-2 p-4 text-left ${assessmentDepth === "pre" ? "border-[#7E3AED] bg-[#7E3AED]/5" : "border-slate-200 bg-white hover:border-slate-300"}`}
          >
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#7E3AED]">Pre-readiness assessment</p>
            <p className="mt-1 text-sm font-bold text-slate-800">25 core questions for an initial benchmark screening.</p>
          </button>
          <button
            onClick={() => onAssessmentDepthChange("full")}
            className={`rounded-2xl border-2 p-4 text-left ${assessmentDepth === "full" ? "border-[#071A3F] bg-[#071A3F]/5" : "border-slate-200 bg-white hover:border-slate-300"}`}
          >
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#071A3F]">Full readiness assessment</p>
            <p className="mt-1 text-sm font-bold text-slate-800">{benchmark.fullQuestions.length} detailed questions covering the full assessment structure.</p>
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Questions", visibleQuestions.length, "bg-[#071A3F] text-white"],
          ["Assessed", `${assessed}/${visibleQuestions.length}`, "bg-[#7E3AED] text-white"],
          ["Pass", result.pass, "bg-emerald-600 text-white"],
          ["Partial / Fail", result.partial + result.fail, "bg-[#FF2AA0] text-white"],
          ["Readiness", `${score}%`, "bg-[#00D4FF] text-[#071A3F]"],
        ].map(([label, value, className]) => (
          <div key={String(label)} className={`rounded-[22px] p-5 shadow-lg ${className}`}>
            <p className="text-2xl font-black">{String(value)}</p>
            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em]">{String(label)}</p>
          </div>
        ))}
      </div>

      <div className={`rounded-[24px] border-2 p-5 ${ready ? "border-emerald-300 bg-emerald-50 text-emerald-900" : started ? "border-red-200 bg-red-50 text-red-900" : "border-slate-200 bg-white text-slate-700"}`}>
        <p className="text-xs font-black uppercase tracking-[0.16em]">Indicative current-state result</p>
        <p className="mt-1 text-2xl font-black">{ready ? "PASS-READY" : started ? "FAIL / NOT READY" : "NOT YET ASSESSED"}</p>
        <p className="mt-2 text-sm font-semibold">
          {ready
            ? "Every applicable question is marked Pass. Independent verification and the authoritative framework may still identify additional requirements."
            : started
              ? `${result.fail} failed, ${result.partial} partially met, and ${result["not-assessed"]} not yet assessed.`
              : "Answer the questions and record supporting evidence to calculate readiness."}
        </p>
      </div>

      {sections.map((section) => (
        <section key={section} className="overflow-hidden rounded-[26px] bg-white shadow-xl ring-1 ring-[#D9E7F5]">
          <div className="border-b border-slate-200 bg-[#071A3F] px-6 py-4 text-white">
            <h3 className="font-black">{section}</h3>
          </div>
          <div className="divide-y divide-slate-200">
            {visibleQuestions.filter((question) => question.section === section).map((question, index) => {
              const response = responses[question.id] ?? { answer: "not-assessed" as AssessmentAnswer, evidence: "" };
              return (
                <div key={question.id} className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_190px_minmax(280px,0.8fr)]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#EBF8FF] text-xs font-black text-[#7E3AED]">{index + 1}</span>
                      {question.reference && <span className="rounded-full bg-[#071A3F]/10 px-2 py-1 text-[10px] font-black text-[#071A3F]">{question.reference}</span>}
                      {question.tier && <span className="rounded-full bg-[#7E3AED]/10 px-2 py-1 text-[10px] font-black text-[#7E3AED]">IG{question.tier}</span>}
                      {question.answerType && <span className="rounded-full bg-[#00D4FF]/15 px-2 py-1 text-[10px] font-black text-[#075985]">{question.answerType}</span>}
                    </div>
                    <p className="mt-3 text-sm font-bold leading-6 text-slate-900">{question.prompt}</p>
                    <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{question.evidencePrompt}</p>
                    {(question.guidance || question.logic) && (
                      <details className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        <summary className="cursor-pointer font-black text-slate-700">Question guidance and logic</summary>
                        {question.guidance && <p className="mt-2 whitespace-pre-line leading-5">{question.guidance}</p>}
                        {question.logic && <p className="mt-2 whitespace-pre-line border-t border-slate-200 pt-2 font-semibold leading-5">Logic: {question.logic}</p>}
                      </details>
                    )}
                  </div>
                  <label className="space-y-1.5">
                    <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Assessment</span>
                    <select
                      value={response.answer}
                      onChange={(event) => onChange(question.id, { answer: event.target.value as AssessmentAnswer })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-[#7E3AED]"
                    >
                      <option value="not-assessed">Not assessed</option>
                      <option value="pass">Pass</option>
                      <option value="partial">Partial</option>
                      <option value="fail">Fail</option>
                      <option value="not-applicable">Not applicable</option>
                    </select>
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Client answer / evidence</span>
                    <textarea
                      value={response.evidence}
                      onChange={(event) => onChange(question.id, { evidence: event.target.value })}
                      rows={4}
                      placeholder="Record the client's answer, evidence, gaps, owner and next action..."
                      className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#7E3AED]"
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function EmptyUpload({ onFile, onBlank, onCompliance }: { onFile: (file: File | null) => void; onBlank: () => void; onCompliance: () => void }) {
  return (
    <section className="mx-auto mt-10 max-w-4xl rounded-[30px] border-2 border-dashed border-[#7E3AED]/40 bg-white p-12 text-center shadow-xl">
      <div className="mx-auto grid size-20 place-items-center rounded-[24px] bg-[#EBF8FF] text-[#7E3AED]">
        <FileSpreadsheet className="size-10" />
      </div>
      <h2 className="mt-6 text-3xl font-black tracking-[-0.04em]">Upload the client audit workbook</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
        The workbook is mapped into High Level Info, Data Infrastructure, Network & WiFi, Client Compute, Software and Cyber Security workspaces.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-[#7E3AED] px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-[#7E3AED]/20">
          <Upload className="size-4" /> Choose workbook
          <input
            type="file"
            className="sr-only"
            accept=".xlsx,.xls,.xlsm,.xlsb,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => onFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <button
          onClick={onBlank}
          className="inline-flex items-center gap-2 rounded-2xl border-2 border-[#7E3AED] bg-white px-6 py-3 text-sm font-black text-[#7E3AED] hover:bg-[#7E3AED]/5"
        >
          <Plus className="size-4" /> Start blank audit
        </button>
      </div>
      <button onClick={onCompliance} className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#071A3F]">
        <ClipboardCheck className="size-4 text-[#7E3AED]" /> Open compliance benchmarks
      </button>
      <div className="mt-8 flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
        <ShieldCheck className="size-4 text-[#00D4FF]" />
        Parsed locally in this browser. Nothing is written to the Lifecycle app.
      </div>
    </section>
  );
}

export function AuditBuilder() {
  const [audit, setAudit] = React.useState<BrowserAudit | null>(null);
  const [clientName, setClientName] = React.useState("Temporary audit");
  const [activeView, setActiveView] = React.useState<ViewKey>("overview");
  const [status, setStatus] = React.useState("Upload a workbook to create the browser-only audit workspace.");
  const [visibleLimit, setVisibleLimit] = React.useState(INITIAL_VISIBLE_ROWS);
  const [addCategory, setAddCategory] = React.useState<AssetCategorySlug | null>(null);
  const [presenting, setPresenting] = React.useState(false);
  const [benchmarkResponses, setBenchmarkResponses] = React.useState<Partial<Record<BenchmarkId, BenchmarkResponseSet>>>({});
  const [assessmentDepth, setAssessmentDepth] = React.useState<AssessmentDepth>("pre");
  const [cisTier, setCisTier] = React.useState<1 | 2 | 3>(1);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const rows = audit?.rows ?? [];
  const activeCategory = ASSET_CATEGORY_SLUGS.includes(activeView as AssetCategorySlug) ? activeView as AssetCategorySlug : null;
  const complianceActive = String(activeView).startsWith("compliance");
  const activeBenchmarkId = String(activeView).startsWith("compliance:") ? String(activeView).slice("compliance:".length) as BenchmarkId : null;
  const activeBenchmark = activeBenchmarkId ? BENCHMARKS[activeBenchmarkId] : null;
  const activeRows = activeCategory ? rows.filter((row) => row.auditCategory === activeCategory) : [];
  const filteredRows = activeRows;
  const displayedRows = filteredRows.slice(0, visibleLimit);
  const groups = activeCategory ? categoryGroups(activeCategory, displayedRows) : [];

  function navigate(view: ViewKey) {
    setActiveView(view);
    setVisibleLimit(INITIAL_VISIBLE_ROWS);
    if (String(view).startsWith("compliance:")) setAssessmentDepth("pre");
  }

  async function handleUpload(file: File | null) {
    if (!file) return;
    if (!/\.(xlsx|xls|xlsm|xlsb|csv)$/i.test(file.name)) {
      setStatus("Choose an Excel workbook or CSV file (.xlsx, .xls, .xlsm, .xlsb, or .csv).");
      return;
    }
    setStatus("Mapping workbook sections into the Lifecycle audit structure...");
    try {
      const parsed = await parseAuditWorkbook(await file.arrayBuffer());
      const importedSheets = new Set(parsed.sheets.filter((sheet) => sheet.rowsImported > 0).map((sheet) => sheet.sheetName));
      setAudit(parsed);
      setClientName(parsed.highLevel.schoolTrustName || parsed.highLevel.siteName || file.name.replace(/\.(xlsx|xls|xlsm|xlsb|csv)$/i, ""));
      navigate("overview");
      setStatus(`Loaded ${parsed.rows.length.toLocaleString("en-GB")} category-specific record(s) across ${importedSheets.size} audit sheet(s), plus High Level Info.`);
    } catch (error) {
      console.error("Unable to read audit workbook", error);
      setStatus("This spreadsheet could not be mapped. Check that it is a valid audit workbook or CSV and try again.");
    }
  }

  function startBlankAudit() {
    setAudit(createBlankAudit());
    setClientName("New client audit");
    navigate("high-level");
    setStatus("Blank audit started. Complete High Level Info, then add records in each category workspace.");
  }

  function openCompliance() {
    if (!audit) {
      setAudit(createBlankAudit());
      setClientName("New client assessment");
    }
    navigate("compliance-overview");
    setStatus("Compliance benchmark workspace opened. Results remain in this browser tab.");
  }

  function updateBenchmarkResponse(benchmarkId: BenchmarkId, questionId: string, patch: Partial<BenchmarkResponse>) {
    setBenchmarkResponses((current) => {
      const benchmark = current[benchmarkId] ?? {};
      const response = benchmark[questionId] ?? { answer: "not-assessed" as AssessmentAnswer, evidence: "" };
      return {
        ...current,
        [benchmarkId]: {
          ...benchmark,
          [questionId]: { ...response, ...patch },
        },
      };
    });
  }

  function updateRow(rowId: string, field: string, value: unknown) {
    setAudit((current) => current ? {
      ...current,
      rows: assessRows(current.rows.map((row) => row.id === rowId ? { ...row, [field]: value } : row)),
    } : current);
  }

  function addRow(category: AssetCategorySlug, values: Record<string, unknown>) {
    const row = { ...createEmptyRow(category), ...values };
    setAudit((current) => current ? { ...current, rows: assessRows([...current.rows, row]) } : current);
  }

  function deleteRow(rowId: string) {
    if (!window.confirm("Delete this item from the temporary audit?")) return;
    setAudit((current) => current ? { ...current, rows: assessRows(current.rows.filter((row) => row.id !== rowId)) } : current);
  }

  function updateHighLevel(key: keyof Omit<HighLevelInfo, "contacts">, value: string) {
    setAudit((current) => current ? { ...current, highLevel: { ...current.highLevel, [key]: value } } : current);
  }

  function updateContact(contactId: string, patch: Partial<AuditContact>) {
    setAudit((current) => current ? {
      ...current,
      highLevel: {
        ...current.highLevel,
        contacts: current.highLevel.contacts.map((contact) => contact.id === contactId ? { ...contact, ...patch } : contact),
      },
    } : current);
  }

  function addContact() {
    setAudit((current) => current ? {
      ...current,
      highLevel: {
        ...current.highLevel,
        contacts: [...current.highLevel.contacts, { id: crypto.randomUUID(), role: "", name: "", email: "", phone: "", notes: "" }],
      },
    } : current);
  }

  function reset() {
    setAudit(null);
    setClientName("Temporary audit");
    navigate("overview");
    setStatus("Reset complete. No temporary audit data remains on this page.");
    setBenchmarkResponses({});
    setCisTier(1);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function exportPresentation() {
    if (!audit) return;
    setPresenting(true);
    try {
      await exportPowerPointReport(audit, clientName);
    } catch (error) {
      console.error("Unable to generate PowerPoint report", error);
      setStatus("The PowerPoint report could not be generated. Review the browser console for details and try again.");
    } finally {
      setPresenting(false);
    }
  }

  async function exportBenchmarkPresentation(benchmarkId: BenchmarkId) {
    setPresenting(true);
    try {
      await exportCompliancePowerPoint(BENCHMARKS[benchmarkId], benchmarkResponses[benchmarkId] ?? {}, clientName, cisTier, assessmentDepth);
    } catch (error) {
      console.error("Unable to generate compliance PowerPoint report", error);
      setStatus("The compliance PowerPoint report could not be generated. Review the browser console for details and try again.");
    } finally {
      setPresenting(false);
    }
  }

  const summary = ASSET_CATEGORY_SLUGS.map((slug) => {
    const categoryRows = rows.filter((row) => row.auditCategory === slug);
    return {
      slug,
      total: categoryRows.length,
      flagged: categoryRows.filter((row) => row.flagged).length,
      warnings: categoryRows.filter((row) => !row.flagged && row.warnReasons.length > 0).length,
    };
  });
  const totalFlagged = rows.filter((row) => row.flagged).length;

  return (
    <main className="min-h-screen bg-[#EBF8FF] text-slate-950">
      <header className="bg-[#071A3F] text-white shadow-xl">
        <div className="mx-auto flex max-w-[1800px] flex-col gap-5 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <img src={`${import.meta.env.BASE_URL}unleashed-logo-white.png`} alt="Unleashed" className="h-auto w-44" />
            <div className="hidden h-10 w-px bg-white/20 sm:block" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#00D4FF]">Browser-only Lifecycle workspace</p>
              <h1 className="mt-1 text-2xl font-black tracking-[-0.04em]">Client Audit Asset Management</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {audit && (
              <>
                <label className="rounded-xl bg-white/10 px-3 py-2">
                  <span className="sr-only">Audit name</span>
                  <input value={clientName} onChange={(event) => setClientName(event.target.value)} className="w-56 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/50" />
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/15">
                  <Upload className="size-4" /> Import / replace workbook
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="sr-only"
                    accept=".xlsx,.xls,.xlsm,.xlsb,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={(event) => void handleUpload(event.target.files?.[0] ?? null)}
                  />
                </label>
                {!complianceActive && (
                  <button onClick={() => void exportPresentation()} disabled={presenting} className="inline-flex items-center gap-2 rounded-xl bg-[#7E3AED] px-4 py-2.5 text-sm font-black disabled:opacity-50">
                    <Presentation className="size-4" /> {presenting ? "Generating PowerPoint..." : "PowerPoint report"}
                  </button>
                )}
                <button onClick={reset} className="rounded-xl p-2.5 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Reset">
                  <RefreshCcw className="size-4" />
                </button>
              </>
            )}
          </div>
        </div>
        <div className="grid h-1.5 grid-cols-3">
          <div className="bg-[#00D4FF]" /><div className="bg-[#7E3AED]" /><div className="bg-[#FF2AA0]" />
        </div>
      </header>

      {!audit ? (
        <div className="px-5 pb-12">
          <EmptyUpload onFile={(file) => void handleUpload(file)} onBlank={startBlankAudit} onCompliance={openCompliance} />
          <p className="mx-auto mt-5 max-w-4xl rounded-2xl bg-white/80 px-5 py-3 text-center text-sm font-bold text-slate-600 ring-1 ring-[#D9E7F5]">{status}</p>
        </div>
      ) : (
        <div className="mx-auto grid max-w-[1800px] gap-5 px-4 py-5 lg:grid-cols-[270px_minmax(0,1fr)]">
          <aside className="h-fit rounded-[24px] bg-white p-3 shadow-xl ring-1 ring-[#D9E7F5] lg:sticky lg:top-5">
            <p className="px-4 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Workspace</p>
            <div className="grid gap-2">
              <button
                onClick={() => navigate("overview")}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black ${!complianceActive ? "bg-[#071A3F] text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
              >
                <LayoutDashboard className="size-4" /> IT & Cyber Audit
              </button>
              <button
                onClick={() => navigate("compliance-overview")}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black ${complianceActive ? "bg-[#7E3AED] text-white" : "bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
              >
                <ClipboardCheck className="size-4" /> Compliance Benchmarks
              </button>
            </div>
            <div className="my-4 h-px bg-slate-200" />

            {complianceActive ? (
              <>
                <p className="px-4 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Compliance Benchmarks</p>
                <button
                  onClick={() => navigate("compliance-overview")}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black ${activeView === "compliance-overview" ? "bg-[#071A3F] text-white" : "text-slate-700 hover:bg-slate-50"}`}
                >
                  <ClipboardCheck className="size-4" /> Benchmark overview
                </button>
                {BENCHMARK_IDS.map((id) => (
                  <button
                    key={id}
                    onClick={() => navigate(`compliance:${id}`)}
                    className={`mt-1 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left ${activeView === `compliance:${id}` ? "bg-[#00D4FF] text-[#071A3F]" : "text-slate-700 hover:bg-slate-50"}`}
                  >
                    <span className="text-sm font-bold">{BENCHMARKS[id].shortTitle}</span>
                    <ChevronRight className="size-4" />
                  </button>
                ))}
              </>
            ) : (
              <>
                <p className="px-4 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">IT & Cyber Audit</p>
                <button onClick={() => navigate("overview")} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black ${activeView === "overview" ? "bg-[#071A3F] text-white" : "text-slate-700 hover:bg-slate-50"}`}>
                  <LayoutDashboard className="size-4" /> Audit overview
                </button>
                <button onClick={() => navigate("high-level")} className={`mt-1 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black ${activeView === "high-level" ? "bg-[#071A3F] text-white" : "text-slate-700 hover:bg-slate-50"}`}>
                  <Users className="size-4" /> High Level Info
                </button>
                <div className="my-3 h-px bg-slate-200" />
                <p className="px-4 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Asset workspaces</p>
                {summary.map((item) => (
                  <button
                    key={item.slug}
                    onClick={() => navigate(item.slug)}
                    className={`mb-1 flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left ${activeView === item.slug ? "bg-[#7E3AED] text-white" : "text-slate-700 hover:bg-slate-50"}`}
                  >
                    <span className="text-sm font-bold">{ASSET_CATEGORIES[item.slug].label}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${activeView === item.slug ? "bg-white/20" : item.flagged ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>
                      {item.total}
                    </span>
                  </button>
                ))}
                <div className="mt-3 rounded-2xl bg-[#EBF8FF] p-4 text-xs font-semibold leading-5 text-slate-600">
                  <ShieldCheck className="mb-2 size-5 text-[#7E3AED]" />
                  All edits stay in this browser tab and are included in the exported report.
                </div>
              </>
            )}
          </aside>

          <section className="min-w-0 space-y-5">
            <p className="rounded-2xl bg-white/80 px-5 py-3 text-sm font-bold text-slate-600 shadow-sm ring-1 ring-[#D9E7F5]">{status}</p>

            {activeView === "overview" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    ["Assets tracked", rows.length, "bg-[#071A3F]"],
                    ["Flagged items", totalFlagged, "bg-[#FF2AA0]"],
                    ["Audit categories", summary.filter((item) => item.total > 0).length, "bg-[#7E3AED]"],
                    ["Stored records", 0, "bg-[#00D4FF] text-[#071A3F]"],
                  ].map(([label, value, className]) => (
                    <div key={String(label)} className={`rounded-[24px] p-6 text-white shadow-lg ${className}`}>
                      <p className="text-3xl font-black">{String(value)}</p>
                      <p className="mt-5 text-xs font-black uppercase tracking-[0.14em]">{String(label)}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-[26px] bg-white p-6 shadow-xl ring-1 ring-[#D9E7F5]">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#7E3AED]">Imported audit scope</p>
                      <h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">{clientName}</h2>
                      <p className="mt-2 text-sm font-semibold text-slate-500">
                        {audit.highLevel.siteName || "Site not recorded"} · {audit.highLevel.auditDate || "Audit date not recorded"} · {audit.highLevel.auditor || "Auditor not recorded"}
                      </p>
                    </div>
                    <button onClick={() => navigate("high-level")} className="inline-flex items-center gap-2 text-sm font-black text-[#7E3AED]">
                      Edit profile <ChevronRight className="size-4" />
                    </button>
                  </div>
                  <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {summary.map((item) => (
                      <button key={item.slug} onClick={() => navigate(item.slug)} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-[#7E3AED]/40 hover:shadow-md">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-black">{ASSET_CATEGORIES[item.slug].label}</h3>
                            <p className="mt-1 text-xs font-semibold text-slate-500">{item.total} item(s) · {item.flagged} flagged · {item.warnings} warnings</p>
                          </div>
                          <ChevronRight className="size-4 text-slate-400" />
                        </div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full bg-[#FF2AA0]" style={{ width: `${item.total ? Math.round((item.flagged / item.total) * 100) : 0}%` }} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-[26px] bg-white p-6 shadow-xl ring-1 ring-[#D9E7F5]">
                  <h2 className="text-xl font-black">Workbook import summary</h2>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-[0.12em] text-slate-500"><th className="p-3">Sheet</th><th className="p-3">Section</th><th className="p-3">Workspace</th><th className="p-3 text-right">Imported</th><th className="p-3 text-right">Skipped</th></tr></thead>
                      <tbody>
                        {audit.sheets.length > 0 ? audit.sheets.map((sheet, index) => (
                          <tr key={`${sheet.sheetName}-${sheet.sectionTitle}-${index}`} className="border-b border-slate-100">
                            <td className="p-3 font-bold">{sheet.sheetName}</td>
                            <td className="p-3 text-slate-600">{sheet.sectionTitle || "—"}</td>
                            <td className="p-3 text-slate-600">{sheet.matchedCategory ? ASSET_CATEGORIES[sheet.matchedCategory].label : sheet.sheetName.match(/high level/i) ? "High Level Info" : "Not an asset table"}</td>
                            <td className="p-3 text-right font-black">{sheet.rowsImported}</td>
                            <td className="p-3 text-right text-slate-500">{sheet.rowsSkipped}</td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={5} className="p-6 text-center font-semibold text-slate-500">
                              Blank audit — no workbook imported. Add records manually in each category workspace.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {activeView === "compliance-overview" && (
              <ComplianceOverview onOpen={(id) => navigate(`compliance:${id}`)} />
            )}

            {activeBenchmark && activeBenchmarkId && (
              <ComplianceAssessment
                key={activeBenchmarkId}
                benchmark={activeBenchmark}
                responses={benchmarkResponses[activeBenchmarkId] ?? {}}
                assessmentDepth={assessmentDepth}
                onAssessmentDepthChange={setAssessmentDepth}
                cisTier={cisTier}
                onCisTierChange={setCisTier}
                onChange={(questionId, patch) => updateBenchmarkResponse(activeBenchmarkId, questionId, patch)}
                onReset={() => setBenchmarkResponses((current) => ({ ...current, [activeBenchmarkId]: {} }))}
                onBack={() => navigate("compliance-overview")}
                onExport={() => void exportBenchmarkPresentation(activeBenchmarkId)}
                exporting={presenting}
              />
            )}

            {activeView === "high-level" && (
              <div className="space-y-5">
                <div className="rounded-[26px] bg-white p-6 shadow-xl ring-1 ring-[#D9E7F5]">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#7E3AED]">Client and site profile</p>
                  <h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">High Level Information</h2>
                  <p className="mt-2 text-sm font-semibold text-slate-500">Edit the organisation, location, audit ownership and estate profile in grouped tiles.</p>
                  <div className="mt-6 grid gap-4 xl:grid-cols-2">
                    {HIGH_LEVEL_SECTIONS.map((section) => (
                      <div key={section.title} className="overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50/70">
                        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-5 py-4">
                          <span className={`h-10 w-1.5 rounded-full ${section.accent}`} />
                          <div>
                            <h3 className="font-black">{section.title}</h3>
                            <p className="text-xs font-semibold text-slate-500">{section.description}</p>
                          </div>
                        </div>
                        <div className={`grid gap-4 p-5 ${section.fields.length > 2 ? "md:grid-cols-2" : ""}`}>
                          {section.fields.map((field) => (
                            <label key={field.key} className={`space-y-1.5 ${field.key === "schoolTrustName" || field.key === "siteName" ? "md:col-span-2" : ""}`}>
                              <span className="text-xs font-bold text-slate-600">{field.label}</span>
                              <input
                                type={field.type ?? "text"}
                                value={audit.highLevel[field.key]}
                                onChange={(event) => updateHighLevel(field.key, event.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#7E3AED] focus:ring-2 focus:ring-[#7E3AED]/10"
                              />
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[26px] bg-white p-6 shadow-xl ring-1 ring-[#D9E7F5]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black">Main contacts</h2>
                      <p className="text-sm font-semibold text-slate-500">Editable contacts imported from the workbook.</p>
                    </div>
                    <button onClick={addContact} className="inline-flex items-center gap-2 rounded-xl bg-[#7E3AED] px-4 py-2.5 text-sm font-black text-white"><Plus className="size-4" /> Add contact</button>
                  </div>
                  <div className="mt-5 grid gap-4 xl:grid-cols-2">
                    {audit.highLevel.contacts.map((contact, index) => (
                      <div key={contact.id} className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="grid size-10 place-items-center rounded-xl bg-[#071A3F] text-sm font-black text-white">{index + 1}</div>
                            <div>
                              <h3 className="font-black">{contact.name || `Contact ${index + 1}`}</h3>
                              <p className="text-xs font-semibold text-slate-500">{contact.role || "Role not recorded"}</p>
                            </div>
                          </div>
                          <button onClick={() => setAudit((current) => current ? { ...current, highLevel: { ...current.highLevel, contacts: current.highLevel.contacts.filter((item) => item.id !== contact.id) } } : current)} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label={`Delete ${contact.name || `contact ${index + 1}`}`}><Trash2 className="size-4" /></button>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          {(["role", "name", "email", "phone", "notes"] as const).map((key) => (
                            <label key={key} className={`space-y-1.5 ${key === "notes" ? "md:col-span-2" : ""}`}>
                              <span className="text-xs font-bold capitalize text-slate-600">{key}</span>
                              {key === "notes" ? (
                                <textarea value={contact[key]} onChange={(event) => updateContact(contact.id, { [key]: event.target.value })} rows={3} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#7E3AED]" />
                              ) : (
                                <input value={contact[key]} onChange={(event) => updateContact(contact.id, { [key]: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#7E3AED]" />
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                    {audit.highLevel.contacts.length === 0 && (
                      <button onClick={addContact} className="rounded-[22px] border-2 border-dashed border-[#7E3AED]/30 bg-[#7E3AED]/5 p-8 text-left">
                        <Users className="size-6 text-[#7E3AED]" />
                        <p className="mt-3 font-black">Add the first contact</p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">Capture the main technical, leadership or supplier contact.</p>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeCategory && (
              <>
                <div className="rounded-[26px] bg-white p-6 shadow-xl ring-1 ring-[#D9E7F5]">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#7E3AED]">Asset workspace</p>
                      <h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">{ASSET_CATEGORIES[activeCategory].label}</h2>
                      <p className="mt-2 text-sm font-semibold text-slate-500">{filteredRows.length} item(s) · {filteredRows.filter((row) => row.flagged).length} flagged for attention</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setAddCategory(activeCategory)} className="inline-flex items-center gap-2 rounded-xl bg-[#7E3AED] px-4 py-2.5 text-sm font-black text-white"><Plus className="size-4" /> Add item</button>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                    {categoryGroups(activeCategory, filteredRows).map((group) => (
                      <div key={group.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-2xl font-black">{group.rows.length}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">{group.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {groups.map((group) => (
                  <div key={group.label} className="overflow-hidden rounded-[26px] bg-white shadow-xl ring-1 ring-[#D9E7F5]">
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                      <div>
                        <h3 className="text-lg font-black">{group.label}</h3>
                        <p className="text-xs font-semibold text-slate-500">{group.rows.length} visible row(s)</p>
                      </div>
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">{group.rows.filter((row) => row.flagged).length} flagged</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full border-separate border-spacing-0 text-left">
                        <thead className="sticky top-0 z-20 bg-[#071A3F] text-white">
                          <tr>
                            <th className="sticky left-0 z-30 min-w-12 bg-[#071A3F] p-3 text-center text-[10px] uppercase tracking-[0.12em]">Risk</th>
                            {ASSET_CATEGORIES[activeCategory].fields.map((field) => (
                              <th key={field.key} className="min-w-40 p-3 text-[10px] uppercase tracking-[0.12em]">{field.label}</th>
                            ))}
                            <th className="min-w-72 p-3 text-[10px] uppercase tracking-[0.12em]">Assessment</th>
                            <th className="sticky right-0 z-30 min-w-16 bg-[#071A3F] p-3" />
                          </tr>
                        </thead>
                        <tbody>
                          {group.rows.map((row, index) => (
                            <tr key={row.id} className={`${index % 2 ? "bg-slate-50/70" : "bg-white"} ${row.flagged ? "bg-red-50/70" : row.warnReasons.length ? "bg-amber-50/70" : ""}`}>
                              <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-inherit p-3 text-center">
                                {row.flagged ? <AlertTriangle className="mx-auto size-4 text-red-500" /> : row.warnReasons.length ? <Clock3 className="mx-auto size-4 text-amber-500" /> : <CheckCircle2 className="mx-auto size-4 text-emerald-500" />}
                              </td>
                              {ASSET_CATEGORIES[activeCategory].fields.map((field) => (
                                <td key={field.key} className="border-b border-slate-200 p-2 align-top">
                                  <FieldEditor field={field} value={row[field.key]} onChange={(value) => updateRow(row.id, field.key, value)} compact />
                                </td>
                              ))}
                              <td className="border-b border-slate-200 p-3 align-top"><RiskBadge row={row} /></td>
                              <td className="sticky right-0 z-10 border-b border-l border-slate-200 bg-inherit p-2">
                                <button onClick={() => deleteRow(row.id)} title={`Delete ${rowTitle(row)}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="size-4" /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                {visibleLimit < filteredRows.length && (
                  <button onClick={() => setVisibleLimit((current) => current + INITIAL_VISIBLE_ROWS)} className="w-full rounded-2xl border border-[#7E3AED]/30 bg-white px-5 py-3 text-sm font-black text-[#7E3AED] shadow-sm">
                    Show next {Math.min(INITIAL_VISIBLE_ROWS, filteredRows.length - visibleLimit)} rows
                  </button>
                )}
              </>
            )}
          </section>
        </div>
      )}
      {addCategory && <AddItemModal category={addCategory} onClose={() => setAddCategory(null)} onSave={(values) => addRow(addCategory, values)} />}
    </main>
  );
}
