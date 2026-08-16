"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardSection } from "@/components/dashboard";
import { prepareImageDataUrlForUpload } from "@/lib/media/crop-image";
import {
  getDefaultHomeEssenceConfig,
  HOME_ESSENCE_INTERVAL_MS_MAX,
  HOME_ESSENCE_INTERVAL_MS_MIN,
  type HomeEssenceConfig,
  type HomeEssenceSlide,
} from "@/lib/home-essence-slides";
import { cn } from "@/lib/utils";

function newSlideId(): string {
  return `slide-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
}

/**
 * Admin → Settings — switch homepage essence frames on/off, reorder,
 * set autoplay duration, upload new stills.
 */
export function AdminHomepageEssencePanel() {
  const [config, setConfig] = useState<HomeEssenceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/homepage-essence", {
        credentials: "include",
      });
      const body = (await res.json().catch(() => null)) as
        | { ok?: boolean; config?: HomeEssenceConfig; message?: string }
        | null;
      if (!res.ok || !body?.ok || !body.config) {
        throw new Error(body?.message ?? "Could not load essence config.");
      }
      setConfig(body.config);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load.");
      setConfig(getDefaultHomeEssenceConfig());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function patchSlides(
    updater: (slides: HomeEssenceSlide[]) => HomeEssenceSlide[]
  ) {
    setConfig((prev) => {
      if (!prev) return prev;
      const next = updater(prev.slides.map((s) => ({ ...s }))).map(
        (slide, index) => ({ ...slide, sortOrder: index })
      );
      return { ...prev, slides: next };
    });
    setStatus(null);
  }

  function moveSlide(id: string, direction: -1 | 1) {
    patchSlides((slides) => {
      const index = slides.findIndex((s) => s.id === id);
      if (index < 0) return slides;
      const target = index + direction;
      if (target < 0 || target >= slides.length) return slides;
      const next = [...slides];
      const tmp = next[index]!;
      next[index] = next[target]!;
      next[target] = tmp;
      return next;
    });
  }

  async function handleUpload(file: File | undefined) {
    if (!file || !config) return;
    setUploading(true);
    setError(null);
    setStatus(null);
    try {
      const dataUrl = await prepareImageDataUrlForUpload(file, "cover");
      const res = await fetch("/api/admin/homepage-essence/upload", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const body = (await res.json().catch(() => null)) as
        | { ok?: boolean; publicUrl?: string; message?: string }
        | null;
      if (!res.ok || !body?.ok || !body.publicUrl) {
        throw new Error(body?.message ?? "Upload failed.");
      }
      patchSlides((slides) => [
        ...slides,
        {
          id: newSlideId(),
          src: body.publicUrl!,
          alt: "SMOAC",
          enabled: true,
          sortOrder: slides.length,
        },
      ]);
      setStatus("Photo added — Save to publish.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/homepage-essence", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const body = (await res.json().catch(() => null)) as
        | { ok?: boolean; config?: HomeEssenceConfig; message?: string }
        | null;
      if (!res.ok || !body?.ok || !body.config) {
        throw new Error(body?.message ?? "Could not save.");
      }
      setConfig(body.config);
      setStatus("Published to marketplace homepage.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function resetDefaults() {
    if (
      !window.confirm(
        "Reset to the built-in SMOAC campaign stills? This replaces your current list."
      )
    ) {
      return;
    }
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/homepage-essence", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      const body = (await res.json().catch(() => null)) as
        | { ok?: boolean; config?: HomeEssenceConfig; message?: string }
        | null;
      if (!res.ok || !body?.ok || !body.config) {
        throw new Error(body?.message ?? "Could not reset.");
      }
      setConfig(body.config);
      setStatus("Reset to defaults and published.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset.");
    } finally {
      setSaving(false);
    }
  }

  const intervalSec = config
    ? Math.round(config.intervalMs / 100) / 10
    : 5.2;

  return (
    <DashboardSection
      title="Homepage essence banner"
      description="Switch slides on/off, reorder, set how long each stays, and upload new stills. Saves go live on the marketplace."
    >
      {loading ? <p className="admin-empty">Loading banner…</p> : null}
      {error ? <p className="admin-status-error">{error}</p> : null}
      {status ? <p className="admin-status-ok">{status}</p> : null}

      {config && !loading ? (
        <div className="admin-essence">
          <div className="admin-essence__toolbar">
            <label className="admin-essence__duration">
              <span>Seconds per slide</span>
              <input
                type="number"
                min={HOME_ESSENCE_INTERVAL_MS_MIN / 1000}
                max={HOME_ESSENCE_INTERVAL_MS_MAX / 1000}
                step={0.5}
                value={intervalSec}
                disabled={saving}
                onChange={(event) => {
                  const sec = Number.parseFloat(event.target.value);
                  if (!Number.isFinite(sec)) return;
                  setConfig((prev) =>
                    prev
                      ? {
                          ...prev,
                          intervalMs: Math.round(sec * 1000),
                        }
                      : prev
                  );
                  setStatus(null);
                }}
              />
            </label>

            <label className="admin-essence__upload smoac-control">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                hidden
                disabled={uploading || saving}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  void handleUpload(file);
                }}
              />
              {uploading ? "Uploading…" : "Add photo"}
            </label>

            <button
              type="button"
              className="smoac-control admin-essence__save"
              disabled={saving || uploading}
              onClick={() => void save()}
            >
              {saving ? "Saving…" : "Save & publish"}
            </button>

            <button
              type="button"
              className="smoac-control admin-essence__reset"
              disabled={saving || uploading}
              onClick={() => void resetDefaults()}
            >
              Reset defaults
            </button>
          </div>

          <ul className="admin-essence__list">
            {config.slides.map((slide, index) => (
              <li
                key={slide.id}
                className={cn(
                  "admin-essence__row",
                  !slide.enabled && "admin-essence__row--off"
                )}
              >
                <div className="admin-essence__thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={slide.src} alt="" />
                </div>
                <div className="admin-essence__fields">
                  <label>
                    <span>Alt text</span>
                    <input
                      type="text"
                      value={slide.alt}
                      disabled={saving}
                      onChange={(event) => {
                        const alt = event.target.value;
                        patchSlides((slides) =>
                          slides.map((s) =>
                            s.id === slide.id ? { ...s, alt } : s
                          )
                        );
                      }}
                    />
                  </label>
                  <label className="admin-essence__toggle">
                    <input
                      type="checkbox"
                      checked={slide.enabled}
                      disabled={saving}
                      onChange={(event) => {
                        const enabled = event.target.checked;
                        patchSlides((slides) =>
                          slides.map((s) =>
                            s.id === slide.id ? { ...s, enabled } : s
                          )
                        );
                      }}
                    />
                    <span>{slide.enabled ? "On marketplace" : "Hidden"}</span>
                  </label>
                </div>
                <div className="admin-essence__actions">
                  <button
                    type="button"
                    className="smoac-control"
                    disabled={saving || index === 0}
                    onClick={() => moveSlide(slide.id, -1)}
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="smoac-control"
                    disabled={saving || index === config.slides.length - 1}
                    onClick={() => moveSlide(slide.id, 1)}
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="smoac-control admin-essence__remove"
                    disabled={saving}
                    onClick={() => {
                      patchSlides((slides) =>
                        slides.filter((s) => s.id !== slide.id)
                      );
                      setStatus("Removed — Save to publish.");
                    }}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {config.slides.length === 0 ? (
            <p className="admin-empty">
              No slides — add a photo or reset defaults.
            </p>
          ) : null}
        </div>
      ) : null}
    </DashboardSection>
  );
}
