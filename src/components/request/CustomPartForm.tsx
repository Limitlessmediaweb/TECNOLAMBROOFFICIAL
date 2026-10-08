"use client";

import { useId, useState, type DragEvent } from "react";
import { Check, Plus, Upload, X } from "lucide-react";
import { useClientLocale, useT } from "@/lib/client-i18n";
import { SIZES } from "@/data/waveguides";
import { addItem } from "@/lib/request";
import { saveItemFiles } from "@/lib/request-files";
import { ACCEPTED_EXTENSIONS, MAX_FILE_BYTES, formatBytes, isAcceptedFile } from "@/lib/quote";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/cn";

/**
 * "Aggiungi un pezzo su disegno": descrizione, misura (anche "Non lo so"), frequenza, quantità e file.
 * Aggiunge una voce alla richiesta; i file restano nel browser (IndexedDB) fino all'invio.
 */
export function CustomPartForm({ onFilesChange, onAdded, addedNote }: { onFilesChange?: (files: File[]) => void; onAdded?: () => void; addedNote?: React.ReactNode }) {
  const t = useT("configurator");
  const locale = useClientLocale();
  const uid = useId();
  const [v, setV] = useState({ description: "", wr: "unknown", freq: "", qty: "1" });
  const [files, setFilesState] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [tried, setTried] = useState(false);
  const [added, setAdded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const descError = tried && v.description.trim().length < 5;

  const setFiles = (next: File[]) => {
    setFilesState(next);
    onFilesChange?.(next);
  };
  const addFiles = (list: FileList) => {
    const ok: File[] = [];
    const errs: string[] = [];
    for (const f of Array.from(list)) {
      if (!isAcceptedFile(f)) errs.push(t("fileType", { name: f.name }));
      else if (f.size > MAX_FILE_BYTES) errs.push(t("fileSize", { name: f.name }));
      else if (!files.some((p) => p.name === f.name && p.size === f.size)) ok.push(f);
    }
    setFiles([...files, ...ok].slice(0, 10));
    setErrors(errs);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const submit = async () => {
    setTried(true);
    if (v.description.trim().length < 5) return;
    const qty = Math.max(1, Math.floor(Number(v.qty)) || 1);
    const freq = v.freq.trim().replace(".", locale === "it" ? "," : ".");
    const detail = [t("types.custom.name"), v.wr === "unknown" ? t("sizeUnknown") : v.wr, freq ? `${freq} GHz` : ""].filter(Boolean).join(" · ");
    const id = addItem({ kind: "custom", code: t("customRef"), detail, qty, notes: v.description.trim() });
    if (files.length) {
      await saveItemFiles(id, files);
      track("quote_3d_upload", { source: "custom_part", files: files.length });
    }
    track("request_add", { kind: "custom" });
    setV({ description: "", wr: "unknown", freq: "", qty: "1" });
    setFiles([]);
    setTried(false);
    setAdded(true);
    onAdded?.();
  };

  return (
    <div className="grid gap-4" data-custom-form>
      <div className="field">
        <label htmlFor={`${uid}-desc`} className="field-label">
          {t("customDescription")}
        </label>
        <textarea
          id={`${uid}-desc`}
          rows={4}
          className="input resize-y"
          value={v.description}
          onChange={(e) => (setV({ ...v, description: e.target.value }), setAdded(false))}
          placeholder={t("customPlaceholder")}
          maxLength={3000}
          aria-invalid={descError ? true : undefined}
          aria-describedby={descError ? `${uid}-desc-err` : undefined}
          data-custom-field="description"
        />
        {descError ? (
          <p id={`${uid}-desc-err`} className="field-error">
            {t("customDescriptionError")}
          </p>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="field">
          <label htmlFor={`${uid}-wr`} className="field-label">
            {t("size")}
          </label>
          <select id={`${uid}-wr`} className="input font-mono" value={v.wr} onChange={(e) => setV({ ...v, wr: e.target.value })} data-custom-field="wr">
            <option value="unknown">{t("sizeUnknown")}</option>
            {SIZES.map((s) => (
              <option key={s.wr} value={s.wr}>
                {s.wr}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${uid}-freq`} className="field-label">
            {t("freqLabel")}
          </label>
          <input id={`${uid}-freq`} inputMode="decimal" autoComplete="off" className="input tabular" value={v.freq} onChange={(e) => setV({ ...v, freq: e.target.value })} data-custom-field="freq" />
        </div>
        <div className="field">
          <label htmlFor={`${uid}-qty`} className="field-label">
            {t("quantity")}
          </label>
          <input id={`${uid}-qty`} type="number" min={1} inputMode="numeric" className="input tabular" value={v.qty} onChange={(e) => setV({ ...v, qty: e.target.value })} data-custom-field="qty" />
        </div>
      </div>
      <div
        onDragOver={(e) => (e.preventDefault(), setDragging(true))}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn("grid justify-items-start gap-2 border border-dashed p-5 transition-colors", dragging ? "border-accent bg-[color-mix(in_srgb,var(--c-accent)_8%,transparent)]" : "border-line-strong")}
      >
        <input
          id={`${uid}-file`}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.join(",")}
          className="peer sr-only"
          aria-describedby={`${uid}-file-hint`}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
          data-custom-file-input
        />
        <label htmlFor={`${uid}-file`} className="btn btn-ghost cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
          <Upload aria-hidden="true" className="size-4" strokeWidth={1.75} />
          {t("customFiles")}
        </label>
        <p id={`${uid}-file-hint`} className="field-hint">
          {t("customFilesHint")}
        </p>
      </div>
      <div aria-live="polite">
        {errors.map((m) => (
          <p key={m} className="field-error">
            {m}
          </p>
        ))}
      </div>
      {files.length ? (
        <ul className="grid gap-2">
          {files.map((f) => (
            <li key={`${f.name}-${f.size}`} className="flex items-center justify-between gap-3 border border-line bg-surface px-3 py-2 text-sm">
              <span className="min-w-0 truncate font-mono">{f.name}</span>
              <span className="flex shrink-0 items-center gap-2 text-muted">
                {formatBytes(f.size, locale)}
                <button type="button" className="grid size-9 place-items-center rounded-full hover:text-error" aria-label={t("fileRemove", { name: f.name })} onClick={() => setFiles(files.filter((x) => x !== f))}>
                  <X aria-hidden="true" className="size-4" strokeWidth={1.75} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <button type="button" className="btn btn-primary justify-self-start" onClick={submit} data-add-custom>
        <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
        {t("add")}
      </button>
      <div aria-live="polite" className="min-h-6 text-sm">
        {added ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Check aria-hidden="true" className="size-4 text-ok" strokeWidth={2} />
            {t("added")}
            {addedNote}
          </p>
        ) : null}
      </div>
    </div>
  );
}
