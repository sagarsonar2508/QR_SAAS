"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pause, Play, Save, Trash2 } from "lucide-react";
import { QR_TYPES, type FieldDef } from "@/lib/qr-types";
import { MODULE_SHAPES, SHAPE_LABELS, type ModuleShape } from "@/lib/qr-render";
import type { RedirectRules } from "@/lib/redirect-rules";
import SmartRedirects, {
  draftFromRules,
  rulesFromDraft,
  type DraftRules,
} from "./SmartRedirects";

type QrLite = {
  id: string;
  name: string;
  type: string;
  payload: Record<string, string>;
  active: boolean;
  isDynamic: boolean;
  shape: string;
  redirectRules: RedirectRules | null;
};

export default function QrActions({ qr }: { qr: QrLite }) {
  const router = useRouter();
  const def = QR_TYPES[qr.type];
  const smartEligible = qr.isDynamic && qr.type !== "feedback";
  const [name, setName] = useState(qr.name);
  const [shape, setShape] = useState(qr.shape);
  const [payload, setPayload] = useState<Record<string, string>>(qr.payload);
  const [rules, setRules] = useState<DraftRules>(() => draftFromRules(qr.redirectRules));
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function patch(body: object) {
    const res = await fetch(`/api/qrcodes/${qr.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Something went wrong");
    }
  }

  async function onSave() {
    setError(null);
    setSaving(true);
    setSaved(false);
    try {
      await patch({
        name,
        payload,
        shape,
        ...(smartEligible ? { redirectRules: rulesFromDraft(rules) } : {}),
      });
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function onToggleActive() {
    setToggling(true);
    try {
      await patch({ active: !qr.active });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setToggling(false);
    }
  }

  async function onDelete() {
    if (!confirm(`Delete "${qr.name}"? Anyone scanning the printed QR will hit a dead link. This cannot be undone.`)) {
      return;
    }
    const res = await fetch(`/api/qrcodes/${qr.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/qrcodes");
      router.refresh();
    }
  }

  function renderField(field: FieldDef) {
    if (field.input === "file") {
      // Re-uploading files is handled from the create flow for now.
      return (
        <input
          value={payload[field.key] ?? ""}
          onChange={(e) => setPayload((p) => ({ ...p, [field.key]: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      );
    }
    if (field.input === "textarea") {
      return (
        <textarea
          value={payload[field.key] ?? ""}
          rows={3}
          onChange={(e) => setPayload((p) => ({ ...p, [field.key]: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      );
    }
    if (field.input === "select") {
      return (
        <select
          value={payload[field.key] ?? field.options?.[0]?.value}
          onChange={(e) => setPayload((p) => ({ ...p, [field.key]: e.target.value }))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    return (
      <input
        type={field.input}
        value={payload[field.key] ?? ""}
        onChange={(e) => setPayload((p) => ({ ...p, [field.key]: e.target.value }))}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">
          {qr.isDynamic ? "Edit destination" : "Edit details"}
        </h2>
        <div className="flex items-center gap-2">
          {qr.isDynamic && (
            <button
              onClick={onToggleActive}
              disabled={toggling}
              className="inline-flex items-center gap-1.5 text-xs font-medium border border-gray-300 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50"
            >
              {qr.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {qr.active ? "Pause" : "Resume"}
            </button>
          )}
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 text-xs font-medium border border-red-200 rounded-lg px-3 py-1.5 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      {qr.isDynamic ? (
        <p className="text-xs text-gray-500 -mt-2">
          Change anything below and every printed copy of this QR instantly
          points to the new destination.
        </p>
      ) : (
        <p className="text-xs text-amber-600 -mt-2">
          This is a static QR — the data is baked into the image. Editing here
          only changes future downloads, not copies already printed.
        </p>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">QR name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Shape</label>
          <select
            value={shape}
            onChange={(e) => setShape(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {MODULE_SHAPES.map((s) => (
              <option key={s} value={s}>
                {SHAPE_LABELS[s as ModuleShape]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {def?.fields.map((field) => (
        <div key={field.key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-500"> *</span>}
          </label>
          {renderField(field)}
        </div>
      ))}

      {smartEligible && (
        <SmartRedirects
          value={rules}
          onChange={setRules}
          defaultOpen={!!qr.redirectRules}
        />
      )}

      <button
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg px-4 py-2 text-sm font-medium"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saved ? "Saved ✓" : "Save changes"}
      </button>
    </div>
  );
}
