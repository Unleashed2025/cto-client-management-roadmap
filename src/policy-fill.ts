import JSZip from "jszip";

export type Details = { business: string; date: string; owner: string; email: string; phone: string };

const BUSINESS = /\[\s*(?:insert\s+business\s+name|company\s+name|company)\s*\]/gi;
const DATE = /\[\s*(?:insert\s+date|date)\s*\]/gi;
const OWNER = /\[\s*(?:insert\s+the\s+appointment\(s\)|insert\s+the\s+appointment\s+of\s+the\s+individual|insert\s+role\s+responsible|insert\s+name\s*\/\s*role|insert\s+name\s+and\s+role|insert\s+named\s+individual|insert\s+the\s+named\s+individual|insert\s+the\s+individual\s+name|insert\s+the\s+person\s+responsible|insert\s+the\s+name\s+or\s+appointment|name\s*\+\s*title)\s*\]/gi;
const EMAIL = /\[\s*(?:email\s+address|email)\s*\]/gi;
const PHONE = /\[\s*(?:phone\s+number|telephone\s+number)\s*\]/gi;

function replacements(d: Details): [RegExp, string][] {
  const list: [RegExp, string][] = [];
  if (d.business) list.push([BUSINESS, d.business]);
  if (d.date) list.push([DATE, d.date]);
  if (d.owner) list.push([OWNER, d.owner]);
  if (d.email) list.push([EMAIL, d.email]);
  if (d.phone) list.push([PHONE, d.phone]);
  return list;
}

const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Placeholders are often split across Word runs, so match over each paragraph's joined text.
function fillParagraph(paragraph: string, reps: [RegExp, string][]): string {
  const runRe = /(<w:t(?:\s[^>]*)?>)([^<]*)(<\/w:t>)/g;
  const runs: { start: number; end: number; open: string; text: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = runRe.exec(paragraph))) {
    runs.push({ start: m.index, end: m.index + m[0].length, open: m[1], text: m[2] });
  }
  if (!runs.length) return paragraph;
  const texts = runs.map((r) => r.text);
  let changed = false;
  for (const [re, value] of reps) {
    const val = escapeXml(value);
    for (;;) {
      const joined = texts.join("");
      re.lastIndex = 0;
      const hit = re.exec(joined);
      if (!hit) break;
      changed = true;
      const s = hit.index;
      const e = s + hit[0].length;
      let pos = 0;
      let placed = false;
      for (let i = 0; i < texts.length; i++) {
        const t = texts[i];
        const a = pos;
        const b = pos + t.length;
        pos = b;
        if (b <= s || a >= e) continue;
        const before = t.slice(0, Math.max(0, s - a));
        const after = t.slice(Math.min(t.length, e - a));
        texts[i] = before + (placed ? "" : val) + after;
        placed = true;
      }
    }
  }
  if (!changed) return paragraph;
  let out = "";
  let last = 0;
  runs.forEach((r, i) => {
    out += paragraph.slice(last, r.start) + r.open.replace(/\s+xml:space="[^"]*"/, "") .replace(/>$/, ' xml:space="preserve">') + texts[i] + "</w:t>";
    last = r.end;
  });
  return out + paragraph.slice(last);
}

export async function fillDocx(buffer: ArrayBuffer, details: Details): Promise<Blob> {
  const zip = await JSZip.loadAsync(buffer);
  const reps = replacements(details);
  const names = Object.keys(zip.files).filter((n) => /^word\/(document|header\d*|footer\d*)\.xml$/.test(n));
  for (const name of names) {
    const xml = await zip.file(name)!.async("string");
    const next = xml.replace(/<w:p[ >][\s\S]*?<\/w:p>/g, (p) => fillParagraph(p, reps));
    zip.file(name, next);
  }
  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

