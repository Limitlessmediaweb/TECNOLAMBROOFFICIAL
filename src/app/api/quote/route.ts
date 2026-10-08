import { MailNotConfigured, customerMail, internalMail, mailProvider, sendMail, type Attachment, type MailFiles } from "@/lib/quote-mail";
import { MAX_FILE_BYTES, MAX_MODEL_ATTACH_BYTES, MIN_FILL_MS, isAcceptedFile, isModelFile, validatePayload, type QuoteResponse } from "@/lib/quote-schema";
import { blobHost, clientIp, rateLimited } from "@/lib/rate-limit";
import { randomInt } from "node:crypto";

/**
 * POST /api/quote — richiesta di preventivo ("La tua richiesta" e modulo breve).
 * FormData: payload (JSON, vedi lib/quote-schema.ts) · files[] (file del cliente) ·
 * drawings[] (PDF generati nel browser) · models[] (GLB dei pezzi configurati).
 * Invia l'email a QUOTE_TO_EMAIL (+ QUOTE_BCC_EMAIL) con gli allegati e richiesta.json, la conferma
 * al cliente con i disegni e, se impostato, la stessa richiesta in JSON a QUOTE_WEBHOOK_URL.
 */
export const runtime = "nodejs";

/** Corpo massimo accettato: Vercel rifiuta già sopra 4,5 MB. */
const MAX_BODY = 4.5 * 1024 * 1024;
const RATE = { windowMs: 10 * 60 * 1000, max: 5 };

function json(body: QuoteResponse, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * TL-AAMMGG-XXXX: data (ora italiana) e 4 cifre casuali. Senza database non c'è una numerazione
 * progressiva; due richieste nello stesso giorno coincidono con probabilità 1/10.000.
 */
function requestNumber(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", year: "2-digit", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `TL-${part("year")}${part("month")}${part("day")}-${String(randomInt(10000)).padStart(4, "0")}`;
}

/**
 * I disegni PDF arrivano dal browser e vengono girati anche al cliente: si accettano solo PDF piccoli
 * senza azioni, script, link o file incorporati (quelli generati dal sito non ne hanno).
 */
function safeDrawing(buf: Buffer): boolean {
  if (buf.length > 3 * 1024 * 1024 || buf.subarray(0, 5).toString("latin1") !== "%PDF-") return false;
  return !/\/(JavaScript|JS|Launch|EmbeddedFile|URI|OpenAction|AA|SubmitForm|RichMedia)\b/.test(buf.toString("latin1"));
}

const safeName = (name: string) => name.replace(/[\\/:*?"<>|\r\n]/g, "_").slice(0, 180);

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY) return json({ ok: false, error: "tooLarge" }, 413);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "invalid" }, 400);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get("payload") ?? ""));
  } catch {
    return json({ ok: false, error: "invalid" }, 400);
  }

  // Anti-spam: campo trappola compilato o modulo inviato in meno di 3 secondi → successo finto, nessun invio
  const r = (raw && typeof raw === "object" ? raw : {}) as { website?: unknown; elapsedMs?: unknown };
  if (String(r.website ?? "").trim() || Number(r.elapsedMs ?? 0) < MIN_FILL_MS) return json({ ok: true, number: requestNumber() });

  if (rateLimited("quote", clientIp(request), RATE.max, RATE.windowMs)) return json({ ok: false, error: "rateLimited" }, 429);

  const { payload, fields } = validatePayload(raw);
  if (!payload) return json({ ok: false, error: "invalid", fields }, 400);

  const attachments: Attachment[] = [];
  const drawings: Attachment[] = [];
  const files: MailFiles = { attached: [], drawings: [], models: [], links: [] };
  let modelBytes = 0;
  for (const [key, value] of form.entries()) {
    if (!(value instanceof File) || attachments.length >= 40) continue;
    const name = safeName(value.name);
    const content = Buffer.from(await value.arrayBuffer());
    if (key === "files") {
      if (!isAcceptedFile(name) || value.size > MAX_FILE_BYTES) return json({ ok: false, error: "invalid", fields: ["files"] }, 400);
      attachments.push({ filename: name, content, contentType: value.type || undefined });
      files.attached.push(name);
    } else if (key === "drawings") {
      if (!name.toLowerCase().endsWith(".pdf") || !safeDrawing(content)) continue;
      const a = { filename: name, content, contentType: "application/pdf" };
      attachments.push(a);
      drawings.push(a);
      files.drawings.push(name);
    } else if (key === "models") {
      if (!isModelFile(name) || content.subarray(0, 4).toString("latin1") !== "glTF") continue;
      modelBytes += content.length;
      if (modelBytes > MAX_MODEL_ATTACH_BYTES) continue;
      attachments.push({ filename: name, content, contentType: "model/gltf-binary" });
      files.models.push(name);
    }
  }
  if (form.get("modelsSkipped") === "1") files.modelsSkipped = true;

  if (!mailProvider()) {
    console.error("[quote] nessun servizio email configurato (RESEND_API_KEY o SMTP_PASS)");
    return json({ ok: false, error: "notConfigured" }, 503);
  }

  const number = requestNumber();
  const to = process.env.QUOTE_TO_EMAIL || "info@tecnolambro.it";
  const bcc = process.env.QUOTE_BCC_EMAIL || undefined;
  // solo link dello store Blob del sito, nella cartella delle richieste
  const host = blobHost();
  files.links = (payload.blobs ?? [])
    .filter((b) => {
      const u = new URL(b.url);
      return host !== null && u.host === host && u.pathname.startsWith("/richieste/");
    })
    .map((b) => ({ name: b.name, url: b.url, kind: b.kind ?? "file" }));

  const record = { number, receivedAt: new Date().toISOString(), ...payload, website: undefined, elapsedMs: undefined, blobs: undefined, files };
  attachments.push({ filename: "richiesta.json", content: Buffer.from(JSON.stringify(record, null, 2)), contentType: "application/json" });

  const inbound = internalMail(payload, number, files);
  try {
    await sendMail({ to, bcc, replyTo: payload.customer.email, subject: inbound.subject, html: inbound.html, text: inbound.text, attachments }, { folder: number, name: "ufficio" });
  } catch (err) {
    if (err instanceof MailNotConfigured) return json({ ok: false, error: "notConfigured" }, 503);
    console.error("[quote] invio all'ufficio non riuscito", err);
    return json({ ok: false, error: "server" }, 502);
  }

  // Conferma al cliente, con i disegni: se fallisce la richiesta è comunque arrivata all'ufficio
  const outbound = customerMail(payload, number, drawings.length > 0);
  await sendMail({ to: payload.customer.email, subject: outbound.subject, html: outbound.html, text: outbound.text, attachments: drawings }, { folder: number, name: "cliente" }).catch((err) =>
    console.error("[quote] conferma al cliente non inviata", err),
  );

  const webhook = process.env.QUOTE_WEBHOOK_URL;
  if (webhook) {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
      signal: AbortSignal.timeout(5000),
    }).catch((err) => console.error("[quote] webhook non raggiunto", err));
  }

  return json({ ok: true, number });
}
