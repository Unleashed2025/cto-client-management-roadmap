import React from "react";
import {
  CONTROL_SECTIONS,
  CONTROL_STATUS,
  PRIORITY,
  REG_FIELDS,
  TENANT_FIELDS,
  autoClass,
  controlSummary,
  createRegItem,
  finalClass,
  itemCalc,
  pct,
  scenarios,
  sortedRegister,
  type M365State,
  type RegField,
  type RegItem,
} from "./m365-hardening";

const input = "w-full rounded-lg border border-[#D9E7F5] bg-white px-2 py-1.5 text-sm font-semibold text-slate-700";
const label = "block text-[11px] font-black uppercase tracking-wide text-slate-500";
const TABS = ["Tenant & Secure Score", "Assessment", "Improvement register", "Predicted score & priorities"] as const;

const classColour: Record<string, string> = {
  "Priority Recommendation": "bg-red-100 text-red-700",
  Recommendation: "bg-amber-100 text-amber-700",
  Optimisation: "bg-emerald-100 text-emerald-700",
  Consider: "bg-sky-100 text-sky-700",
  "Risk Accepted": "bg-slate-200 text-slate-600",
};

export function M365Hardening({ state, onChange, onExport, exporting }: { state: M365State; onChange: (s: M365State) => void; onExport: () => void; exporting: boolean }) {
  const [tab, setTab] = React.useState<(typeof TABS)[number]>(TABS[0]);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const setTenant = (k: string, v: string) => onChange({ ...state, tenant: { ...state.tenant, [k]: v } });
  const setScore = (k: string, v: string) => onChange({ ...state, score: { ...state.score, [k]: v } });
  const setControl = (key: string, patch: Partial<{ status: string; note: string }>) =>
    onChange({ ...state, controls: { ...state.controls, [key]: { ...({ status: "", note: "" }), ...state.controls[key], ...patch } } });
  const updateItem = (id: string, patch: Record<string, string>) => onChange({ ...state, register: state.register.map((i) => (i.id === id ? { ...i, ...patch } : i)) });
  const sc = scenarios(state);
  const active = state.register.find((i) => i.id === activeId) ?? null;

  const numField = (k: string, text: string) => (
    <label key={k} className={label}>
      {text}
      <input className={`${input} mt-1`} type="number" min="0" step="any" value={state.score[k] ?? ""} onChange={(e) => setScore(k, e.target.value)} />
    </label>
  );
  const stat = (name: string, value: string, sub?: string) => (
    <div key={name} className="rounded-xl bg-white p-3 ring-1 ring-[#D9E7F5]">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{name}</p>
      <p className="text-xl font-black text-slate-900">{value}</p>
      {sub && <p className="text-xs font-semibold text-slate-500">{sub}</p>}
    </div>
  );

  const renderRegField = (item: RegItem, f: RegField) => {
    const value = item[f.k] ?? "";
    const set = (v: string) => updateItem(item.id, { [f.k]: v });
    let control;
    if (f.t === "area") control = <textarea className={input} rows={2} value={value} onChange={(e) => set(e.target.value)} />;
    else if (f.t === "select")
      control = (
        <select className={input} value={value} onChange={(e) => set(e.target.value)}>
          <option value="">Select…</option>
          {f.opts!.map((o) => <option key={o}>{o}</option>)}
        </select>
      );
    else control = <input className={input} type={f.t === "num" ? "number" : f.t === "date" ? "date" : "text"} min={f.t === "num" ? "0" : undefined} step={f.t === "num" ? "any" : undefined} value={value} onChange={(e) => set(e.target.value)} />;
    return (
      <label key={f.k} className={`${label} ${f.t === "area" ? "md:col-span-2" : ""}`}>
        {f.label}
        <div className="mt-1">{control}</div>
      </label>
    );
  };

  const top10 = sortedRegister(state.register.filter((i) => finalClass(i) === PRIORITY)).slice(0, 10);
  const rest = sortedRegister(state.register.filter((i) => !top10.includes(i)));

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 px-5 py-6">
      <section className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-[#D9E7F5]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-[-0.03em]">Microsoft 365 Security Assessment</h2>
            <p className="mt-1 max-w-3xl text-sm font-semibold text-slate-600">
              Combines Microsoft Secure Score data with Unleashed&apos;s assessment. Enter the tenant&apos;s Secure Score figures, assess each control, log improvements, then see the predicted score. Results stay in this browser tab.
            </p>
          </div>
          <button type="button" onClick={onExport} disabled={exporting} className="rounded-xl bg-[#7E3AED] px-4 py-2 text-sm font-black text-white disabled:opacity-50">
            {exporting ? "Generating..." : "PowerPoint report"}
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-xl px-4 py-2 text-sm font-black ${tab === t ? "bg-[#071A3F] text-white" : "bg-[#F1F6FB] text-slate-600 hover:bg-[#E3EEF9]"}`}>{t}</button>
          ))}
        </div>
      </section>

      {tab === TABS[0] && (
        <>
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#D9E7F5]">
            <h3 className="text-lg font-black">1. Tenant overview</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {TENANT_FIELDS.map((f) => (
                <label key={f.k} className={`${label} ${f.area ? "md:col-span-2 xl:col-span-3" : ""}`}>
                  {f.label}
                  {f.area ? <textarea className={`${input} mt-1`} rows={3} value={state.tenant[f.k] ?? ""} onChange={(e) => setTenant(f.k, e.target.value)} /> : <input className={`${input} mt-1`} value={state.tenant[f.k] ?? ""} onChange={(e) => setTenant(f.k, e.target.value)} />}
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#D9E7F5]">
            <h3 className="text-lg font-black">2. Current Microsoft Secure Score</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Copy the figures from the Microsoft Defender Secure Score page (or Graph secureScores). The percentage is calculated.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              {numField("curPts", "Current points")}
              {numField("maxPts", "Maximum available points")}
              {stat("Current Secure Score", pct(sc.overall.current))}
              {numField("licenceScore", "Current licence score")}
              {numField("achievable", "Achievable score")}
              {numField("planned", "Planned score")}
            </div>
            <label className={`${label} mt-4`}>
              Assessor comments
              <textarea className={`${input} mt-1`} rows={2} value={state.score.scoreNotes ?? ""} onChange={(e) => setScore("scoreNotes", e.target.value)} />
            </label>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    <th className="p-2">Pillar</th><th className="p-2">Current points</th><th className="p-2">Available points</th><th className="p-2">Current %</th><th className="p-2">Est. % (all)</th><th className="p-2">Improvement</th><th className="p-2">Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {sc.pillars.map((p) => (
                    <tr key={p.pillar} className="border-t border-[#E6EEF7]">
                      <td className="p-2 font-black">{p.pillar}</td>
                      <td className="p-2"><input className={input} type="number" min="0" step="any" value={state.score[`${p.pillar}_cur`] ?? ""} onChange={(e) => setScore(`${p.pillar}_cur`, e.target.value)} /></td>
                      <td className="p-2"><input className={input} type="number" min="0" step="any" value={state.score[`${p.pillar}_avail`] ?? ""} onChange={(e) => setScore(`${p.pillar}_avail`, e.target.value)} /></td>
                      <td className="p-2 font-bold">{pct(p.current)}</td>
                      <td className="p-2 font-bold">{pct(p.all)}</td>
                      <td className="p-2 font-bold text-emerald-700">+{(p.all - p.current).toFixed(1)} pts</td>
                      <td className="p-2"><input className={input} value={state.score[`${p.pillar}_note`] ?? ""} onChange={(e) => setScore(`${p.pillar}_note`, e.target.value)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {tab === TABS[1] && (
        <div className="space-y-5">
          {CONTROL_SECTIONS.map((section, si) => {
            const counts = controlSummary(state, section);
            return (
              <details key={section.id} open={si === 0} className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#D9E7F5]">
                <summary className="cursor-pointer text-lg font-black">
                  {si + 3}. {section.title}
                  <span className="ml-3 text-xs font-bold text-slate-500">
                    {counts["In place"]} in place · {counts["Partially in place"]} partial · {counts["Not in place"]} not in place · {counts["Not assessed"]} not assessed
                  </span>
                </summary>
                <div className="mt-4 space-y-2">
                  {section.controls.map((control, ci) => {
                    const key = `${section.id}:${ci}`;
                    const v = state.controls[key] ?? { status: "", note: "" };
                    return (
                      <div key={key} className="grid items-center gap-2 md:grid-cols-[260px_190px_1fr]">
                        <span className="text-sm font-black text-slate-800">{control}</span>
                        <select className={input} value={v.status || "Not assessed"} onChange={(e) => setControl(key, { status: e.target.value })}>
                          {CONTROL_STATUS.map((s) => <option key={s}>{s}</option>)}
                        </select>
                        <input className={input} placeholder="Finding / evidence" value={v.note} onChange={(e) => setControl(key, { note: e.target.value })} />
                      </div>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      )}

      {tab === TABS[2] && (
        <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#D9E7F5]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black">9. Unleashed improvement register</h3>
              <p className="text-sm font-semibold text-slate-500">One record per Secure Score action, combining Microsoft&apos;s data with Unleashed&apos;s assessment. Classification is automatic unless overridden.</p>
            </div>
            <button type="button" onClick={() => { const i = createRegItem(); onChange({ ...state, register: [...state.register, i] }); setActiveId(i.id); }} className="rounded-xl bg-[#B8157A] px-4 py-2 text-sm font-black text-white">+ Add improvement</button>
          </div>
          {state.register.length === 0 ? (
            <p className="mt-5 rounded-2xl bg-[#F8FBFF] p-5 text-sm font-semibold text-slate-600">No improvements yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead>
                  <tr className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                    <th className="p-2">Action</th><th className="p-2">Category</th><th className="p-2">Risk</th><th className="p-2">Remaining pts</th><th className="p-2">Est. gain</th><th className="p-2">Effort</th><th className="p-2">User impact</th><th className="p-2">Classification</th><th className="p-2">Status</th><th className="p-2" />
                  </tr>
                </thead>
                <tbody>
                  {state.register.map((i) => {
                    const c = itemCalc(i);
                    const cls = finalClass(i);
                    return (
                      <tr key={i.id} onClick={() => setActiveId(i.id)} className={`cursor-pointer border-t border-[#E6EEF7] ${i.id === activeId ? "bg-[#F3EDFF]" : "hover:bg-[#F8FBFF]"}`}>
                        <td className="p-2 font-black">{i.action || "Untitled"}</td>
                        <td className="p-2">{i.category}</td>
                        <td className="p-2">{i.risk || "—"}</td>
                        <td className="p-2">{c.remaining}</td>
                        <td className="p-2">+{c.gain}</td>
                        <td className="p-2">{i.effort || "—"}</td>
                        <td className="p-2">{i.impact || "—"}</td>
                        <td className="p-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${classColour[cls]}`}>{cls}</span></td>
                        <td className="p-2">{i.status}</td>
                        <td className="p-2"><button type="button" onClick={(e) => { e.stopPropagation(); onChange({ ...state, register: state.register.filter((x) => x.id !== i.id) }); if (activeId === i.id) setActiveId(null); }} className="text-xs font-black text-red-600">Remove</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {active && (
            <div className="mt-6 rounded-2xl bg-[#F8FBFF] p-5">
              {(() => {
                const c = itemCalc(active);
                const auto = autoClass(active);
                return (
                  <div className="mb-4 grid gap-3 sm:grid-cols-4">
                    {stat("Points remaining", String(c.remaining), "Maximum − current")}
                    {stat("Estimated gain", `+${c.gain}`, "Estimated, not guaranteed")}
                    {stat("Auto classification", auto.label, auto.reasons.join(", ") || "no priority triggers")}
                    {stat("Score after (overall)", sc.max > 0 ? pct(Math.min(100, ((sc.cur + c.gain) / sc.max) * 100)) : "—", "This change alone")}
                  </div>
                );
              })()}
              {Array.from(new Set(REG_FIELDS.map((f) => f.group))).map((group) => (
                <div key={group} className="mb-4">
                  <h4 className="mb-2 text-xs font-black uppercase tracking-[0.15em] text-[#7E3AED]">{group}</h4>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{REG_FIELDS.filter((f) => f.group === group).map((f) => renderRegField(active, f))}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === TABS[3] && (
        <>
          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#D9E7F5]">
            <h3 className="text-lg font-black">11. Predicted Secure Score</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Estimated Microsoft Secure Score improvement, not a guaranteed result. Risk Accepted items are excluded.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {stat("Current", pct(sc.overall.current))}
              {stat("After priority recommendations", pct(sc.overall.priority), `+${(sc.overall.priority - sc.overall.current).toFixed(1)} percentage points`)}
              {stat("After all recommendations", pct(sc.overall.all), `+${(sc.overall.all - sc.overall.current).toFixed(1)} percentage points`)}
              {stat("Actual after remediation", sc.overall.actual === null ? "—" : pct(sc.overall.actual))}
            </div>
            <div className="mt-4 max-w-xs">{numField("actualPts", "Actual points after remediation")}</div>
            <table className="mt-5 w-full max-w-3xl text-left text-sm">
              <thead><tr className="text-[11px] font-black uppercase tracking-wide text-slate-500"><th className="p-2">Area</th><th className="p-2">Current</th><th className="p-2">After priority</th><th className="p-2">After all</th></tr></thead>
              <tbody>
                {sc.pillars.map((p) => <tr key={p.pillar} className="border-t border-[#E6EEF7]"><td className="p-2 font-black">{p.pillar}</td><td className="p-2">{pct(p.current)}</td><td className="p-2">{pct(p.priority)}</td><td className="p-2">{pct(p.all)}</td></tr>)}
                <tr className="border-t-2 border-[#D9E7F5] font-black"><td className="p-2">Overall</td><td className="p-2">{pct(sc.overall.current)}</td><td className="p-2">{pct(sc.overall.priority)}</td><td className="p-2">{pct(sc.overall.all)}</td></tr>
              </tbody>
            </table>
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#D9E7F5]">
            <h3 className="text-lg font-black">12. Top 10 priority improvements</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">Ranked by risk first, then Microsoft points available, effort and user impact — not by points alone.</p>
            {top10.length === 0 ? <p className="mt-4 text-sm font-semibold text-slate-500">No priority recommendations yet.</p> : (
              <ol className="mt-4 space-y-3">
                {top10.map((i, idx) => {
                  const c = itemCalc(i);
                  return (
                    <li key={i.id} className="rounded-2xl bg-[#F8FBFF] p-4">
                      <p className="font-black">Priority {String(idx + 1).padStart(2, "0")}: {i.action || "Untitled"}</p>
                      <p className="text-xs font-bold text-slate-500">Risk: {i.risk || "—"} · Points available: {c.remaining} · Estimated gain: +{c.gain} · Effort: {i.effort || "—"} · User impact: {i.impact || "—"}</p>
                      {i.finding && <p className="mt-2 text-sm"><b>Current situation:</b> {i.finding}</p>}
                      {i.riskText && <p className="text-sm"><b>Why this matters:</b> {i.riskText}</p>}
                      {i.recommendation && <p className="text-sm"><b>Unleashed recommendation:</b> {i.recommendation}</p>}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#D9E7F5]">
            <h3 className="text-lg font-black">13. Remaining recommendations</h3>
            <table className="mt-3 w-full text-left text-sm">
              <thead><tr className="text-[11px] font-black uppercase tracking-wide text-slate-500"><th className="p-2">Recommendation</th><th className="p-2">Risk</th><th className="p-2">Available pts</th><th className="p-2">Est. gain</th><th className="p-2">Effort</th><th className="p-2">Priority</th></tr></thead>
              <tbody>
                {rest.map((i) => { const c = itemCalc(i); return <tr key={i.id} className="border-t border-[#E6EEF7]"><td className="p-2 font-black">{i.action || "Untitled"}</td><td className="p-2">{i.risk || "—"}</td><td className="p-2">{c.remaining}</td><td className="p-2">+{c.gain}</td><td className="p-2">{i.effort || "—"}</td><td className="p-2">{finalClass(i)}</td></tr>; })}
                {rest.length === 0 && <tr><td className="p-2 text-slate-500" colSpan={6}>None.</td></tr>}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
