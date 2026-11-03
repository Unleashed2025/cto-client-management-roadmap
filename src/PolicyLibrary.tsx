import React from "react";
import { Download, FileText, Sheet } from "lucide-react";
import { POLICY_DOCS, type PolicyDoc } from "./policy-docs";
import { fillDocx, type Details } from "./policy-fill";

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function PolicyLibrary({ clientName, onClientName }: { clientName: string; onClientName: (v: string) => void }) {
  const [details, setDetails] = React.useState<Details>(() => ({ business: clientName, date: new Date().toLocaleDateString("en-GB"), owner: "", email: "", phone: "" }));
  const [reviewed, setReviewed] = React.useState<Record<string, boolean>>({});
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState("");
  const set = (k: keyof Details, v: string) => {
    setDetails((d) => ({ ...d, [k]: v }));
    if (k === "business") onClientName(v);
  };
  const categories = Array.from(new Set(POLICY_DOCS.map((d) => d.category)));
  const base = import.meta.env.BASE_URL;

  async function download(doc: PolicyDoc, personalise: boolean) {
    setBusy(doc.file);
    setError("");
    try {
      const res = await fetch(`${base}policies/${doc.file}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = await res.arrayBuffer();
      const isDocx = doc.file.endsWith(".docx");
      if (personalise && isDocx) {
        const safe = (details.business || "Client").replace(/[^\w\- ]+/g, "").trim();
        save(await fillDocx(buf, details), `${safe} - ${doc.file}`);
      } else {
        save(new Blob([buf]), doc.file);
      }
    } catch (e) {
      console.error(e);
      setError(`Unable to prepare ${doc.title}.`);
    } finally {
      setBusy(null);
    }
  }

  const field = (label: string, k: keyof Details, placeholder = "") => (
    <label className="block text-xs font-black uppercase tracking-[0.1em] text-slate-500">
      {label}
      <input value={details[k]} onChange={(e) => set(k, e.target.value)} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-[#7E3AED]" />
    </label>
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-5 py-6">
      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#D9E7F5]">
        <h2 className="text-xl font-black text-slate-900">Client details</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500">Used to fill placeholders such as [Insert Business Name], [Insert date] and role fields in Word documents. Anything left blank stays as a placeholder. Spreadsheets and the ICO form download unchanged.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {field("Business name", "business")}
          {field("Date", "date")}
          {field("Responsible person / role", "owner", "e.g. Jane Smith, IT Manager")}
          {field("Contact email", "email")}
          {field("Contact phone", "phone")}
        </div>
        {error && <p className="mt-3 text-sm font-bold text-red-600">{error}</p>}
      </section>

      {categories.map((cat) => (
        <section key={cat}>
          <h3 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-[#7E3AED]">{cat}</h3>
          <div className="grid gap-4 lg:grid-cols-2">
            {POLICY_DOCS.filter((d) => d.category === cat).map((doc) => {
              const isXlsx = doc.file.endsWith(".xlsx");
              const canFill = doc.file.endsWith(".docx");
              return (
                <article key={doc.file} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-[#D9E7F5]">
                  <div className="flex items-start gap-3">
                    {isXlsx ? <Sheet className="mt-0.5 size-5 shrink-0 text-emerald-600" /> : <FileText className="mt-0.5 size-5 shrink-0 text-[#00A6C7]" />}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-base font-black text-slate-900">{doc.title}</h4>
                      <p className="mt-0.5 text-sm font-semibold text-slate-500">{doc.description}</p>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-1">
                    {doc.review.map((r, i) => {
                      const id = `${doc.file}:${i}`;
                      return (
                        <li key={id}>
                          <label className="flex items-start gap-2 text-sm font-semibold text-slate-700">
                            <input type="checkbox" checked={!!reviewed[id]} onChange={(e) => setReviewed((s) => ({ ...s, [id]: e.target.checked }))} className="mt-1" />
                            {r}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {canFill && (
                      <button disabled={busy === doc.file} onClick={() => void download(doc, true)} className="inline-flex items-center gap-2 rounded-xl bg-[#7E3AED] px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-[#6B2FD0] disabled:opacity-60">
                        <Download className="size-4" /> {busy === doc.file ? "Preparing…" : "Download for client"}
                      </button>
                    )}
                    <button disabled={busy === doc.file} onClick={() => void download(doc, false)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:border-[#7E3AED]/40">
                      <Download className="size-4" /> {canFill ? "Blank template" : "Download"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
