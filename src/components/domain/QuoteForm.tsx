"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import NextLink from "next/link";
import { splitTag, useClientLocale, useT } from "@/lib/client-i18n";
import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";
import { WR_OPTIONS } from "@/data/bands";
import { ACCEPTED_EXTENSIONS, MAX_FILE_BYTES, formatBytes, isAcceptedFile, submitQuote } from "@/lib/quote";
import { track } from "@/lib/analytics";
import type { PrefillDetail } from "./BandFinder";
import { cn } from "@/lib/cn";

type FieldName = "name" | "company" | "email" | "country" | "family" | "quantity" | "frequency" | "message" | "file" | "privacy";
type Errors = Partial<Record<FieldName, string>>;
type Values = {
  name: string;
  company: string;
  email: string;
  phone: string;
  country: string;
  vat: string;
  family: string;
  size: string;
  frequency: string;
  quantity: string;
  message: string;
  privacy: boolean;
};

const EMPTY: Values = {
  name: "",
  company: "",
  email: "",
  phone: "",
  country: "",
  vat: "",
  family: "",
  size: "",
  frequency: "",
  quantity: "1",
  message: "",
  privacy: false,
};

const ORDER: FieldName[] = ["name", "company", "email", "country", "family", "frequency", "quantity", "message", "file", "privacy"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type FamilyOption = { value: string; label: string };

export function QuoteForm({ families, defaultFamily, privacyHref }: { families: FamilyOption[]; defaultFamily?: string; privacyHref: string }) {
  const t = useT("quote");
  const locale = useClientLocale();
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLParagraphElement>(null);

  const [values, setValues] = useState<Values>({ ...EMPTY, family: defaultFamily ?? "" });
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [demo, setDemo] = useState(false);
  const [prefilled, setPrefilled] = useState<string | null>(null);

  const validate = (v: Values, f: File | null): Errors => {
    const e: Errors = {};
    if (v.name.trim().length < 2) e.name = t("errors.name");
    if (v.company.trim().length < 2) e.company = t("errors.company");
    if (!EMAIL_RE.test(v.email.trim())) e.email = t("errors.email");
    if (v.country.trim().length < 2) e.country = t("errors.country");
    if (!v.family) e.family = t("errors.family");
    const q = Number(v.quantity);
    if (!Number.isInteger(q) || q < 1) e.quantity = t("errors.quantity");
    if (v.frequency.trim()) {
      const fr = Number(v.frequency.replace(",", "."));
      if (!Number.isFinite(fr) || fr < 1 || fr > 110) e.frequency = t("errors.frequency");
    }
    if (v.message.trim().length < 10) e.message = t("errors.message");
    if (f && !isAcceptedFile(f)) e.file = t("errors.fileType");
    else if (f && f.size > MAX_FILE_BYTES) e.file = t("errors.fileSize");
    if (!v.privacy) e.privacy = t("errors.privacy");
    return e;
  };

  // Precompilazione: dal BandFinder sulla stessa pagina o da ?misura=WR-90&ghz=10.5
  useEffect(() => {
    const apply = (detail: PrefillDetail) => {
      setValues((prev) => ({
        ...prev,
        size: detail.size ?? prev.size,
        frequency: detail.frequency ? detail.frequency.replace(".", locale === "it" ? "," : ".") : prev.frequency,
      }));
      if (detail.size) setPrefilled(detail.size);
    };
    // Letto dopo il primo frame: l'URL è uno stato esterno, non disponibile durante l'SSR.
    const raf = requestAnimationFrame(() => {
      const params = new URLSearchParams(window.location.search);
      const size = params.get("misura");
      const ghz = params.get("ghz");
      const fam = params.get("famiglia");
      if (size || ghz) apply({ size: size && WR_OPTIONS.includes(size) ? size : undefined, frequency: ghz ?? undefined });
      if (fam && families.some((f) => f.value === fam)) setValues((prev) => ({ ...prev, family: fam }));
      // Dallo shop ("Mi serve una variante su misura"): riferimento al codice nel messaggio
      const rif = params.get("rif");
      if (rif && /^[A-Z0-9-]{3,20}$/i.test(rif)) {
        setValues((prev) => (prev.message ? prev : { ...prev, message: t("variantOf", { code: rif }) }));
      }
    });
    const onPrefill = (e: Event) => apply((e as CustomEvent<PrefillDetail>).detail);
    window.addEventListener("tl:prefill", onPrefill);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("tl:prefill", onPrefill);
    };
  }, [families, locale, t]);

  const shown = (name: FieldName) => (submitted || touched[name] ? errors[name] : undefined);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    const next = { ...values, [key]: value };
    setValues(next);
    if (submitted || touched[key as FieldName]) setErrors(validate(next, file));
  };

  const blur = (name: FieldName) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors(validate(values, file));
  };

  const onFile = (f: File | null) => {
    setFile(f);
    setTouched((prev) => ({ ...prev, file: true }));
    setErrors(validate(values, f));
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    // Campo trappola per i bot: se compilato fingiamo il successo senza inviare nulla.
    if (String(data.get("website") ?? "")) {
      setStatus("success");
      return;
    }
    setSubmitted(true);
    const found = validate(values, file);
    setErrors(found);
    const firstInvalid = ORDER.find((n) => found[n]);
    if (firstInvalid) {
      summaryRef.current?.focus();
      window.setTimeout(() => document.getElementById(id(firstInvalid))?.focus(), 50);
      return;
    }
    setStatus("sending");
    const result = await submitQuote({
      name: values.name.trim(),
      company: values.company.trim(),
      email: values.email.trim(),
      phone: values.phone.trim() || undefined,
      country: values.country.trim(),
      vat: values.vat.trim() || undefined,
      family: values.family,
      size: values.size || undefined,
      frequency: values.frequency.trim() || undefined,
      quantity: Number(values.quantity),
      message: values.message.trim(),
      file,
      locale,
    });
    if (result.ok) {
      setDemo(result.demo);
      setStatus("success");
      track("quote_submit", { family: values.family, size: values.size || "none", file: Boolean(file) });
      window.setTimeout(() => statusRef.current?.focus(), 30);
    } else {
      setStatus("error");
    }
  };

  const reset = () => {
    setValues({ ...EMPTY, family: defaultFamily ?? "" });
    setFile(null);
    setErrors({});
    setTouched({});
    setSubmitted(false);
    setStatus("idle");
    setPrefilled(null);
    formRef.current?.reset();
  };

  if (status === "success") {
    return (
      <div ref={statusRef} tabIndex={-1} role="status" className="grid content-start gap-4 border border-line bg-surface p-6 outline-none sm:p-8">
        <CheckCircle2 aria-hidden="true" className="size-9 text-ok" strokeWidth={1.5} />
        <p className="text-display-s font-bold">{t("successTitle")}</p>
        <p className="text-muted">{t("successBody")}</p>
        {demo ? (
          <p className="text-sm">
            <span className="todo">{t("successDemo")}</span>
          </p>
        ) : null}
        <button type="button" onClick={reset} className="btn btn-ghost mt-2 justify-self-start">
          {t("again")}
        </button>
      </div>
    );
  }

  const errorCount = Object.keys(errors).length;
  const describe = (name: FieldName, hint?: boolean) =>
    [hint ? id(`${name}-hint`) : null, shown(name) ? id(`${name}-error`) : null].filter(Boolean).join(" ") || undefined;

  const err = (name: FieldName) =>
    shown(name) ? (
      <p id={id(`${name}-error`)} className="field-error">
        {shown(name)}
      </p>
    ) : null;

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

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate aria-label={t("formLabel")} className="grid gap-5 border border-line bg-surface p-5 sm:grid-cols-2 sm:p-7">
      <p ref={summaryRef} tabIndex={-1} role="alert" className={cn("field-error outline-none sm:col-span-2", !(submitted && errorCount) && "sr-only")}>
        {submitted && errorCount ? t(errorCount === 1 ? "errorSummaryOne" : "errorSummaryOther", { count: errorCount }) : ""}
      </p>

      {prefilled ? (
        <p className="annot rounded-sm border border-accent/50 bg-[color-mix(in_srgb,var(--c-accent)_10%,transparent)] px-3 py-2 text-fg sm:col-span-2" role="status">
          {t("prefilled", { size: prefilled })}
        </p>
      ) : null}

      <div className="field">
        <label htmlFor={id("name")} className="field-label">
          {t("name")}
          {req}
        </label>
        <input
          id={id("name")}
          name="name"
          autoComplete="name"
          className="input"
          value={values.name}
          onChange={(e) => set("name", e.target.value)}
          onBlur={() => blur("name")}
          aria-invalid={shown("name") ? true : undefined}
          aria-describedby={describe("name")}
          required
        />
        {err("name")}
      </div>

      <div className="field">
        <label htmlFor={id("company")} className="field-label">
          {t("company")}
          {req}
        </label>
        <input
          id={id("company")}
          name="company"
          autoComplete="organization"
          className="input"
          value={values.company}
          onChange={(e) => set("company", e.target.value)}
          onBlur={() => blur("company")}
          aria-invalid={shown("company") ? true : undefined}
          aria-describedby={describe("company")}
          required
        />
        {err("company")}
      </div>

      <div className="field">
        <label htmlFor={id("email")} className="field-label">
          {t("email")}
          {req}
        </label>
        <input
          id={id("email")}
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          className="input"
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
          onBlur={() => blur("email")}
          aria-invalid={shown("email") ? true : undefined}
          aria-describedby={describe("email")}
          required
        />
        {err("email")}
      </div>

      <div className="field">
        <label htmlFor={id("phone")} className="field-label">
          {t("phone")}
          {opt}
        </label>
        <input id={id("phone")} name="phone" type="tel" autoComplete="tel" className="input" value={values.phone} onChange={(e) => set("phone", e.target.value)} />
      </div>

      <div className="field">
        <label htmlFor={id("country")} className="field-label">
          {t("country")}
          {req}
        </label>
        <input
          id={id("country")}
          name="country"
          autoComplete="country-name"
          className="input"
          value={values.country}
          onChange={(e) => set("country", e.target.value)}
          onBlur={() => blur("country")}
          aria-invalid={shown("country") ? true : undefined}
          aria-describedby={describe("country")}
          required
        />
        {err("country")}
      </div>

      <div className="field">
        <label htmlFor={id("vat")} className="field-label">
          {t("vat")}
          {opt}
        </label>
        <p id={id("vat-hint")} className="field-hint">
          {t("vatHint")}
        </p>
        <input id={id("vat")} name="vat" autoComplete="off" spellCheck={false} className="input" value={values.vat} onChange={(e) => set("vat", e.target.value)} aria-describedby={id("vat-hint")} />
      </div>

      <div className="field">
        <label htmlFor={id("family")} className="field-label">
          {t("family")}
          {req}
        </label>
        <select
          id={id("family")}
          name="family"
          className="input"
          value={values.family}
          onChange={(e) => set("family", e.target.value)}
          onBlur={() => blur("family")}
          aria-invalid={shown("family") ? true : undefined}
          aria-describedby={describe("family")}
          required
        >
          <option value="">{t("familyPlaceholder")}</option>
          {families.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        {err("family")}
      </div>

      <div className="field">
        <label htmlFor={id("size")} className="field-label">
          {t("size")}
          {opt}
        </label>
        <select id={id("size")} name="size" className="input font-mono" value={values.size} onChange={(e) => set("size", e.target.value)}>
          <option value="">{t("sizeUnknown")}</option>
          {WR_OPTIONS.map((wr) => (
            <option key={wr} value={wr}>
              {wr}
            </option>
          ))}
          <option value="other">{t("sizeOther")}</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor={id("frequency")} className="field-label">
          {t("frequency")}
          {opt}
        </label>
        <input
          id={id("frequency")}
          name="frequency"
          inputMode="decimal"
          autoComplete="off"
          className="input tabular"
          value={values.frequency}
          onChange={(e) => set("frequency", e.target.value)}
          onBlur={() => blur("frequency")}
          aria-invalid={shown("frequency") ? true : undefined}
          aria-describedby={describe("frequency")}
        />
        {err("frequency")}
      </div>

      <div className="field">
        <label htmlFor={id("quantity")} className="field-label">
          {t("quantity")}
          {req}
        </label>
        <input
          id={id("quantity")}
          name="quantity"
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          className="input tabular"
          value={values.quantity}
          onChange={(e) => set("quantity", e.target.value)}
          onBlur={() => blur("quantity")}
          aria-invalid={shown("quantity") ? true : undefined}
          aria-describedby={describe("quantity")}
          required
        />
        {err("quantity")}
      </div>

      <div className="field sm:col-span-2">
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
          className="input resize-y"
          value={values.message}
          onChange={(e) => set("message", e.target.value)}
          onBlur={() => blur("message")}
          aria-invalid={shown("message") ? true : undefined}
          aria-describedby={describe("message", true)}
          required
        />
        {err("message")}
      </div>

      <div className="field sm:col-span-2">
        <label htmlFor={id("file")} className="field-label">
          {t("file")}
          {opt}
        </label>
        <p id={id("file-hint")} className="field-hint">
          {t("fileHint")}
        </p>
        <input
          id={id("file")}
          name="file"
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          className="input"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          aria-invalid={shown("file") ? true : undefined}
          aria-describedby={describe("file", true)}
        />
        {file && !errors.file ? (
          <p className="annot text-muted" aria-live="polite">
            {t("fileSelected", { name: file.name, size: formatBytes(file.size, locale) })}
          </p>
        ) : null}
        {err("file")}
      </div>

      {/* trappola anti-spam, invisibile a persone e tecnologie assistive */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={id("website")}>Website</label>
        <input id={id("website")} name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="field sm:col-span-2">
        <div className="flex items-start gap-3">
          <input
            id={id("privacy")}
            name="privacy"
            type="checkbox"
            className="mt-1 size-5 shrink-0 accent-[var(--c-accent)]"
            checked={values.privacy}
            onChange={(e) => set("privacy", e.target.checked)}
            onBlur={() => blur("privacy")}
            aria-invalid={shown("privacy") ? true : undefined}
            aria-describedby={describe("privacy")}
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

      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button type="submit" className="btn btn-primary" disabled={status === "sending"} aria-disabled={status === "sending"}>
          {status === "sending" ? (
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
        {status === "error" ? (
          <p role="alert" className="field-error">
            {t("errorSend")}
          </p>
        ) : null}
      </div>
    </form>
  );
}
