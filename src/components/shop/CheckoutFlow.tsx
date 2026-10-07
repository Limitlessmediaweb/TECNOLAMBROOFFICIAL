"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Globe2, LoaderCircle, User } from "lucide-react";
import { useCart } from "./CartProvider";
import { splitTag, useClientLocale, useT } from "@/lib/client-i18n";
import { formatMoney } from "@/lib/commerce/pricing";
import { CUSTOMER_TYPES, EU_COUNTRIES, computeTotals, isBusiness, type CustomerType } from "@/lib/commerce/tax";
import type { OrderCustomer } from "@/lib/order";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";

type Fields = Omit<OrderCustomer, "type"> & { privacy: boolean };
type FieldName = "company" | "name" | "email" | "vat" | "sdiOrPec" | "address" | "city" | "postalCode" | "country" | "privacy";

const EMPTY: Fields = { company: "", name: "", email: "", phone: "", vat: "", sdi: "", pec: "", address: "", city: "", postalCode: "", province: "", country: "", notes: "", privacy: false };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ORDER: FieldName[] = ["company", "name", "email", "vat", "sdiOrPec", "address", "city", "postalCode", "country", "privacy"];
export const LAST_ORDER_KEY = "tl-last-order";

const TYPE_ICONS: Record<CustomerType, typeof Building2> = {
  business_it: Building2,
  private_it: User,
  business_eu: Building2,
  private_eu: User,
  extra_eu: Globe2,
};

/**
 * Checkout in 3 passi: 1 tipo di cliente · 2 dati · 3 riepilogo con spedizione e IVA.
 * Provider locale: invia una richiesta d'ordine (lib/order.ts), nessun pagamento.
 * Provider Shopify: il pulsante finale porta al checkoutUrl di Shopify.
 */
export function CheckoutFlow({ privacyHref, shopPath, sentPath }: { privacyHref: string; shopPath: string; sentPath: string }) {
  const t = useT("checkout");
  const tc = useT("cart");
  const locale = useClientLocale();
  const router = useRouter();
  const { cart, ensureCart, mode, reset } = useCart();
  const uid = useId();
  const id = (n: string) => `${uid}-${n}`;
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [type, setType] = useState<CustomerType>("business_it");
  const [v, setV] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);

  useEffect(() => {
    void ensureCart().catch(() => undefined);
    track("begin_checkout");
  }, [ensureCart]);

  // Ogni cambio di passo: il focus va sul titolo del passo (lettori di schermo e tastiera)
  const goTo = (s: 1 | 2 | 3) => {
    setStep(s);
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const business = isBusiness(type);
  const italy = type === "business_it" || type === "private_it";
  const eu = type === "business_eu" || type === "private_eu";
  const totals = useMemo(() => computeTotals(cart?.subtotal.amount ?? 0, type), [cart, type]);
  const countryNames = useMemo(() => new Intl.DisplayNames([locale === "it" ? "it" : "en"], { type: "region" }), [locale]);

  const validate = (f: Fields): Partial<Record<FieldName, string>> => {
    const e: Partial<Record<FieldName, string>> = {};
    if (business && (f.company ?? "").trim().length < 2) e.company = t("errors.company");
    if (f.name.trim().length < 2) e.name = t("errors.name");
    if (!EMAIL_RE.test(f.email.trim())) e.email = t("errors.email");
    if (business) {
      const vat = (f.vat ?? "").replace(/\s/g, "").toUpperCase();
      if (type === "business_it" && !/^(IT)?\d{11}$/.test(vat)) e.vat = t("errors.vatIt");
      if (type === "business_eu" && !/^[A-Z]{2}[0-9A-Z]{2,13}$/.test(vat)) e.vat = t("errors.vatEu");
    }
    if (type === "business_it") {
      const sdiOk = /^[A-Z0-9]{7}$/i.test((f.sdi ?? "").trim());
      const pecOk = EMAIL_RE.test((f.pec ?? "").trim());
      if (!sdiOk && !pecOk) e.sdiOrPec = t("errors.sdiOrPec");
    }
    if (f.address.trim().length < 3) e.address = t("errors.address");
    if (f.city.trim().length < 2) e.city = t("errors.city");
    if (f.postalCode.trim().length < 3) e.postalCode = t("errors.postalCode");
    if (!italy && f.country.trim().length < 2) e.country = t("errors.country");
    return e;
  };

  const set = <K extends keyof Fields>(k: K, value: Fields[K]) => {
    const next = { ...v, [k]: value };
    setV(next);
    if (submitted) setErrors(validate(next));
  };

  const onDetails = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const found = validate(v);
    setErrors(found);
    const first = ORDER.find((n) => found[n]);
    if (first) {
      document.getElementById(id(first === "sdiOrPec" ? "sdi" : first))?.focus();
      return;
    }
    goTo(3);
  };

  const onConfirm = async (e: FormEvent) => {
    e.preventDefault();
    if (!v.privacy) {
      setErrors({ privacy: t("errors.privacy") });
      document.getElementById(id("privacy"))?.focus();
      return;
    }
    if (!cart || cart.lines.length === 0) return;
    setSending(true);
    setSendError(false);
    try {
      if (mode === "shopify") {
        if (cart.checkoutUrl) window.location.href = cart.checkoutUrl;
        return;
      }
      const { localProvider } = await import("@/lib/commerce/local");
      const customer: OrderCustomer = {
        type,
        company: business ? v.company : undefined,
        name: v.name.trim(),
        email: v.email.trim(),
        phone: v.phone?.trim() || undefined,
        vat: business ? v.vat?.replace(/\s/g, "").toUpperCase() : undefined,
        sdi: type === "business_it" ? v.sdi?.trim() || undefined : undefined,
        pec: type === "business_it" ? v.pec?.trim() || undefined : undefined,
        address: v.address.trim(),
        city: v.city.trim(),
        postalCode: v.postalCode.trim(),
        province: italy ? v.province?.trim() || undefined : undefined,
        country: italy ? "IT" : v.country.trim(),
        notes: v.notes?.trim() || undefined,
      };
      const result = await localProvider.checkout(cart, { customer, cart, totals, locale });
      if (result.type === "order_request") {
        track("order_request_submit", { type, items: cart.totalQuantity, rule: totals.rule });
        try {
          sessionStorage.setItem(
            LAST_ORDER_KEY,
            JSON.stringify({ number: result.orderNumber, demo: result.demo, total: totals.total, email: customer.email }),
          );
        } catch {
          /* ignora */
        }
        reset();
        router.push(sentPath);
      }
    } catch {
      setSendError(true);
      setSending(false);
    }
  };

  const err = (n: FieldName) =>
    errors[n] ? (
      <p id={id(`${n}-error`)} className="field-error">
        {errors[n]}
      </p>
    ) : null;
  const inv = (n: FieldName) => (errors[n] ? { "aria-invalid": true as const, "aria-describedby": id(`${n}-error`) } : {});
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

  if (cart && cart.lines.length === 0) {
    return (
      <div className="grid justify-items-start gap-4 border border-dashed border-line-strong p-8">
        <p>{t("emptyCart")}</p>
        <NextLink href={shopPath} className="btn btn-primary">
          <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />
          {tc("emptyCta")}
        </NextLink>
      </div>
    );
  }

  const errorCount = Object.keys(errors).length;

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
      <div className="lg:col-span-7">
        <ol aria-label={t("stepsLabel")} className="mb-8 grid grid-cols-3 gap-2">
          {[t("step1"), t("step2"), t("step3")].map((label, i) => {
            const n = (i + 1) as 1 | 2 | 3;
            const current = n === step;
            const done = n < step;
            return (
              <li key={label} aria-current={current ? "step" : undefined} className={cn("border-t-2 pt-2 text-sm", current ? "border-accent font-semibold" : done ? "border-primary text-muted" : "border-line text-muted")}>
                <span className="annot block">{n}</span>
                {label}
              </li>
            );
          })}
        </ol>

        <h2 ref={headingRef} tabIndex={-1} className="mb-6 text-display-s font-bold outline-none">
          <span className="sr-only">{t("step", { n: step })}: </span>
          {step === 1 ? t("customerType") : step === 2 ? t("step2") : t("step3")}
        </h2>

        {step === 1 ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              goTo(2);
            }}
          >
            <fieldset>
              <legend className="sr-only">{t("customerType")}</legend>
              <div className="grid gap-3">
                {CUSTOMER_TYPES.map((ct) => {
                  const Icon = TYPE_ICONS[ct];
                  return (
                    <label key={ct} className="flex cursor-pointer items-start gap-4 border border-line bg-surface p-4 transition-colors hover:border-accent has-[:checked]:border-accent has-[:checked]:bg-surface-2">
                      <input type="radio" name={id("type")} value={ct} checked={type === ct} onChange={() => setType(ct)} className="mt-1 size-5 accent-[var(--c-accent)]" />
                      <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={1.75} />
                      <span>
                        <span className="block font-semibold">{t(`types.${ct}`)}</span>
                        <span className="block text-sm text-muted">{t(`typesHint.${ct}`)}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <button type="submit" className="btn btn-primary mt-8">
              {t("next")}
              <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
            </button>
          </form>
        ) : null}

        {step === 2 ? (
          <form onSubmit={onDetails} noValidate className="grid gap-5 sm:grid-cols-2">
            <p role="alert" className={cn("field-error sm:col-span-2", !(submitted && errorCount) && "sr-only")}>
              {submitted && errorCount ? (errorCount === 1 ? t("errorSummaryOne") : t("errorSummaryOther", { count: errorCount })) : ""}
            </p>
            {business ? (
              <div className="field sm:col-span-2">
                <label htmlFor={id("company")} className="field-label">
                  {t("company")}
                  {req}
                </label>
                <input id={id("company")} className="input" autoComplete="organization" value={v.company} onChange={(e) => set("company", e.target.value)} {...inv("company")} />
                {err("company")}
              </div>
            ) : null}
            <div className="field">
              <label htmlFor={id("name")} className="field-label">
                {business ? t("contactName") : t("name")}
                {req}
              </label>
              <input id={id("name")} className="input" autoComplete="name" value={v.name} onChange={(e) => set("name", e.target.value)} {...inv("name")} />
              {err("name")}
            </div>
            <div className="field">
              <label htmlFor={id("email")} className="field-label">
                {t("email")}
                {req}
              </label>
              <input id={id("email")} type="email" className="input" autoComplete="email" spellCheck={false} value={v.email} onChange={(e) => set("email", e.target.value)} {...inv("email")} />
              {err("email")}
            </div>
            <div className="field">
              <label htmlFor={id("phone")} className="field-label">
                {t("phone")}
                {opt}
              </label>
              <input id={id("phone")} type="tel" className="input" autoComplete="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            {business ? (
              <div className="field">
                <label htmlFor={id("vat")} className="field-label">
                  {t("vat")}
                  {req}
                </label>
                <p id={id("vat-hint")} className="field-hint">
                  {type === "business_it" ? t("vatHintIt") : t("vatHintEu")}
                </p>
                <input
                  id={id("vat")}
                  className="input font-mono"
                  autoComplete="off"
                  spellCheck={false}
                  value={v.vat}
                  onChange={(e) => set("vat", e.target.value)}
                  aria-invalid={errors.vat ? true : undefined}
                  aria-describedby={[id("vat-hint"), errors.vat ? id("vat-error") : ""].filter(Boolean).join(" ")}
                />
                {err("vat")}
              </div>
            ) : null}
            {type === "business_it" ? (
              <fieldset className="grid gap-3 border border-line p-4 sm:col-span-2" aria-describedby={id("sdi-hint")}>
                <legend className="field-label px-1">
                  {t("sdi")} / {t("pec")}
                  {req}
                </legend>
                <p id={id("sdi-hint")} className="field-hint">
                  {t("sdiOrPec")}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="field">
                    <label htmlFor={id("sdi")} className="field-label">
                      {t("sdi")}
                    </label>
                    <input id={id("sdi")} className="input font-mono uppercase" maxLength={7} autoComplete="off" value={v.sdi} onChange={(e) => set("sdi", e.target.value)} {...inv("sdiOrPec")} />
                  </div>
                  <div className="field">
                    <label htmlFor={id("pec")} className="field-label">
                      {t("pec")}
                    </label>
                    <input id={id("pec")} type="email" className="input" autoComplete="off" value={v.pec} onChange={(e) => set("pec", e.target.value)} {...inv("sdiOrPec")} />
                  </div>
                </div>
                {err("sdiOrPec")}
              </fieldset>
            ) : null}
            <div className="field sm:col-span-2">
              <label htmlFor={id("address")} className="field-label">
                {t("address")}
                {req}
              </label>
              <input id={id("address")} className="input" autoComplete="street-address" value={v.address} onChange={(e) => set("address", e.target.value)} {...inv("address")} />
              {err("address")}
            </div>
            <div className="field">
              <label htmlFor={id("city")} className="field-label">
                {t("city")}
                {req}
              </label>
              <input id={id("city")} className="input" autoComplete="address-level2" value={v.city} onChange={(e) => set("city", e.target.value)} {...inv("city")} />
              {err("city")}
            </div>
            <div className="field">
              <label htmlFor={id("postalCode")} className="field-label">
                {t("postalCode")}
                {req}
              </label>
              <input id={id("postalCode")} className="input" autoComplete="postal-code" value={v.postalCode} onChange={(e) => set("postalCode", e.target.value)} {...inv("postalCode")} />
              {err("postalCode")}
            </div>
            {italy ? (
              <div className="field">
                <label htmlFor={id("province")} className="field-label">
                  {t("province")}
                  {opt}
                </label>
                <input id={id("province")} className="input uppercase" maxLength={2} autoComplete="address-level1" value={v.province} onChange={(e) => set("province", e.target.value)} />
              </div>
            ) : (
              <div className="field">
                <label htmlFor={id("country")} className="field-label">
                  {t("country")}
                  {req}
                </label>
                {eu ? (
                  <select id={id("country")} className="input" value={v.country} onChange={(e) => set("country", e.target.value)} {...inv("country")}>
                    <option value="">{t("countryPlaceholder")}</option>
                    {EU_COUNTRIES.map((c) => (
                      <option key={c} value={c}>
                        {countryNames.of(c)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input id={id("country")} className="input" autoComplete="country-name" value={v.country} onChange={(e) => set("country", e.target.value)} {...inv("country")} />
                )}
                {err("country")}
              </div>
            )}
            <div className="field sm:col-span-2">
              <label htmlFor={id("notes")} className="field-label">
                {t("notes")}
                {opt}
              </label>
              <textarea id={id("notes")} rows={3} className="input resize-y" value={v.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <button type="button" onClick={() => goTo(1)} className="btn btn-ghost">
                <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />
                {t("back")}
              </button>
              <button type="submit" className="btn btn-primary">
                {t("next")}
                <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.75} />
              </button>
            </div>
          </form>
        ) : null}

        {step === 3 ? (
          <form onSubmit={onConfirm} noValidate className="grid gap-6">
            <section aria-labelledby={id("cust")} className="border border-line bg-surface p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 id={id("cust")} className="font-semibold">
                  {t("customer")}
                </h3>
                <button type="button" onClick={() => goTo(2)} className="text-sm underline decoration-accent underline-offset-4 hover:text-accent">
                  {t("edit")}
                </button>
              </div>
              <p className="mt-2 text-sm text-muted">
                {t(`types.${type}`)}
                <br />
                {business ? `${v.company} · ` : ""}
                {v.name} · {v.email}
                {business && v.vat ? (
                  <>
                    <br />
                    {t("vat")}: <span className="font-mono">{v.vat.toUpperCase()}</span>
                  </>
                ) : null}
                <br />
                {v.address}, {v.postalCode} {v.city} {italy ? (v.province ? `(${v.province.toUpperCase()})` : "") : `· ${eu ? countryNames.of(v.country) : v.country}`}
              </p>
            </section>
            <p className="text-sm">{t("noPayment")}</p>
            <div className="field">
              <div className="flex items-start gap-3">
                <input
                  id={id("privacy")}
                  type="checkbox"
                  className="mt-1 size-5 shrink-0 accent-[var(--c-accent)]"
                  checked={v.privacy}
                  onChange={(e) => {
                    set("privacy", e.target.checked);
                    if (e.target.checked) setErrors({});
                  }}
                  {...inv("privacy")}
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
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => goTo(2)} className="btn btn-ghost">
                <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.75} />
                {t("back")}
              </button>
              <button type="submit" className="btn btn-primary" disabled={sending || !cart}>
                {sending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" strokeWidth={1.75} /> : null}
                {sending ? t("sending") : mode === "shopify" ? t("submitShopify") : t("submitLocal")}
              </button>
            </div>
            {sendError ? (
              <p role="alert" className="field-error">
                {t("sendError")}
              </p>
            ) : null}
          </form>
        ) : null}
      </div>

      <aside className="lg:col-span-5" aria-labelledby={id("summary")}>
        <div className="grid gap-4 border border-line bg-surface p-5 sm:p-6 lg:sticky lg:top-28">
          <h2 id={id("summary")} className="font-semibold">
            {t("summary")}
          </h2>
          <ul className="grid gap-3 text-sm">
            {(cart?.lines ?? []).map((l) => (
              <li key={l.id} className="flex justify-between gap-4">
                <span>
                  <span className="annot block text-primary-ink">{l.code}</span>
                  {l.quantity} × {l.title}
                </span>
                <span className="tabular whitespace-nowrap">{formatMoney(l.lineTotal, locale)}</span>
              </li>
            ))}
          </ul>
          <dl className="grid gap-2 border-t border-line pt-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt>{t("subtotal")}</dt>
              <dd className="tabular">{formatMoney(totals.subtotal, locale)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>
                {t("shipping")} · {t(`shippingZone.${totals.zone}`)} <span className="annot text-muted">({t("shippingDemo")})</span>
              </dt>
              <dd className="tabular">{formatMoney(totals.shipping, locale)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>
                {t("vatTotal")} {Math.round(totals.vatRate * 100)}%
              </dt>
              <dd className="tabular">{formatMoney(totals.vat, locale)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-line pt-3 text-base font-semibold">
              <dt>{t("total")}</dt>
              <dd className="tabular font-display text-display-s font-bold">{formatMoney(totals.total, locale)}</dd>
            </div>
          </dl>
          <p className="border-l-2 border-primary pl-3 text-sm text-muted" data-vat-rule={totals.rule}>
            {t(`rule.${totals.rule}`)}
          </p>
        </div>
      </aside>
    </div>
  );
}
