import {
  BCDR_SECTIONS,
  CATALOGUE_HEADERS,
  SAAS_HIDDEN_PREFIX,
  SAAS_KEY,
  calcApp,
  catalogueCells,
  catalogueRow,
  createBcdrApp,
  formatGbp,
  gapText,
  hoursLabel,
  sizeUnitKey,
  type BcdrApp,
  type BcdrField,
} from "./bcdr-catalogue";

const input = "w-full rounded-lg border border-[#D9E7F5] bg-white px-2 py-1.5 text-sm font-semibold text-slate-700";
const label = "block text-[11px] font-black uppercase tracking-wide text-slate-500";

export function BcdrCatalogue({
  apps,
  onChange,
  activeId,
  onActiveChange,
  onExport,
  exporting,
}: {
  apps: BcdrApp[];
  onChange: (apps: BcdrApp[]) => void;
  activeId: string | null;
  onActiveChange: (id: string | null) => void;
  onExport: () => void;
  exporting: boolean;
}) {
  const active = apps.find((app) => app.id === activeId) ?? null;
  const update = (id: string, patch: Record<string, string>) => onChange(apps.map((app) => (app.id === id ? { ...app, ...patch } : app)));
  const rows = apps.map(catalogueRow);
  const calcs = apps.map(calcApp);
  const totalAnnual = calcs.reduce((sum, calc) => sum + calc.annualProtection, 0);
  const totalUpfront = calcs.reduce((sum, calc) => sum + calc.upfront, 0);
  const highRisk = apps.filter((app, index) => app.risk === "Critical" || app.risk === "High" || calcs[index].gapRisk === "High").length;

  const addApp = () => {
    const app = createBcdrApp();
    onChange([...apps, app]);
    onActiveChange(app.id);
  };

  const renderField = (app: BcdrApp, field: BcdrField) => {
    const value = app[field.k] ?? "";
    const set = (next: string) => update(app.id, { [field.k]: next });
    let control;
    if (field.t === "area") control = <textarea className={input} rows={2} value={value} onChange={(event) => set(event.target.value)} />;
    else if (field.t === "yn" || field.t === "ynp" || field.t === "select") {
      const options = field.opts ?? (field.t === "yn" ? ["Yes", "No"] : ["Yes", "Partially", "No"]);
      control = (
        <select className={input} value={value} onChange={(event) => set(event.target.value)}>
          <option value="">Select…</option>
          {options.map((option) => <option key={option}>{option}</option>)}
        </select>
      );
    } else if (field.t === "size") {
      control = (
        <div className="flex gap-1">
          <input className={input} type="number" min="0" step="any" value={value} onChange={(event) => set(event.target.value)} />
          <select className="rounded-lg border border-[#D9E7F5] bg-white px-1 text-sm font-bold" value={app[sizeUnitKey(field.k)] || "GB"} onChange={(event) => update(app.id, { [sizeUnitKey(field.k)]: event.target.value })}>
            <option>MB</option><option>GB</option><option>TB</option>
          </select>
        </div>
      );
    } else {
      const type = field.t === "date" ? "date" : field.t === "text" ? "text" : "number";
      control = <input className={input} type={type} min={type === "number" ? "0" : undefined} step={type === "number" ? "any" : undefined} value={value} onChange={(event) => set(event.target.value)} />;
    }
    return (
      <label key={field.k} className={`${label} ${field.t === "area" ? "md:col-span-2" : ""}`}>
        {field.label}
        <div className="mt-1">{control}</div>
      </label>
    );
  };

  const calc = active ? calcApp(active) : null;
  const stat = (name: string, value: string) => (
    <div key={name} className="rounded-xl bg-white p-3 ring-1 ring-[#D9E7F5]">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{name}</p>
      <p className="text-base font-black text-slate-900">{value}</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1600px] space-y-5 px-5 py-6">
      <section className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-[#D9E7F5]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-[-0.03em]">Backup, DR &amp; Business Continuity Service Catalogue</h2>
            <p className="mt-1 max-w-3xl text-sm font-semibold text-slate-600">
              Complete one record per application: business criticality → downtime impact → hosting → data → backup → local copy → cloud/offsite copy → DR → business continuity → testing → cost → gap and recommendation. Results stay in this browser tab.
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={addApp} className="rounded-xl bg-[#B8157A] px-4 py-2 text-sm font-black text-white">+ Add application</button>
            <button type="button" onClick={onExport} disabled={exporting || apps.length === 0} className="rounded-xl bg-[#7E3AED] px-4 py-2 text-sm font-black text-white disabled:opacity-50">
              {exporting ? "Generating..." : "PowerPoint report"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stat("Applications", String(apps.length))}
          {stat("High / critical risk", String(highRisk))}
          {stat("Annual protection cost", formatGbp(totalAnnual))}
          {stat("Upfront cost", formatGbp(totalUpfront))}
        </div>

        {apps.length === 0 ? (
          <p className="mt-5 rounded-2xl bg-[#F8FBFF] p-5 text-sm font-semibold text-slate-600">No applications yet. Add the first application to start the catalogue.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-xs">
              <thead>
                <tr className="bg-[#071A3F] text-white">{CATALOGUE_HEADERS.map((header) => <th key={header} className="px-2 py-2 font-black">{header}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={apps[index].id} onClick={() => onActiveChange(apps[index].id)} className={`cursor-pointer border-b border-[#EAF1F8] hover:bg-[#F2F8FF] ${apps[index].id === activeId ? "bg-[#EEF4FF]" : ""}`}>
                    {catalogueCells(row).map((cell, cellIndex) => <td key={cellIndex} className={`px-2 py-2 font-semibold ${cellIndex === 0 ? "font-black text-slate-900" : "text-slate-700"}`}>{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {active && calc && (
        <section className="space-y-4 rounded-3xl bg-white p-6 shadow-xl ring-1 ring-[#D9E7F5]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xl font-black">{active.name || "New application"}</h3>
            <button
              type="button"
              className="text-xs font-black text-red-600"
              onClick={() => { onChange(apps.filter((app) => app.id !== active.id)); onActiveChange(null); }}
            >
              Remove application
            </button>
          </div>

          {BCDR_SECTIONS.map((section, index) => {
            const saas = active[SAAS_KEY] === "Yes";
            const fields = section.id === "hosting" && saas ? section.fields.filter((field) => !SAAS_HIDDEN_PREFIX.some((prefix) => field.k.startsWith(prefix))) : section.fields;
            return (
              <details key={section.id} open={index === 0} className="rounded-2xl border border-[#D9E7F5] bg-[#F8FBFF] p-4">
                <summary className="cursor-pointer text-sm font-black text-slate-800">{section.title} <span className="font-semibold text-slate-500">· {section.intro}</span></summary>
                {section.id === "hosting" && saas && <p className="mt-2 text-xs font-bold text-slate-500">Infrastructure is managed entirely by the application provider, so server, database, storage and OS questions are hidden.</p>}
                <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{fields.map((field) => renderField(active, field))}</div>

                {section.id === "impact" && (
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    {stat("Cost per hour", formatGbp(calc.costPerHour))}
                    {stat("Cost per day", formatGbp(calc.costPerDay))}
                    {stat("Max tolerable downtime", hoursLabel(active.mtd))}
                    {stat("Estimated outage cost", formatGbp(calc.outageCost))}
                  </div>
                )}

                {section.id === "cost" && (
                  <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                    {stat("Monthly protection cost", formatGbp(calc.monthlyProtection))}
                    {stat("Annual protection cost", formatGbp(calc.annualProtection))}
                    {stat("Upfront cost", formatGbp(calc.upfront))}
                    {stat("Total first-year cost", formatGbp(calc.firstYear))}
                    {stat("Annual cost vs 1 hour downtime", calc.annualVsHour === null ? "—" : `${calc.annualVsHour.toFixed(1)}× one hour`)}
                    {stat("Annual cost vs 1 day downtime", calc.annualVsDay === null ? "—" : `${calc.annualVsDay.toFixed(2)}× one day`)}
                  </div>
                )}

                {section.id === "assess" && (
                  <div className="mt-4 space-y-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-[11px] font-black uppercase tracking-wide text-slate-500"><th className="py-1">Recovery option</th><th>RTO</th><th>RPO</th></tr>
                      </thead>
                      <tbody className="font-semibold text-slate-700">
                        <tr><td className="py-1">Business requirement</td><td>{hoursLabel(active.reqRto)}</td><td>{hoursLabel(active.reqRpo)}</td></tr>
                        <tr><td className="py-1">Current achievable</td><td>{hoursLabel(active.achRto)}</td><td>{hoursLabel(active.achRpo)}</td></tr>
                        <tr><td className="py-1">Local backup</td><td>{hoursLabel(active.locRto)}</td><td>{hoursLabel(active.locRpo)}</td></tr>
                        <tr><td className="py-1">Cloud / offsite backup</td><td>{hoursLabel(active.cldRto)}</td><td>{hoursLabel(active.cldRpo)}</td></tr>
                        <tr><td className="py-1">Full DR</td><td>{hoursLabel(active.drRto)}</td><td>{hoursLabel(active.drRpo)}</td></tr>
                        <tr className="font-black text-slate-900"><td className="py-1">Gap</td><td>{gapText(calc.rtoGap)}</td><td>{gapText(calc.rpoGap)}</td></tr>
                      </tbody>
                    </table>
                    <p className={`rounded-xl px-4 py-3 text-sm font-black ${calc.gapRisk === "High" ? "bg-red-50 text-red-800" : calc.gapRisk === "Medium" ? "bg-amber-50 text-amber-900" : calc.gapRisk === "Within requirement" ? "bg-emerald-50 text-emerald-800" : "bg-white text-slate-600"}`}>
                      {calc.gapRisk === "Not assessed"
                        ? "Enter the business requirement and current achievable RTO/RPO to calculate the gap."
                        : calc.gapRisk === "Within requirement"
                          ? "Current recovery capability meets the business requirement."
                          : `Gap: RTO ${gapText(calc.rtoGap)}, RPO ${gapText(calc.rpoGap)} → ${calc.gapRisk.toUpperCase()} RISK`}
                    </p>
                  </div>
                )}
              </details>
            );
          })}
        </section>
      )}
    </div>
  );
}
