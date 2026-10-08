import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { QuotePayload } from "./quote-schema";
import { COMPANY, whatsappHref } from "@/data/site";
import { THEME } from "@/data/brand";

/** Colori delle email (le variabili CSS non arrivano nei client di posta): tema chiaro del sito. */
const C = { line: THEME.light.line, muted: THEME.light.muted, fill: THEME.light.surface2, ink: THEME.light.fg, accent: THEME.light.accent, paper: "#ffffff" };

/**
 * Invio delle email della richiesta di preventivo (solo server).
 * 1. Resend (RESEND_API_KEY), via API REST: nessuna dipendenza in più.
 * 2. Altrimenti SMTP con nodemailer: SMTP_PASS obbligatoria; SMTP_HOST, SMTP_PORT e SMTP_USER hanno
 *    i valori di Aruba per info@tecnolambro.it (smtps.aruba.it, 465 SSL).
 * 3. Altrimenti "notConfigured": il client mostra l'errore e non perde i dati.
 * Modalità test (QUOTE_TEST_MODE=1, mai in produzione su Vercel): niente invio, le email e gli
 * allegati vengono scritti in test-output/quote/<numero>/.
 */
export type Attachment = { filename: string; content: Buffer; contentType?: string };
export type Mail = { to: string; bcc?: string; replyTo?: string; subject: string; html: string; text: string; attachments?: Attachment[] };

export class MailNotConfigured extends Error {}

export function testMode(): boolean {
  return process.env.QUOTE_TEST_MODE === "1" && process.env.VERCEL_ENV !== "production";
}

export function mailProvider(): "resend" | "smtp" | "test" | null {
  if (testMode()) return "test";
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_PASS) return "smtp";
  return null;
}

const SMTP = {
  host: () => process.env.SMTP_HOST || "smtps.aruba.it",
  port: () => Number(process.env.SMTP_PORT || 465),
  user: () => process.env.SMTP_USER || "info@tecnolambro.it",
};

function from(): string {
  return process.env.QUOTE_FROM_EMAIL || "Tecnolambro <info@tecnolambro.it>";
}

/** In modalità test: scrive l'email (HTML, testo, intestazioni) e gli allegati su disco. */
async function writeTestMail(mail: Mail, folder: string, name: string): Promise<void> {
  const dir = join(process.cwd(), "test-output", "quote", folder);
  await mkdir(join(dir, `${name}-allegati`), { recursive: true });
  await writeFile(join(dir, `${name}.html`), mail.html);
  await writeFile(join(dir, `${name}.txt`), mail.text);
  const headers = { from: from(), to: mail.to, bcc: mail.bcc ?? null, replyTo: mail.replyTo ?? null, subject: mail.subject, attachments: (mail.attachments ?? []).map((a) => ({ filename: a.filename, bytes: a.content.length })) };
  await writeFile(join(dir, `${name}.json`), JSON.stringify(headers, null, 2));
  for (const a of mail.attachments ?? []) await writeFile(join(dir, `${name}-allegati`, a.filename.replace(/[\\/:*?"<>|]/g, "_")), a.content);
}

export async function sendMail(mail: Mail, test?: { folder: string; name: string }): Promise<void> {
  const provider = mailProvider();
  if (!provider) throw new MailNotConfigured("Nessun servizio email configurato");
  if (provider === "test") return writeTestMail(mail, test?.folder ?? "senza-numero", test?.name ?? "email");
  if (provider === "resend") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: from(),
        to: [mail.to],
        bcc: mail.bcc ? [mail.bcc] : undefined,
        reply_to: mail.replyTo,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        attachments: mail.attachments?.map((a) => ({ filename: a.filename, content: a.content.toString("base64") })),
      }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return;
  }
  const nodemailer = await import("nodemailer");
  const port = SMTP.port();
  const transport = nodemailer.createTransport({
    host: SMTP.host(),
    port,
    secure: port === 465,
    auth: { user: SMTP.user(), pass: process.env.SMTP_PASS },
  });
  await transport.sendMail({ from: from(), to: mail.to, bcc: mail.bcc, replyTo: mail.replyTo, subject: mail.subject, html: mail.html, text: mail.text, attachments: mail.attachments });
}

/* ------------------------------------------------------------- contenuto */

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const nl2br = (s: string) => esc(s).replace(/\n/g, "<br>");

export type MailFiles = {
  /** file del cliente allegati */
  attached: string[];
  /** disegni PDF generati, allegati */
  drawings: string[];
  /** modelli GLB allegati */
  models: string[];
  /** file caricati su Vercel Blob (link) */
  links: { name: string; url: string; kind: string }[];
  /** modelli non inviati (troppo grandi e Blob non disponibile) */
  modelsSkipped?: boolean;
};

/** Lingua del cliente nell'email all'ufficio (che resta sempre in italiano) */
const LANG: Record<string, string> = { it: "Italiano", en: "Inglese", es: "Spagnolo", zh: "Cinese", de: "Tedesco" };

/** Oggetto: [Preventivo TL-261008-4821] Azienda · Paese · 3 pezzi */
export function officeSubject(p: QuotePayload, number: string): string {
  const who = p.customer.company || p.customer.name;
  const n = p.items.reduce((s, i) => s + i.qty, 0);
  return `[Preventivo ${number}] ${[who, p.customer.country || "—", n === 1 ? "1 pezzo" : `${n} pezzi`].join(" · ")}`;
}

const td = `padding:8px;border-bottom:1px solid ${C.line};vertical-align:top`;
const h2 = `font-size:16px;margin:28px 0 8px`;

/** Email per l'ufficio (sempre in italiano) con tutti i dati, le opzioni e i file. */
export function internalMail(p: QuotePayload, number: string, files: MailFiles): { subject: string; html: string; text: string } {
  const c = p.customer;
  const subject = officeSubject(p, number);
  const reply = `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent(`Re: [Preventivo ${number}] Tecnolambro`)}`;
  const row = (k: string, v?: string, href?: string) =>
    v ? `<tr><td style="padding:4px 16px 4px 0;color:${C.muted};white-space:nowrap">${k}</td><td style="padding:4px 0">${href ? `<a href="${esc(href)}" style="color:${C.accent}">${esc(v)}</a>` : esc(v)}</td></tr>` : "";
  const items = p.items
    .map(
      (i, n) => `<tr>
<td style="${td}">${n + 1}</td>
<td style="${td}"><strong style="font-family:Consolas,Menlo,monospace">${esc(i.code)}</strong>${i.detail ? `<br><span style="color:${C.muted}">${esc(i.detail)}</span>` : ""}${i.files?.length ? `<br><span style="color:${C.muted}">File: ${esc(i.files.join(", "))}</span>` : ""}</td>
<td style="${td};text-align:right;white-space:nowrap">${i.qty}</td>
<td style="${td}">${i.notes ? nl2br(i.notes) : "—"}</td>
</tr>`,
    )
    .join("");
  const fileRows = [
    ...files.attached.map((n) => `<li>${esc(n)} <span style="color:${C.muted}">(file del cliente, allegato)</span></li>`),
    ...files.drawings.map((n) => `<li>${esc(n)} <span style="color:${C.muted}">(disegno generato, allegato)</span></li>`),
    ...files.models.map((n) => `<li>${esc(n)} <span style="color:${C.muted}">(modello 3D, allegato)</span></li>`),
    ...files.links.map((b) => `<li><a href="${esc(b.url)}" style="color:${C.accent}">${esc(b.name)}</a> <span style="color:${C.muted}">(${b.kind === "model" ? "modello 3D" : b.kind === "drawing" ? "disegno generato" : "file del cliente"}, link)</span></li>`),
    `<li>richiesta.json <span style="color:${C.muted}">(tutti i dati, per il gestionale)</span></li>`,
  ].join("");
  const m = p.meta;
  const utm = m?.utm ? Object.entries(m.utm).map(([k, v]) => `${k}=${v}`).join(" · ") : "";
  const html = `<!doctype html><html><body style="margin:0;background:${C.fill}">
<div style="font-family:Arial,Helvetica,sans-serif;color:${C.ink};max-width:780px;margin:0 auto;background:${C.paper};padding:28px">
<p style="margin:0 0 4px;color:${C.muted};font-size:13px">${p.source === "contact" ? "Modulo breve del sito" : "La tua richiesta (configuratore)"} · ${new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome" })}</p>
<h1 style="font-size:22px;margin:0 0 16px">Richiesta di preventivo ${esc(number)}</h1>
<p style="margin:0 0 8px"><a href="${esc(reply)}" style="display:inline-block;background:${C.accent};color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:bold">Rispondi al cliente</a></p>
<h2 style="${h2}">Cliente</h2>
<table style="font-size:14px;border-collapse:collapse">${row("Azienda", c.company)}${row("Nome", c.name)}${row("Email", c.email, `mailto:${c.email}`)}${row("Telefono", c.phone, c.phone ? `tel:${c.phone.replace(/[^\d+]/g, "")}` : undefined)}${row("Paese", c.country ? `${c.country}${c.countryCode ? ` (${c.countryCode})` : ""}` : undefined)}${row("P.IVA", c.vat)}${row("Lingua del sito", LANG[p.locale] ?? p.locale)}</table>
${p.message ? `<h2 style="${h2}">Messaggio</h2><p style="font-size:14px;line-height:1.5">${nl2br(p.message)}</p>` : ""}
<h2 style="${h2}">Pezzi</h2>
<table style="border-collapse:collapse;width:100%;font-size:14px">
<thead><tr style="background:${C.fill}"><th style="padding:8px;text-align:left">#</th><th style="padding:8px;text-align:left">Riferimento e opzioni</th><th style="padding:8px;text-align:right">Q.tà</th><th style="padding:8px;text-align:left">Note</th></tr></thead>
<tbody>${items}</tbody></table>
<h2 style="${h2}">File</h2>
<ul style="font-size:14px;padding-left:20px">${fileRows}</ul>
${files.modelsSkipped ? `<p style="font-size:13px;color:${C.muted}">I modelli 3D superavano 5 MB e lo spazio file non è configurato: si rigenerano dal link della configurazione.</p>` : ""}
<h2 style="${h2}">Provenienza</h2>
<table style="font-size:14px;border-collapse:collapse">${row("Pagina", m?.page)}${row("Prima pagina visitata", m?.landing)}${row("Referrer", m?.referrer)}${row("UTM", utm)}</table>
</div></body></html>`;
  const text = [
    `Richiesta di preventivo ${number}`,
    `Rispondi al cliente: ${c.email}`,
    "",
    "CLIENTE",
    [c.company, c.name, c.email, c.phone, c.country, c.vat && `P.IVA ${c.vat}`, `Lingua: ${LANG[p.locale] ?? p.locale}`].filter(Boolean).join("\n"),
    ...(p.message ? ["", "MESSAGGIO", p.message] : []),
    "",
    "PEZZI",
    p.items.map((i, n) => `${n + 1}. ${i.code} × ${i.qty}${i.detail ? `\n   ${i.detail}` : ""}${i.files?.length ? `\n   File: ${i.files.join(", ")}` : ""}${i.notes ? `\n   Note: ${i.notes}` : ""}`).join("\n"),
    "",
    "FILE",
    [...files.attached, ...files.drawings, ...files.models, ...files.links.map((b) => `${b.name} ${b.url}`), "richiesta.json"].join("\n"),
    "",
    "PROVENIENZA",
    [m?.page && `Pagina: ${m.page}`, m?.landing && `Prima pagina: ${m.landing}`, m?.referrer && `Referrer: ${m.referrer}`, utm && `UTM: ${utm}`].filter(Boolean).join("\n") || "—",
  ].join("\n");
  return { subject, html, text };
}

const OUT = {
  it: {
    subject: (n: string) => `Abbiamo ricevuto la vostra richiesta ${n} – Tecnolambro`,
    hello: (name: string) => `Buongiorno ${name},`,
    thanks: "grazie per la richiesta di preventivo.",
    number: "Numero di richiesta",
    reply: "Vi rispondiamo con il preventivo entro 24 ore lavorative.",
    recap: "Riepilogo",
    code: "Pezzo",
    qty: "Quantità",
    customItem: "Richiesta su disegno",
    drawings: "In allegato il disegno PDF di ogni pezzo configurato. Il disegno definitivo arriva con il preventivo.",
    contacts: "Per qualsiasi cosa",
    mobile: "Cellulare",
    whatsapp: "Scriveteci su WhatsApp",
    sign: "Tecnolambro Microwave Components",
  },
  en: {
    subject: (n: string) => `We have received your request ${n} – Tecnolambro`,
    hello: (name: string) => `Hello ${name},`,
    thanks: "thank you for your quote request.",
    number: "Request number",
    reply: "We will reply with a quote within 24 working hours.",
    recap: "Summary",
    code: "Part",
    qty: "Quantity",
    customItem: "Request to drawing",
    drawings: "The PDF drawing of each configured part is attached. The final drawing comes with the quote.",
    contacts: "If you need anything",
    mobile: "Mobile",
    whatsapp: "Message us on WhatsApp",
    sign: "Tecnolambro Microwave Components",
  },
  es: {
    subject: (n: string) => `Hemos recibido su solicitud ${n} – Tecnolambro`,
    hello: (name: string) => `Estimado/a ${name}:`,
    thanks: "gracias por su solicitud de presupuesto.",
    number: "Número de solicitud",
    reply: "Le enviaremos el presupuesto en un plazo de 24 horas laborables.",
    recap: "Resumen",
    code: "Pieza",
    qty: "Cantidad",
    customItem: "Solicitud según plano",
    drawings: "Adjuntamos el plano PDF de cada pieza configurada. El plano definitivo se envía con el presupuesto.",
    contacts: "Para cualquier consulta",
    mobile: "Móvil",
    whatsapp: "Escríbanos por WhatsApp",
    sign: "Tecnolambro Microwave Components",
  },
  zh: {
    subject: (n: string) => `我们已收到您的询价 ${n} – Tecnolambro`,
    hello: (name: string) => `${name}，您好：`,
    thanks: "感谢您的询价。",
    number: "询价编号",
    reply: "我们将在24个工作小时内向您发送报价。",
    recap: "摘要",
    code: "零件",
    qty: "数量",
    customItem: "按图定制询价",
    drawings: "附件为每个已配置零件的PDF图纸。正式图纸将随报价一并发送。",
    contacts: "如有任何问题",
    mobile: "手机",
    whatsapp: "通过 WhatsApp 联系我们",
    sign: "Tecnolambro Microwave Components",
  },
  de: {
    subject: (n: string) => `Wir haben Ihre Anfrage ${n} erhalten – Tecnolambro`,
    hello: (name: string) => `Guten Tag ${name},`,
    thanks: "vielen Dank für Ihre Angebotsanfrage.",
    number: "Anfragenummer",
    reply: "Sie erhalten unser Angebot innerhalb von 24 Arbeitsstunden.",
    recap: "Zusammenfassung",
    code: "Teil",
    qty: "Menge",
    customItem: "Anfrage nach Zeichnung",
    drawings: "Im Anhang finden Sie die PDF-Zeichnung jedes konfigurierten Teils. Die endgültige Zeichnung erhalten Sie mit dem Angebot.",
    contacts: "Bei Fragen",
    mobile: "Mobil",
    whatsapp: "Schreiben Sie uns auf WhatsApp",
    sign: "Tecnolambro Microwave Components",
  },
} as const;

/**
 * Conferma al cliente, nella sua lingua: numero, codici e quantità. Note, dettagli e messaggi liberi
 * non vengono ripetuti, così il modulo non si può usare per mandare testi a indirizzi di terzi.
 */
export function customerMail(p: QuotePayload, number: string, hasDrawings: boolean): { subject: string; html: string; text: string } {
  const t = OUT[p.locale as keyof typeof OUT] ?? OUT.en;
  const name = p.customer.name.split(/\s+/)[0] ?? "";
  const code = (i: QuotePayload["items"][number]) => (i.kind === "contact" ? t.customItem : i.code);
  const rows = p.items.map((i) => `<tr><td style="${td};font-family:Consolas,Menlo,monospace">${esc(code(i))}</td><td style="${td};text-align:right">${i.qty}</td></tr>`).join("");
  const wa = whatsappHref(p.locale);
  const html = `<!doctype html><html><body style="margin:0;background:${C.fill}">
<div style="font-family:Arial,Helvetica,sans-serif;color:${C.ink};max-width:640px;margin:0 auto;background:${C.paper};padding:28px">
<p style="font-size:16px;margin:0 0 4px">${esc(t.hello(name))}</p>
<p style="font-size:16px;margin:0 0 20px">${t.thanks}</p>
<p style="margin:0;color:${C.muted};font-size:13px;text-transform:uppercase;letter-spacing:.08em">${t.number}</p>
<p style="margin:2px 0 20px;font-family:Consolas,Menlo,monospace;font-size:22px;font-weight:bold">${esc(number)}</p>
<p style="font-size:16px;font-weight:bold;margin:0 0 20px">${t.reply}</p>
<h2 style="${h2}">${t.recap}</h2>
<table style="border-collapse:collapse;width:100%;font-size:14px"><thead><tr style="background:${C.fill}"><th style="padding:8px;text-align:left">${t.code}</th><th style="padding:8px;text-align:right">${t.qty}</th></tr></thead><tbody>${rows}</tbody></table>
${hasDrawings ? `<p style="color:${C.muted};font-size:14px">${t.drawings}</p>` : ""}
<h2 style="${h2}">${t.contacts}</h2>
<p style="font-size:14px;line-height:1.7;margin:0">${t.mobile}: <a href="${COMPANY.phoneHref}" style="color:${C.accent}">${COMPANY.phone}</a><br>
<a href="${esc(wa)}" style="color:${C.accent}">${t.whatsapp}</a><br>
<a href="mailto:${COMPANY.email}" style="color:${C.accent}">${COMPANY.email}</a></p>
<p style="color:${C.muted};font-size:13px;margin-top:28px">${t.sign}</p>
</div></body></html>`;
  const text = `${t.hello(name)}\n${t.thanks}\n\n${t.number}: ${number}\n${t.reply}\n\n${t.recap}\n${p.items.map((i) => `- ${code(i)} × ${i.qty}`).join("\n")}\n${hasDrawings ? `\n${t.drawings}\n` : ""}\n${t.contacts}\n${t.mobile}: ${COMPANY.phone}\nWhatsApp: ${wa}\n${COMPANY.email}\n\n${t.sign}`;
  return { subject: t.subject(number), html, text };
}
