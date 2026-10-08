"use client";

import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle, Paperclip, X } from "lucide-react";
import { splitTag, useClientLocale, useT } from "@/lib/client-i18n";
import { ACCEPTED_EXTENSIONS, MAX_FILE_BYTES, formatBytes, isAcceptedFile, saveSent, submitQuote, type SubmitReason } from "@/lib/quote";
import { EMAIL_RE } from "@/lib/quote-schema";
import { COMPANY } from "@/data/site";
import { requestMeta, track } from "@/lib/analytics";
import type { PrefillDetail } from "./BandFinder";
import { cn } from "@/lib/cn";

type Field = "name" | "email" | "message" | "privacy";

/**
 * Modulo breve (home, contatti, su misura): nome, email, telefono facoltativo, messaggio, file e privacy.
 * Crea una richiesta "su disegno" sulla stessa API di "La tua richiesta" e porta alla stessa conferma.
 */
export function ShortQuoteForm({ privacyHref, shopPath, sentPath }: { privacyHref: string; shopPath: string; sentPath: string }) {
  const t = useT("quote");
  const locale = useClientLocale();
  const router = useRouter();
  const uid = useId();
  const id = (n: string) => `${uid}-${n}`;
  const openedAt = useRef(0);
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const [v, setV] = useState({ name: "", email: "", phone: "", message: "" });
  const [privacy, setPrivacy] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "sending" | "error">("idle");
  const [reason, setReason] = useState<SubmitReason | null>(null);
  const [dragging, setDragging] = useState(false);
  const [prefilled, setPrefilled] = useState<string | null>(null);

  useEffect(() => {
    openedAt.current = Date.now();
    // dalla ricerca per frequenza: precompila il messaggio con misura e frequenza
    const onPrefill = (e: Event) => {
      const d = (e as CustomEvent<PrefillDetail>).detail;
      if (!d.size) return;
      const line = t("prefillLine", { size: d.size, freq: d.frequency ?? "" });
      setV((prev) => ({ ...prev, message: prev.message.includes(line) ? prev.message : `${line}\n${prev.message}`.trimEnd() }));
      setPrefilled(d.size);
    };
    window.addEventListener("tl:prefill", onPrefill);
    return () => window.removeEventListener("tl:prefill", onPrefill);
  }, [t]);

  const errors: Partial<Record<Field, string>> = {};
  if (v.name.trim().length < 2) errors.name = t("errors.name");
  if (!EMAIL_RE.test(v.email.trim())) errors.email = t("errors.email");
  if (v.message.trim().length < 10) errors.message = t("errors.message");
  if (!privacy) errors.privacy = t("errors.privacy");
  const errorCount = Object.keys(errors).length;
  const shown = (f: Field) => (submitted ? errors[f] : undefined);

  const addFiles = (list: FileList) => {
    const ok: File[] = [];
    const errs: string[] = [];
    for (const f of Array.from(list)) {
      if (!isAcceptedFile(f)) errs.push(`${f.name}: ${t("errors.fileType")}`);
      else if (f.size > MAX_FILE_BYTES) errs.push(`${f.name}: ${t("errors.fileSize")}`);
      else ok.push(f);
    }
    if (ok.length) track("quote_3d_upload", { source: "short_form", files: ok.length });
    setFiles((prev) => [...prev, ...ok.filter((f) => !prev.some((p) => p.name === f.name && p.size === f.size))].slice(0, 10));
    setFileErrors(errs);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
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
    const code = t("itemCode");
    const result = await submitQuote(
      {
        source: "contact",
        locale: locale === "en" ? "en" : "it",
        items: [{ kind: "contact", code, qty: 1, notes: "", files: files.map((f) => f.name) }],
        customer: { company: "", name: v.name.trim(), email: v.email.trim(), phone: v.phone.trim() || undefined, country: "" },
        message: v.message.trim(),
        privacy,
        meta: requestMeta(),
        elapsedMs: Date.now() - openedAt.current,
        website: honeypot,
      },
      { files },
      (s) => setStatus(s),
    );
    if (result.ok) {
      track("quote_submit_success", { source: "short_form", files: files.length });
      saveSent({
        number: result.number,
        date: new Date().toLocaleDateString(locale === "en" ? "en-GB" : "it-IT"),
        locale: locale === "en" ? "en" : "it",
        customer: { name: v.name.trim(), email: v.email.trim() },
        items: [{ code, qty: 1, detail: files.map((f) => f.name).join(", ") || undefined }],
      });
      router.push(sentPath);
      return;
    }
    track("quote_submit_error", { source: "short_form", reason: result.reason });
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
  const err = (f: Field) =>
    shown(f) ? (
      <p id={id(`${f}-error`)} className="field-error">
        {shown(f)}
      </p>
    ) : null;
  const described = (f: Field, hint?: string) => [hint, shown(f) ? id(`${f}-error`) : ""].filter(Boolean).join(" ") || undefined;

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-5" aria-label={t("formLabel")} data-short-form>
      <p ref={summaryRef} tabIndex={-1} role="alert" className={cn("field-error outline-none", !(submitted && errorCount) && "sr-only")}>
        {submitted && errorCount ? (errorCount === 1 ? t("errorSummaryOne") : t("errorSummaryOther", { count: errorCount })) : ""}
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="field">
          <label htmlFor={id("name")} className="field-label">
            {t("name")}
            {req}
          </label>
          <input id={id("name")} name="name" autoComplete="name" className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} aria-invalid={shown("name") ? true : undefined} aria-describedby={described("name")} required />
          {err("name")}
        </div>
        <div className="field">
          <label htmlFor={id("email")} className="field-label">
            {t("email")}
            {req}
          </label>
          <input id={id("email")} name="email" type="email" autoComplete="email" className="input" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} aria-invalid={shown("email") ? true : undefined} aria-describedby={described("email")} required />
          {err("email")}
        </div>
        <div className="field sm:col-span-2 sm:max-w-[calc(50%-0.625rem)]">
          <label htmlFor={id("phone")} className="field-label">
            {t("phone")}
            <span className="font-normal text-muted"> ({t("optional")})</span>
          </label>
          <input id={id("phone")} name="phone" type="tel" autoComplete="tel" className="input" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} />
        </div>
      </div>
      <div className="field">
        <label htmlFor={id("message")} className="field-label">
          {t("message")}
          {req}
        </label>
        <p id={id("message-hint")} className="field-hint">
          {t("messageHint")}
        </p>
        <textarea
          id={id("message")}
          name="message"
          rows={5}
          maxLength={5000}
          className="input resize-y"
          value={v.message}
          onChange={(e) => setV({ ...v, message: e.target.value })}
          aria-invalid={shown("message") ? true : undefined}
          aria-describedby={described("message", id("message-hint"))}
          required
        />
        {prefilled ? (
          <p className="text-sm text-primary-ink" role="status">
            {t("prefilled", { size: prefilled })}
          </p>
        ) : null}
        {err("message")}
      </div>
      <div
        onDragOver={(e) => (e.preventDefault(), setDragging(true))}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn("grid justify-items-start gap-2 border border-dashed p-5 transition-colors", dragging ? "border-accent bg-[color-mix(in_srgb,var(--c-accent)_8%,transparent)]" : "border-line-strong")}
      >
        <input
          id={id("file")}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.join(",")}
          className="peer sr-only"
          aria-describedby={id("file-hint")}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
          data-short-file
        />
        <label htmlFor={id("file")} className="btn btn-ghost cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
          <Paperclip aria-hidden="true" className="size-4" strokeWidth={1.75} />
          {t("file")}
        </label>
        <p id={id("file-hint")} className="field-hint">
          {t("fileHint")}
        </p>
      </div>
      <div aria-live="polite">
        {fileErrors.map((m) => (
          <p key={m} className="field-error">
            {m}
          </p>
        ))}
      </div>
      {files.length ? (
        <ul className="grid gap-2">
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

      {/* trappola anti-spam */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={id("website")}>Website</label>
        <input id={id("website")} name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="field">
        <div className="flex items-start gap-3">
          <input
            id={id("privacy")}
            type="checkbox"
            className="mt-1 size-5 shrink-0 accent-[var(--c-accent)]"
            checked={privacy}
            onChange={(e) => setPrivacy(e.target.checked)}
            aria-invalid={shown("privacy") ? true : undefined}
            aria-describedby={described("privacy")}
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

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <button type="submit" className="btn btn-primary" disabled={busy} aria-disabled={busy}>
          {busy ? (
            <>
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" strokeWidth={1.75} />
              {t("sending")}
            </>
          ) : (
            <>
              {t("submit")}
              <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
            </>
          )}
        </button>
        <NextLink href={`${shopPath}#configura`} className="tap font-medium text-primary-ink underline decoration-accent underline-offset-4 hover:text-accent" data-configure-link>
          {t("haveSize")}
        </NextLink>
      </div>
      {status === "error" && reason
        ? (() => {
            const [before, mail, after] = splitTag(t("errorSend", { reason: t(`reasons.${reason}`) }), "mail");
            return (
              <p role="alert" className="field-error text-base" data-send-error>
                {before}
                <a href={`mailto:${COMPANY.email}`} className="font-medium underline underline-offset-4">
                  {mail || COMPANY.email}
                </a>
                {after}
              </p>
            );
          })()
        : null}
    </form>
  );
}
