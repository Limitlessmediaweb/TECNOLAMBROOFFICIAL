import { MailNotConfigured, customerMail, internalMail, mailProvider, sendMail, type Attachment } from "@/lib/quote-mail";
import { MAX_FILE_BYTES, isAcceptedFile, validatePayload, type QuoteResponse } from "@/lib/quote-schema";
import { blobHost, clientIp, rateLimited } from "@/lib/rate-limit";
import { randomInt } from "node:crypto";

/**
 * POST /api/quote — richiesta di preventivo (configuratore, "La tua richiesta", modulo contatti).
 * FormData: payload (JSON, vedi lib/quote-schema.ts) · files[] (file del cliente) · drawings[] (PDF generati).
 * Invia l'email a QUOTE_TO_EMAIL con gli allegati, la conferma al cliente e, se impostato,
 * la stessa richiesta in JSON a QUOTE_WEBHOOK_URL (futuro gestionale interno).
 */
export const runtime = "nodejs";

/** Corpo massimo accettato: Vercel rifiuta già sopra 4,5 MB. */
const MAX_BODY = 4.5 * 1024 * 1024;
const RATE = { windowMs: 10 * 60 * 1000, max: 5 };

function json(body: QuoteResponse, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * TL-2026-DDDNNNN: anno, giorno dell'anno (3 cifre) e 4 cifre casuali. Senza database non c'è
 * una numerazione progressiva; due richieste nello stesso giorno coincidono con probabilità 1/10.000.
 */
function requestNumber(now = new Date()): string {
  const day = Math.floor((now.getTime() - Date.UTC(now.getUTCFullYear(), 0, 1)) / 86400000) + 1;
  return `TL-${now.getUTCFullYear()}-${String(day).padStart(3, "0")}${String(randomInt(10000)).padStart(4, "0")}`;
}

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

  // Trappola anti-spam: risposta di successo, nessun invio
  if (raw && typeof raw === "object" && String((raw as { website?: unknown }).website ?? "").trim()) {
    return json({ ok: true, number: requestNumber() });
  }

  if (rateLimited("quote", clientIp(request), RATE.max, RATE.windowMs)) return json({ ok: false, error: "rateLimited" }, 429);

  const { payload, fields } = validatePayload(raw);
  if (!payload) return json({ ok: false, error: "invalid", fields }, 400);

  const attachments: Attachment[] = [];
  const names: string[] = [];
  for (const [key, value] of form.entries()) {
    if ((key !== "files" && key !== "drawings") || !(value instanceof File)) continue;
    if (!isAcceptedFile(value.name) || value.size > MAX_FILE_BYTES) return json({ ok: false, error: "invalid", fields: ["files"] }, 400);
    if (attachments.length >= 30) break;
    attachments.push({ filename: value.name.slice(0, 180), content: Buffer.from(await value.arrayBuffer()), contentType: value.type || undefined });
    names.push(value.name);
  }

  if (!mailProvider()) {
    console.error("[quote] nessun servizio email configurato (RESEND_API_KEY o SMTP_*)");
    return json({ ok: false, error: "notConfigured" }, 503);
  }

  const number = requestNumber();
  const to = process.env.QUOTE_TO_EMAIL || "info@tecnolambro.it";
  const bcc = process.env.QUOTE_BCC_EMAIL || undefined;
  // solo link dello store Blob del sito, nella cartella delle richieste
  const host = blobHost();
  const blobs = (payload.blobs ?? []).filter((b) => {
    const u = new URL(b.url);
    return host !== null && u.host === host && u.pathname.startsWith("/richieste/");
  });
  const files = { names, blobs: blobs.map((b) => ({ name: b.name, url: b.url })) };
  const inbound = internalMail(payload, number, files);
  try {
    await sendMail({ to, bcc, replyTo: payload.customer.email, subject: inbound.subject, html: inbound.html, text: inbound.text, attachments });
  } catch (err) {
    if (err instanceof MailNotConfigured) return json({ ok: false, error: "notConfigured" }, 503);
    console.error("[quote] invio all'ufficio non riuscito", err);
    return json({ ok: false, error: "server" }, 502);
  }

  // Conferma al cliente: se fallisce la richiesta è comunque arrivata all'ufficio
  const hasDrawings = form.getAll("drawings").length > 0;
  const outbound = customerMail(payload, number, hasDrawings);
  await sendMail({ to: payload.customer.email, subject: outbound.subject, html: outbound.html, text: outbound.text }).catch((err) =>
    console.error("[quote] conferma al cliente non inviata", err),
  );

  const webhook = process.env.QUOTE_WEBHOOK_URL;
  if (webhook) {
    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number, receivedAt: new Date().toISOString(), ...payload, website: undefined, files }),
      signal: AbortSignal.timeout(5000),
    }).catch((err) => console.error("[quote] webhook non raggiunto", err));
  }

  return json({ ok: true, number });
}
