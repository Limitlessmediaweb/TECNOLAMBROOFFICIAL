"use client";

import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, FilePlus2, LoaderCircle, Minus, Paperclip, Plus, Trash2, X } from "lucide-react";
import { splitTag, useClientLocale, useT } from "@/lib/client-i18n";
import { addItem, clearDraft, clearRequest, loadDraft, removeItem, saveDraft, updateItem, useRequestItems, LAST_REQUEST_KEY, type CustomerDraft } from "@/lib/request";
import { ACCEPTED_EXTENSIONS, MAX_FILE_BYTES, formatBytes, isAcceptedFile, submitQuote, type SubmitReason } from "@/lib/quote";
import { EMAIL_RE } from "@/lib/quote-schema";
import { fileSafe } from "@/lib/part";
import { drawingDate, drawingSvg } from "@/lib/drawing";
import { OTHER_FLANGE } from "@/data/flanges";
import { track } from "@/lib/analytics";
import { useDrawingLabels } from "@/components/configurator/Configurator";
import { cn } from "@/lib/cn";

type Field = "company" | "name" | "email" | "country" | "privacy";
const EMPTY: CustomerDraft = { company: "", name: "", email: "", phone: "", country: "", vat: "" };

export function RequestForm({ privacyHref, sentPath, shopPath, familyNames }: { privacyHref: string; sentPath: string; shopPath: string; familyNames: Record<string, string> }) {
  const t = useT("request");
  const tc = useT("configurator");
  const locale = useClientLocale();
  const router = useRouter();
  const uid = useId();
  const id = (n: string) => `${uid}-${n}`;
  const labels = useDrawingLabels();
  const items = useRequestItems();
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const [customer, setCustomer] = useState<CustomerDraft>(EMPTY);
  const [privacy, setPrivacy] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "sending" | "error">("idle");
  const [reason, setReason] = useState<SubmitReason | null>(null);
  const [dragging, setDragging] = useState(false);

  // Bozza dei dati del cliente: non si perde se l'invio fallisce o la pagina si ricarica
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const d = loadDraft();
      if (d) setCustomer({ ...EMPTY, ...d });
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  const setC = (k: keyof CustomerDraft, v: string) => {
    const next = { ...customer, [k]: v };
    setCustomer(next);
    saveDraft(next);
  };

  /* ------------------------------------------------------------ validazione */
  const errors: Partial<Record<Field | "items", string>> = {};
  if (!items.length) errors.items = t("errors.items");
  const itemErrors: Record<string, string> = {};
  for (const i of items) {
    if (!Number.isInteger(i.qty) || i.qty < 1) itemErrors[i.id] = t("errors.quantity", { code: i.code });
    else if (i.kind === "custom" && i.notes.trim().length < 5) itemErrors[i.id] = t("errors.customNotes");
  }
  if (customer.company.trim().length < 2) errors.company = t("errors.company");
  if (customer.name.trim().length < 2) errors.name = t("errors.name");
  if (!EMAIL_RE.test(customer.email.trim())) errors.email = t("errors.email");
  if (customer.country.trim().length < 2) errors.country = t("errors.country");
  if (!privacy) errors.privacy = t("errors.privacy");
  const errorCount = Object.keys(errors).length + Object.keys(itemErrors).length;
  const shown = (f: Field) => (submitted ? errors[f] : undefined);

  /* ------------------------------------------------------------------ file */
  const addFiles = (list: FileList | File[]) => {
    const errs: string[] = [];
    const ok: File[] = [];
    for (const f of Array.from(list)) {
      if (!isAcceptedFile(f)) errs.push(t("fileType", { name: f.name }));
      else if (f.size > MAX_FILE_BYTES) errs.push(t("fileSize", { name: f.name }));
      else ok.push(f);
    }
    setFiles((prev) => [...prev, ...ok.filter((f) => !prev.some((p) => p.name === f.name && p.size === f.size))].slice(0, 20));
    setFileErrors(errs);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  /* ------------------------------------------------------------------ invio */
  const drawings = async (): Promise<File[]> => {
    const { drawingPdf } = await import("@/lib/pdf");
    const out: File[] = [];
    for (const i of items) {
      if (i.kind !== "configured" || !i.spec) continue;
      const s = i.spec;
      const fl = (x?: string | null) => (x === OTHER_FLANGE ? tc("flangeOther") : (x ?? null));
      const svg = drawingSvg({ wr: s.wr, twist: s.family === "twistable", lengthMm: s.lengthMm, flangeA: fl(s.flangeA), flangeB: fl(s.flangeB), code: i.code, locale, labels, palette: "print", date: drawingDate(locale) });
      try {
        const bytes = await drawingPdf(svg, { code: i.code, title: `${familyNames[s.family] ?? ""} – ${i.code}` }, 2);
        out.push(new File([bytes as BlobPart], `${fileSafe(i.code)}.pdf`, { type: "application/pdf" }));
      } catch {
        // Il disegno generato è un aiuto: se il browser non riesce a produrlo, la richiesta parte lo stesso.
      }
    }
    return out;
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const honeypot = String(new FormData(e.currentTarget).get("website") ?? "");
    setSubmitted(true);
    if (errorCount) {
      summaryRef.current?.focus();
      return;
    }
    setStatus("sending");
    setReason(null);
    const generated = await drawings();
    const result = await submitQuote(
      {
        source: "request",
        locale: locale === "en" ? "en" : "it",
        items: items.map((i) => ({ kind: i.kind, code: i.code, qty: i.qty, notes: i.notes, detail: i.detail })),
        customer: { ...customer, phone: customer.phone || undefined, vat: customer.vat || undefined },
        privacy,
        website: honeypot,
      },
      files,
      generated,
      (s) => setStatus(s),
    );
    if (result.ok) {
      track("request_submit", { items: items.length, files: files.length });
      try {
        window.sessionStorage.setItem(LAST_REQUEST_KEY, result.number);
      } catch {
        // ignorato
      }
      clearRequest();
      clearDraft();
      router.push(sentPath);
      return;
    }
    setReason(result.reason);
    setStatus("error");
  };

  const busy = status === "sending" || status === "uploading";
  const req = (
    <>
      <span aria-hidden="true" className="text-accent">
        {" "}
        *
      </span>
      <span className="sr-only"> ({t("required")})</span>
    </>
  );
  const opt = <span className="font-normal text-muted"> ({t("optional")})</span>;
  const err = (f: Field) =>
    shown(f) ? (
      <p id={id(`${f}-error`)} className="field-error">
        {shown(f)}
      </p>
    ) : null;
  const text = (f: "company" | "name" | "email" | "country", auto: string, type = "text") => (
    <div className="field">
      <label htmlFor={id(f)} className="field-label">
        {t(f)}
        {req}
      </label>
      <input
        id={id(f)}
        name={f}
        type={type}
        autoComplete={auto}
        className="input"
        value={customer[f]}
        onChange={(e) => setC(f, e.target.value)}
        aria-invalid={shown(f) ? true : undefined}
        aria-describedby={shown(f) ? id(`${f}-error`) : undefined}
        required
      />
      {err(f)}
    </div>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-12" aria-label={t("title")}>
      <p ref={summaryRef} tabIndex={-1} role="alert" className={cn("field-error outline-none", !(submitted && errorCount) && "sr-only")}>
        {submitted && errorCount ? (errorCount === 1 ? t("errorSummaryOne") : t("errorSummaryOther", { count: errorCount })) : ""}
      </p>

      {/* ----------------------------------------------------------- pezzi */}
      <section aria-labelledby={id("items")}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id={id("items")} className="text-display-m font-bold">
            {t("itemsTitle")}
          </h2>
          <div className="flex flex-wrap gap-2">
            <NextLink href={shopPath} className="btn btn-ghost btn-sm">
              <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
              {t("addMore")}
            </NextLink>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => addItem({ kind: "custom", code: t("customItemCode") })}>
              <FilePlus2 aria-hidden="true" className="size-4" strokeWidth={1.75} />
              {t("addCustom")}
            </button>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="mt-6 grid justify-items-start gap-3 border border-dashed border-line-strong p-8">
            <p className="text-lead">{t("empty")}</p>
            <p className="text-muted">{t("emptyBody")}</p>
            <NextLink href={shopPath} className="btn btn-primary">
              {t("emptyCta")}
              <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
            </NextLink>
            {submitted && errors.items ? <p className="field-error">{errors.items}</p> : null}
          </div>
        ) : (
          <ul className="mt-6 grid gap-4" data-request-items>
            {items.map((i) => (
              <li key={i.id} className={cn("grid gap-4 border bg-surface p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-6", submitted && itemErrors[i.id] ? "border-error" : "border-line")}>
                <div className="min-w-0">
                  <p className="break-words font-mono font-medium">{i.kind === "custom" ? t("customItem") : i.code}</p>
                  {i.detail ? <p className="mt-1 text-sm text-muted">{i.detail}</p> : null}
                </div>
                <div className="flex items-center gap-2 sm:justify-end">
                  <button type="button" className="grid size-10 place-items-center rounded-full border border-line-strong hover:border-accent" aria-label={t("decrease", { code: i.code })} onClick={() => updateItem(i.id, { qty: Math.max(1, i.qty - 1) })}>
                    <Minus aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  </button>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    className="input w-20 text-center tabular"
                    value={i.qty}
                    aria-label={t("quantityFor", { code: i.code })}
                    onChange={(e) => updateItem(i.id, { qty: Math.floor(Number(e.target.value)) || 0 })}
                  />
                  <button type="button" className="grid size-10 place-items-center rounded-full border border-line-strong hover:border-accent" aria-label={t("increase", { code: i.code })} onClick={() => updateItem(i.id, { qty: i.qty + 1 })}>
                    <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  </button>
                  <button type="button" className="ml-2 grid size-10 place-items-center rounded-full text-muted hover:text-error" aria-label={t("remove", { code: i.code })} onClick={() => removeItem(i.id)}>
                    <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  </button>
                </div>
                <div className="field sm:col-span-2">
                  <label htmlFor={id(`notes-${i.id}`)} className="field-label">
                    {t("notes")}
                    <span className="sr-only"> – {i.code}</span>
                  </label>
                  <textarea
                    id={id(`notes-${i.id}`)}
                    rows={2}
                    className="input resize-y"
                    placeholder={t("notesPlaceholder")}
                    value={i.notes}
                    maxLength={3000}
                    onChange={(e) => updateItem(i.id, { notes: e.target.value })}
                    aria-invalid={submitted && itemErrors[i.id] ? true : undefined}
                  />
                  {submitted && itemErrors[i.id] ? <p className="field-error">{itemErrors[i.id]}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm text-muted">{t("generatedNote")}</p>
      </section>

      {/* ----------------------------------------------------------- file */}
      <section aria-labelledby={id("files")}>
        <h2 id={id("files")} className="text-display-m font-bold">
          {t("filesTitle")}
        </h2>
        <p id={id("files-hint")} className="mt-2 text-muted">
          {t("filesHint")}
        </p>
        <div
          onDragOver={(e) => (e.preventDefault(), setDragging(true))}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn("mt-5 grid justify-items-start gap-3 border border-dashed p-6 transition-colors", dragging ? "border-accent bg-[color-mix(in_srgb,var(--c-accent)_8%,transparent)]" : "border-line-strong")}
        >
          <input
            ref={fileInput}
            id={id("file-input")}
            type="file"
            multiple
            accept={ACCEPTED_EXTENSIONS.join(",")}
            className="peer sr-only"
            aria-describedby={id("files-hint")}
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
            data-file-input
          />
          <label htmlFor={id("file-input")} className="btn btn-ghost cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
            <Paperclip aria-hidden="true" className="size-4" strokeWidth={1.75} />
            {t("filesButton")}
          </label>
          <span className="text-sm text-muted">{t("filesDrop")}</span>
        </div>
        <div aria-live="polite">
          {fileErrors.map((m) => (
            <p key={m} className="field-error mt-2">
              {m}
            </p>
          ))}
        </div>
        {files.length ? (
          <ul className="mt-4 grid gap-2" data-file-list>
            {files.map((f) => (
              <li key={`${f.name}-${f.size}`} className="flex items-center justify-between gap-3 border border-line bg-surface px-4 py-2 text-sm">
                <span className="min-w-0 truncate font-mono">{f.name}</span>
                <span className="flex shrink-0 items-center gap-3 text-muted">
                  {formatBytes(f.size, locale)}
                  <button type="button" className="grid size-9 place-items-center rounded-full hover:text-error" aria-label={t("fileRemove", { name: f.name })} onClick={() => setFiles((prev) => prev.filter((x) => x !== f))}>
                    <X aria-hidden="true" className="size-4" strokeWidth={1.75} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {/* ----------------------------------------------------------- cliente */}
      <section aria-labelledby={id("customer")}>
        <h2 id={id("customer")} className="text-display-m font-bold">
          {t("customerTitle")}
        </h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {text("company", "organization")}
          {text("name", "name")}
          {text("email", "email", "email")}
          <div className="field">
            <label htmlFor={id("phone")} className="field-label">
              {t("phone")}
              {opt}
            </label>
            <input id={id("phone")} name="phone" type="tel" autoComplete="tel" className="input" value={customer.phone} onChange={(e) => setC("phone", e.target.value)} />
          </div>
          {text("country", "country-name")}
          <div className="field">
            <label htmlFor={id("vat")} className="field-label">
              {t("vat")}
              {opt}
            </label>
            <input id={id("vat")} name="vat" autoComplete="off" spellCheck={false} className="input" value={customer.vat} onChange={(e) => setC("vat", e.target.value)} />
          </div>
        </div>

        {/* trappola anti-spam */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor={id("website")}>Website</label>
          <input id={id("website")} name="website" tabIndex={-1} autoComplete="off" />
        </div>

        <div className="field mt-6">
          <div className="flex items-start gap-3">
            <input
              id={id("privacy")}
              type="checkbox"
              className="mt-1 size-5 shrink-0 accent-[var(--c-accent)]"
              checked={privacy}
              onChange={(e) => setPrivacy(e.target.checked)}
              aria-invalid={shown("privacy") ? true : undefined}
              aria-describedby={shown("privacy") ? id("privacy-error") : undefined}
              required
            />
            <label htmlFor={id("privacy")} className="text-sm text-muted">
              {(() => {
                const [before, link, after] = splitTag(t("privacy"), "link");
                return (
                  <>
                    {before}
                    <NextLink href={privacyHref} className="text-fg underline hover:text-accent">
                      {link}
                    </NextLink>
                    {after}
                  </>
                );
              })()}
              {req}
            </label>
          </div>
          {err("privacy")}
        </div>
      </section>

      <div className="grid gap-4 border-t border-line pt-8">
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className="btn btn-primary" disabled={busy} aria-disabled={busy}>
            {busy ? (
              <>
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" strokeWidth={1.75} />
                {status === "uploading" ? t("uploading") : t("sending")}
              </>
            ) : (
              <>
                {t("submit")}
                <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
              </>
            )}
          </button>
          <p className="text-sm text-muted">{t("priceNote")}</p>
        </div>
        {status === "error" && reason ? (
          <p role="alert" className="field-error max-w-[70ch] text-base" data-send-error>
            {t("sendError", { reason: t(`reasons.${reason}`) })}
          </p>
        ) : null}
        <p className="text-sm text-muted">{t("shipping")}</p>
      </div>
    </form>
  );
}
