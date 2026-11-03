import {
  CRITICALITY_LEVELS,
  SERVICE_CATEGORIES,
  SERVICE_OUTCOMES,
  createServiceRow,
  formatGbp,
  summariseServices,
  type ServiceRow,
} from "./msp-review";

const field = "w-full rounded-lg border border-[#D9E7F5] bg-white px-2 py-1.5 text-sm font-semibold text-slate-700";

const TEXT_FIELDS: Array<[keyof ServiceRow, string]> = [
  ["name", "Service"], ["supplier", "Supplier"], ["vendor", "Vendor"], ["product", "Product / SKU"], ["owner", "Service owner"],
  ["scale", "Users / devices / sites"], ["licence", "Licence type"],
];
const NUMBER_FIELDS: Array<[keyof ServiceRow, string]> = [
  ["quantityPurchased", "Qty purchased"], ["quantityAssigned", "Qty assigned"], ["quantityUsed", "Qty used"], ["unitCost", "Unit cost / month (£)"],
  ["monthlyCost", "Monthly (£)"], ["quarterlyCost", "Quarterly (£)"], ["annualCost", "Annual (£)"], ["usageCost", "Usage-based / yr (£)"],
  ["upfrontCost", "Upfront (£)"], ["oneOffCost", "One-off (£)"], ["optionalCost", "Optional / yr (£)"], ["priceIncrease", "Annual increase (%)"],
];
const DATE_FIELDS: Array<[keyof ServiceRow, string]> = [
  ["contractStart", "Contract start"], ["contractEnd", "Contract end"], ["renewalDate", "Renewal date"], ["cancellationDeadline", "Cancellation deadline"],
  ["warrantyEnd", "Warranty end"], ["endOfSupport", "End of support"], ["endOfLife", "End of life"], ["replacementDate", "Replacement due"],
];

export function MspRegister({ rows, onChange }: { rows: ServiceRow[]; onChange: (rows: ServiceRow[]) => void }) {
  const summary = summariseServices(rows);
  const update = (id: string, patch: Partial<ServiceRow>) => onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  const input = (row: ServiceRow, key: keyof ServiceRow, label: string, type: string) => (
    <label key={key} className="block text-[11px] font-black uppercase tracking-wide text-slate-500">
      {label}
      <input
        className={`${field} mt-1`}
        type={type}
        step={type === "number" ? "any" : undefined}
        value={row[key] as string}
        onChange={(event) => update(row.id, { [key]: event.target.value })}
      />
    </label>
  );

  return (
    <section className="space-y-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#D9E7F5]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#B8157A]">Service, product &amp; cost register</p>
          <p className="text-sm font-semibold text-slate-600">Add every service, licence, device and contract. Totals and optimisation flags update automatically.</p>
        </div>
        <button type="button" className="rounded-xl bg-[#B8157A] px-4 py-2 text-sm font-black text-white" onClick={() => onChange([...rows, createServiceRow()])}>
          + Add service
        </button>
      </div>

      {rows.map((row, index) => (
        <details key={row.id} className="rounded-2xl border border-[#D9E7F5] bg-[#F8FBFF] p-4" open={index === rows.length - 1 && !row.name}>
          <summary className="cursor-pointer text-sm font-black text-slate-800">
            {row.name || row.product || `Service ${index + 1}`} <span className="font-semibold text-slate-500">· {row.category}{row.outcome ? ` · ${row.outcome}` : ""}</span>
          </summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="block text-[11px] font-black uppercase tracking-wide text-slate-500">
              Category
              <select className={`${field} mt-1`} value={row.category} onChange={(event) => update(row.id, { category: event.target.value as ServiceRow["category"] })}>
                {SERVICE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            {TEXT_FIELDS.map(([key, label]) => input(row, key, label, "text"))}
            <label className="block text-[11px] font-black uppercase tracking-wide text-slate-500">
              Business criticality
              <select className={`${field} mt-1`} value={row.criticality} onChange={(event) => update(row.id, { criticality: event.target.value as ServiceRow["criticality"] })}>
                <option value="">Select…</option>
                {CRITICALITY_LEVELS.map((level) => <option key={level}>{level}</option>)}
              </select>
            </label>
            {NUMBER_FIELDS.map(([key, label]) => input(row, key, label, "number"))}
            {DATE_FIELDS.map(([key, label]) => input(row, key, label, "date"))}
            {input(row, "noticePeriod", "Notice period", "text")}
            <label className="block text-[11px] font-black uppercase tracking-wide text-slate-500">
              Current supplier outcome
              <select className={`${field} mt-1`} value={row.outcome} onChange={(event) => update(row.id, { outcome: event.target.value as ServiceRow["outcome"] })}>
                <option value="">Select…</option>
                {SERVICE_OUTCOMES.map((outcome) => <option key={outcome}>{outcome}</option>)}
              </select>
            </label>
          </div>
          <label className="mt-3 block text-[11px] font-black uppercase tracking-wide text-slate-500">
            Description / notes
            <textarea className={`${field} mt-1`} rows={2} value={row.notes} onChange={(event) => update(row.id, { notes: event.target.value })} />
          </label>
          <button type="button" className="mt-3 text-xs font-black text-red-600" onClick={() => onChange(rows.filter((item) => item.id !== row.id))}>
            Remove service
          </button>
        </details>
      ))}

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {[
          ["Monthly recurring", formatGbp(summary.totals.monthlyRecurring)],
          ["Annual recurring", formatGbp(summary.totals.annualRecurring)],
          ["Usage-based / yr", formatGbp(summary.totals.usage)],
          ["One-off + upfront", formatGbp(summary.totals.oneOff + summary.totals.upfront)],
          ["First-year cost", formatGbp(summary.totals.firstYear)],
          ["3-year cost", formatGbp(summary.totals.threeYear)],
          ["Total contract value", formatGbp(summary.totals.contractValue)],
          ["Unused licence cost / yr", formatGbp(summary.totals.unusedLicenceCost)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-[#F8FBFF] p-3 ring-1 ring-[#D9E7F5]">
            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</p>
            <p className="text-lg font-black text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-1 text-xs font-black uppercase tracking-wide text-slate-500">Spend by category (annual recurring)</p>
          <table className="w-full text-sm">
            <tbody>
              {summary.byCategory.map((item) => (
                <tr key={item.category} className="border-b border-[#EAF1F8]">
                  <td className="py-1 font-semibold text-slate-700">{item.category}</td>
                  <td className="py-1 text-right text-slate-500">{item.count}</td>
                  <td className="py-1 text-right font-black text-slate-900">{formatGbp(item.annual)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-1 text-sm font-semibold text-slate-700">
          <p className="mb-1 text-xs font-black uppercase tracking-wide text-slate-500">Optimisation flags</p>
          <p>Unused licences: {summary.unusedLicences.map((row) => row.name || row.product).join(", ") || "none"}</p>
          <p>Possible duplicates: {summary.duplicates.join(", ") || "none"}</p>
          <p>Unknown costs: {summary.unknownCosts.length}</p>
          <p>Unknown renewal dates: {summary.unknownRenewals.length}</p>
          <p>Renewing within 6 months: {summary.renewingSoon.map((row) => row.name || row.product).join(", ") || "none"}</p>
          <p>End of support within 12 months: {summary.endOfSupport.map((row) => row.name || row.product).join(", ") || "none"}</p>
        </div>
      </div>
    </section>
  );
}
