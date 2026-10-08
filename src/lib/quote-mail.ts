import "server-only";
import type { QuotePayload } from "./quote-schema";
import { COMPANY } from "@/data/site";
import { THEME } from "@/data/brand";

/** Colori delle email (le variabili CSS non arrivano nei client di posta): tema chiaro del sito. */
const C = { line: THEME.light.line, muted: THEME.light.muted, fill: THEME.light.surface2, ink: THEME.light.fg };

/**
 * Invio delle email della richiesta di preventivo (solo server).
 * 1. Resend (RESEND_API_KEY), via API REST: nessuna dipendenza in più.
 * 2. Altrimenti SMTP con nodemailer: SMTP_PASS obbligatoria; SMTP_HOST, SMTP_PORT e SMTP_USER hanno
 *    i valori di Aruba per info@tecnolambro.it (smtps.aruba.it, 465 SSL).
 * 3. Altrimenti "notConfigured": il client mostra l'errore e non perde i dati.
 */
export type Attachment = { filename: string; content: Buffer; contentType?: string };
export type Mail = { to: string; bcc?: string; replyTo?: string; subject: string; html: string; text: string; attachments?: Attachment[] };

export class MailNotConfigured extends Error {}

export function mailProvider(): "resend" | "smtp" | null {
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

export async function sendMail(mail: Mail): Promise<void> {
  const provider = mailProvider();
  if (!provider) throw new MailNotConfigured("Nessun servizio email configurato");
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

type Files = { names: string[]; blobs: { name: string; url: string }[] };

const T = {
  it: {
    subjectIn: (n: string, c: string) => `Richiesta di preventivo ${n} – ${c}`,
    subjectOut: (n: string) => `Abbiamo ricevuto la tua richiesta ${n} – Tecnolambro`,
    title: "Richiesta di preventivo",
    items: "Pezzi",
    code: "Codice",
    qty: "Quantità",
    notes: "Note",
    customer: "Cliente",
    company: "Azienda",
    name: "Nome",
    email: "Email",
    phone: "Telefono",
    country: "Paese",
    vat: "P.IVA",
    files: "File",
    filesAttached: "Allegati a questa email",
    filesLinks: "Caricati su Vercel Blob (link)",
    none: "Nessuno",
    source: (s: string) => (s === "contact" ? "Modulo contatti del sito" : "Configuratore / La tua richiesta"),
    thanks: (n: string) => `Grazie, abbiamo ricevuto la richiesta ${n}. Ti rispondiamo con il preventivo entro 24 ore.`,
    recap: "Riepilogo",
    footer: `Tecnolambro Microwave Components · ${COMPANY.phone} · ${COMPANY.email}`,
    drawingsNote: "Il disegno PDF di ogni pezzo configurato è allegato. Il disegno definitivo arriva con il preventivo.",
  },
  en: {
    subjectIn: (n: string, c: string) => `Quote request ${n} – ${c}`,
    subjectOut: (n: string) => `We have received your request ${n} – Tecnolambro`,
    title: "Quote request",
    items: "Parts",
    code: "Code",
    qty: "Quantity",
    notes: "Notes",
    customer: "Customer",
    company: "Company",
    name: "Name",
    email: "Email",
    phone: "Phone",
    country: "Country",
    vat: "VAT no.",
    files: "Files",
    filesAttached: "Attached to this email",
    filesLinks: "Uploaded to Vercel Blob (links)",
    none: "None",
    source: (s: string) => (s === "contact" ? "Website contact form" : "Configurator / Your request"),
    thanks: (n: string) => `Thank you, we have received request ${n}. We will reply with a quote within 24 hours.`,
    recap: "Summary",
    footer: `Tecnolambro Microwave Components · ${COMPANY.phone} · ${COMPANY.email}`,
    drawingsNote: "The PDF drawing of each configured part is attached. The final drawing comes with the quote.",
  },
} as const;

function itemsTable(p: QuotePayload, t: (typeof T)["it"] | (typeof T)["en"], withNotes = true): { html: string; text: string } {
  const rows = p.items
    .map(
      (i, n) => `<tr>
  <td style="padding:8px;border-bottom:1px solid ${C.line};vertical-align:top">${n + 1}</td>
  <td style="padding:8px;border-bottom:1px solid ${C.line};vertical-align:top"><strong style="font-family:Consolas,monospace">${esc(i.code)}</strong>${withNotes && i.detail ? `<br><span style="color:${C.muted}">${esc(i.detail)}</span>` : ""}</td>
  <td style="padding:8px;border-bottom:1px solid ${C.line};vertical-align:top;text-align:right">${i.qty}</td>
  ${withNotes ? `<td style="padding:8px;border-bottom:1px solid ${C.line};vertical-align:top">${i.notes ? nl2br(i.notes) : "—"}</td>` : ""}
</tr>`,
    )
    .join("");
  const html = `<table style="border-collapse:collapse;width:100%;font-size:14px">
<thead><tr style="background:${C.fill}"><th style="padding:8px;text-align:left">#</th><th style="padding:8px;text-align:left">${t.code}</th><th style="padding:8px;text-align:right">${t.qty}</th>${withNotes ? `<th style="padding:8px;text-align:left">${t.notes}</th>` : ""}</tr></thead>
<tbody>${rows}</tbody></table>`;
  const text = p.items.map((i, n) => `${n + 1}. ${i.code} × ${i.qty}${withNotes && i.detail ? `\n   ${i.detail}` : ""}${withNotes && i.notes ? `\n   ${t.notes}: ${i.notes}` : ""}`).join("\n");
  return { html, text };
}

/** Email per l'ufficio (lingua italiana fissa) con tutti i dati e i file. */
export function internalMail(p: QuotePayload, number: string, files: Files): { subject: string; html: string; text: string } {
  const t = T.it;
  const c = p.customer;
  const table = itemsTable(p, t);
  const row = (k: string, v?: string) => (v ? `<tr><td style="padding:4px 12px 4px 0;color:${C.muted}">${k}</td><td style="padding:4px 0">${esc(v)}</td></tr>` : "");
  const fileList = [
    ...files.names.map((n) => `<li>${esc(n)} <span style="color:${C.muted}">(${t.filesAttached})</span></li>`),
    ...files.blobs.map((b) => `<li><a href="${esc(b.url)}">${esc(b.name)}</a> <span style="color:${C.muted}">(${t.filesLinks})</span></li>`),
  ].join("");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:${C.ink};max-width:760px">
<h1 style="font-size:20px;margin:0 0 4px">${t.title} ${esc(number)}</h1>
<p style="margin:0 0 16px;color:${C.muted}">${t.source(p.source)} · ${p.locale.toUpperCase()}</p>
<h2 style="font-size:16px">${t.customer}</h2>
<table style="font-size:14px">${row(t.company, c.company)}${row(t.name, c.name)}${row(t.email, c.email)}${row(t.phone, c.phone)}${row(t.country, c.country)}${row(t.vat, c.vat)}</table>
<h2 style="font-size:16px">${t.items}</h2>
${table.html}
<h2 style="font-size:16px">${t.files}</h2>
${fileList ? `<ul>${fileList}</ul>` : `<p>${t.none}</p>`}
</div>`;
  const text = `${t.title} ${number}\n${t.source(p.source)}\n\n${t.customer}\n${c.company}\n${c.name}\n${c.email}\n${c.phone ?? ""}\n${c.country}\n${c.vat ?? ""}\n\n${t.items}\n${table.text}\n\n${t.files}\n${[...files.names, ...files.blobs.map((b) => `${b.name} ${b.url}`)].join("\n") || t.none}`;
  return { subject: t.subjectIn(number, c.company), html, text };
}

/**
 * Conferma al cliente, nella sua lingua: solo codici e quantità. Note e testi liberi non vengono
 * ripetuti, così il modulo non si può usare per mandare messaggi a indirizzi di terzi.
 */
export function customerMail(p: QuotePayload, number: string, hasDrawings: boolean): { subject: string; html: string; text: string } {
  const t = T[p.locale];
  const table = itemsTable(p, t, false);
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:${C.ink};max-width:760px">
<p style="font-size:16px">${esc(t.thanks(number))}</p>
<h2 style="font-size:16px">${t.recap}</h2>
${table.html}
${hasDrawings ? `<p style="color:${C.muted}">${t.drawingsNote}</p>` : ""}
<p style="color:${C.muted};font-size:13px;margin-top:24px">${esc(t.footer)}</p>
</div>`;
  const text = `${t.thanks(number)}\n\n${t.recap}\n${table.text}\n\n${t.footer}`;
  return { subject: t.subjectOut(number), html, text };
}
