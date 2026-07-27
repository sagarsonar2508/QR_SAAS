"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, Loader2, UploadCloud, X } from "lucide-react";
import {
  QR_TYPES,
  buildStaticContent,
  type FieldDef,
} from "@/lib/qr-types";
import {
  MODULE_SHAPES,
  SHAPE_LABELS,
  renderHalftoneQrSvg,
  renderQrSvg,
} from "@/lib/qr-render";
import TypeIcon from "./TypeIcon";
import SmartRedirects, {
  draftFromRules,
  rulesFromDraft,
  type DraftRules,
} from "./SmartRedirects";

const EC_LEVELS = [
  { value: "L", label: "L — smallest" },
  { value: "M", label: "M — standard" },
  { value: "Q", label: "Q — robust" },
  { value: "H", label: "H — max (use with logos/print)" },
];

export default function NewQrWizard({ appUrl }: { appUrl: string }) {
  const router = useRouter();
  const [type, setType] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [payload, setPayload] = useState<Record<string, string>>({});
  const [fgColor, setFgColor] = useState("#111827");
  const [bgColor, setBgColor] = useState("#FFFFFF");
  const [ecLevel, setEcLevel] = useState("M");
  const [shape, setShape] = useState("square");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [blendUrl, setBlendUrl] = useState<string | null>(null);
  const [blendDataUrl, setBlendDataUrl] = useState<string | null>(null);
  const [blendUploading, setBlendUploading] = useState(false);
  const [rules, setRules] = useState<DraftRules>(() => draftFromRules(null));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);

  const def = type ? QR_TYPES[type] : null;

  // Live preview: dynamic QRs encode the (future) short URL, so a placeholder
  // code is representative; static QRs encode real payload content.
  const previewContent = useMemo(() => {
    if (!def || !type) return null;
    if (!def.isStatic) return `${appUrl}/Ab8K29x`;
    return buildStaticContent(type, payload) || `${appUrl}`;
  }, [def, type, payload, appUrl]);

  const previewSvg = useMemo(() => {
    if (!previewContent) return null;
    try {
      if (blendDataUrl) {
        return renderHalftoneQrSvg(previewContent, {
          imageDataUrl: blendDataUrl,
          fg: fgColor,
          bg: bgColor,
          logoDataUrl,
          size: 480,
        });
      }
      return renderQrSvg(previewContent, {
        fg: fgColor,
        bg: bgColor,
        ecLevel,
        shape,
        logoDataUrl,
        size: 480,
      });
    } catch {
      return null;
    }
  }, [previewContent, fgColor, bgColor, ecLevel, shape, logoDataUrl, blendDataUrl]);

  async function uploadFile(field: FieldDef, file: File) {
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) {
      setError(data.error ?? "Upload failed");
      return;
    }
    setPayload((p) => ({ ...p, [field.key]: data.url }));
  }

  async function uploadBlendImage(file: File) {
    setBlendUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBlendUploading(false);
      setError(data.error ?? "Photo upload failed");
      return;
    }
    setBlendUrl(data.url);
    const blob = await fetch(data.url).then((r) => r.blob());
    const reader = new FileReader();
    reader.onload = () => {
      setBlendDataUrl(reader.result as string);
      setBlendUploading(false);
    };
    reader.readAsDataURL(blob);
  }

  async function uploadLogo(file: File) {
    setLogoUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setLogoUploading(false);
      setError(data.error ?? "Logo upload failed");
      return;
    }
    setLogoUrl(data.url);
    // Inline as data URL for the client-side SVG preview.
    const blob = await fetch(data.url).then((r) => r.blob());
    const reader = new FileReader();
    reader.onload = () => {
      setLogoDataUrl(reader.result as string);
      setLogoUploading(false);
    };
    reader.readAsDataURL(blob);
  }

  async function onCreate() {
    setError(null);
    setSaving(true);
    const res = await fetch("/api/qrcodes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        name,
        payload,
        fgColor,
        bgColor,
        ecLevel,
        shape,
        logoUrl,
        blendImageUrl: blendUrl,
        redirectRules: rulesFromDraft(rules),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setSaving(false);
      return;
    }
    router.push(`/qrcodes/${data.id}`);
  }

  if (!type) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Create a QR code</h1>
        <p className="text-sm text-gray-500 mb-6">What should happen when it&apos;s scanned?</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(QR_TYPES).map(([key, t]) => (
            <button
              key={key}
              onClick={() => {
                setType(key);
                setPayload(key === "wifi" ? { encryption: "WPA" } : {});
              }}
              className="bg-white rounded-2xl border border-gray-200 hover:border-indigo-400 hover:shadow-sm p-4 text-left transition-all"
            >
              <span className="inline-flex bg-indigo-50 text-indigo-600 rounded-lg p-2 mb-2">
                <TypeIcon type={key} className="w-5 h-5" />
              </span>
              <p className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                {t.label}
                {t.isStatic && (
                  <span className="bg-amber-50 text-amber-700 text-[10px] font-medium rounded px-1.5 py-0.5">
                    STATIC
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Static QR codes (WiFi, Contact Card) encode data directly — they work
          offline but can&apos;t be edited after printing and don&apos;t track scans.
          All other types are dynamic: change the destination anytime.
        </p>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setType(null)}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> All types
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2.5">
        <span className="bg-indigo-50 text-indigo-600 rounded-lg p-2">
          <TypeIcon type={type} className="w-5 h-5" />
        </span>
        New {def!.label} QR code
      </h1>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              QR name (only you see this)
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`e.g. ${def!.label} — front counter`}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {def!.fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                {field.required && <span className="text-red-500"> *</span>}
              </label>
              {field.input === "textarea" ? (
                <textarea
                  value={payload[field.key] ?? ""}
                  onChange={(e) =>
                    setPayload((p) => ({ ...p, [field.key]: e.target.value }))
                  }
                  rows={3}
                  placeholder={field.placeholder}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              ) : field.input === "select" ? (
                <select
                  value={payload[field.key] ?? field.options?.[0]?.value}
                  onChange={(e) =>
                    setPayload((p) => ({ ...p, [field.key]: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {field.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : field.input === "file" ? (
                <label className="flex items-center gap-3 border border-dashed border-gray-300 rounded-lg px-4 py-3 cursor-pointer hover:border-indigo-400">
                  {uploading ? (
                    <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                  ) : (
                    <UploadCloud className="w-5 h-5 text-gray-400" />
                  )}
                  <span className="text-sm text-gray-600 truncate">
                    {payload[field.key]
                      ? `Uploaded ✓ (${payload[field.key].split("/").pop()})`
                      : "Click to upload (max 10 MB)"}
                  </span>
                  <input
                    type="file"
                    accept={field.accept}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadFile(field, f);
                    }}
                  />
                </label>
              ) : (
                <input
                  type={field.input}
                  value={payload[field.key] ?? ""}
                  onChange={(e) =>
                    setPayload((p) => ({ ...p, [field.key]: e.target.value }))
                  }
                  placeholder={field.placeholder}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}
            </div>
          ))}

          {!def!.isStatic && type !== "feedback" && (
            <SmartRedirects value={rules} onChange={setRules} />
          )}

          <div className="pt-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photo QR{" "}
              <span className="ml-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] font-bold rounded-full px-2 py-0.5 align-middle">
                NEW
              </span>
            </label>
            {blendUrl ? (
              <div className="flex items-center gap-3 border border-gray-200 rounded-lg px-3 py-2.5">
                {blendDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={blendDataUrl}
                    alt="Blend"
                    className="w-8 h-8 rounded object-cover"
                  />
                )}
                <span className="text-sm text-gray-600 flex-1">
                  Photo blended into the QR ✓
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setBlendUrl(null);
                    setBlendDataUrl(null);
                  }}
                  className="text-gray-400 hover:text-red-500"
                  title="Remove photo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-3 border border-dashed border-gray-300 rounded-lg px-4 py-3 cursor-pointer hover:border-indigo-400">
                {blendUploading ? (
                  <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                ) : (
                  <ImagePlus className="w-5 h-5 text-gray-400" />
                )}
                <span className="text-sm text-gray-600">
                  Blend a photo into the QR itself (your dish, product, storefront…)
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadBlendImage(f);
                  }}
                />
              </label>
            )}
            {blendUrl && (
              <p className="text-xs text-gray-400 mt-1.5">
                Photo mode uses maximum error correction and overrides the shape
                setting. Always test-scan before a big print run.
              </p>
            )}
          </div>

          <div className={blendUrl ? "opacity-40 pointer-events-none" : ""}>
            <label className="block text-sm font-medium text-gray-700 mb-2">Shape</label>
            <div className="grid grid-cols-3 gap-2">
              {MODULE_SHAPES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setShape(s)}
                  className={`text-sm font-medium rounded-lg px-3 py-2 border transition-colors ${
                    shape === s
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-gray-50 border-gray-200 text-gray-700 hover:border-indigo-300"
                  }`}
                >
                  {SHAPE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logo (optional)
            </label>
            {logoUrl ? (
              <div className="flex items-center gap-3 border border-gray-200 rounded-lg px-3 py-2.5">
                {logoDataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoDataUrl}
                    alt="Logo"
                    className="w-8 h-8 rounded object-contain"
                  />
                )}
                <span className="text-sm text-gray-600 flex-1">Logo added ✓</span>
                <button
                  type="button"
                  onClick={() => {
                    setLogoUrl(null);
                    setLogoDataUrl(null);
                  }}
                  className="text-gray-400 hover:text-red-500"
                  title="Remove logo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-3 border border-dashed border-gray-300 rounded-lg px-4 py-3 cursor-pointer hover:border-indigo-400">
                {logoUploading ? (
                  <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                ) : (
                  <ImagePlus className="w-5 h-5 text-gray-400" />
                )}
                <span className="text-sm text-gray-600">
                  Add your logo to the center (PNG/JPG)
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadLogo(f);
                  }}
                />
              </label>
            )}
            {logoUrl && (
              <p className="text-xs text-gray-400 mt-1.5">
                Error correction is raised to H automatically so the QR stays
                scannable with a logo.
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input
                type="color"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                className="w-full h-9 rounded-lg border border-gray-300 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Background
              </label>
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-full h-9 rounded-lg border border-gray-300 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Error correction
              </label>
              <select
                value={ecLevel}
                onChange={(e) => setEcLevel(e.target.value)}
                className="w-full h-9 rounded-lg border border-gray-300 px-2 text-sm bg-white"
              >
                {EC_LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={onCreate}
            disabled={saving || uploading || !name.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 mt-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Create QR code
          </button>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 sticky top-6 text-center">
            <p className="text-sm font-semibold text-gray-900 mb-3">Live preview</p>
            {previewSvg ? (
              <div
                className="w-56 h-56 mx-auto rounded-lg border border-gray-100 overflow-hidden [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: previewSvg }}
              />
            ) : (
              <div className="w-56 h-56 mx-auto rounded-lg bg-gray-50 border border-gray-100" />
            )}
            {!def!.isStatic && (
              <p className="text-xs text-gray-400 mt-3">
                Your QR will point to a short link like{" "}
                <code className="text-gray-600">
                  {appUrl.replace(/^https?:\/\//, "")}/Ab8K29x
                </code>{" "}
                — you can change where it goes anytime, even after printing.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
