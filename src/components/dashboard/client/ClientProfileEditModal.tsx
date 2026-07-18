"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/ui/icons";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { ProfilePhotoCropper } from "@/components/media/ProfilePhotoCropper";
import { useToast } from "@/components/ui/toast";
import {
  CLIENT_AVATAR_ACCEPT,
  CLIENT_GENDER_PREF_OPTIONS,
  CLIENT_PRICE_PRESET_OPTIONS,
  CLIENT_PROFESSION_OPTIONS,
  CLIENT_PROFILE_GOAL_OPTIONS,
  CLIENT_SEARCH_RADIUS_OPTIONS,
  CLIENT_SESSION_FORMAT_OPTIONS,
  CLIENT_SPECIALTY_OPTIONS,
  type ClientPricePresetId,
} from "@/constants/client-profile-options";
import {
  updateAuthEmail,
  updatePassword,
} from "@/lib/auth/marketplace-auth";
import {
  ClientAvatarPipelineError,
  formatClientAvatarPipelineError,
  removeClientAvatarObject,
  uploadClientAvatar,
  validateClientAvatarSourceFile,
  withAvatarCacheBust,
} from "@/lib/profiles/client-avatar-storage";
import {
  getCroppedAvatarFile,
  readFileAsDataUrl,
} from "@/lib/media/crop-image";
import {
  priceBoundsForPreset,
  toggleStringInList,
  validateCustomPriceRange,
} from "@/lib/profiles/client-profile-form";
import {
  clearClientAvatarOnProfile,
  ensureClientProfileRow,
  loadClientProfileFormState,
  saveClientProfile,
  syncClientAvatarToProfile,
} from "@/lib/profiles/client-profile-service";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ClientProfileFormState } from "@/types/client-profile";
import type { Area } from "react-easy-crop";
import { cn, getInitials } from "@/lib/utils";
import "@/styles/client-profile-sheet.css";
import "@/styles/profile-photo-cropper.css";

const LOCK_CLASS = "client-profile-sheet-open";
const MIN_PASSWORD_LENGTH = 8;

interface ClientProfileEditModalProps {
  open: boolean;
  userId: string;
  authEmail: string;
  onClose: () => void;
}

function emptyForm(authEmail: string): ClientProfileFormState {
  return {
    firstName: "",
    lastName: "",
    displayName: "",
    phone: "",
    postalCode: "",
    city: "",
    state: "",
    email: authEmail.trim().toLowerCase(),
    pendingEmail: "",
    avatarUrl: "",
    avatarPath: "",
    goals: [],
    preferredRadiusMiles: null,
    pricePreset: "none",
    customPriceMin: "",
    customPriceMax: "",
    preferredProfessions: [],
    preferredSpecialties: [],
    preferredGender: "",
    preferredSessionFormat: "",
    profileCompleted: false,
  };
}

export function ClientProfileEditModal({
  open,
  userId,
  authEmail,
  onClose,
}: ClientProfileEditModalProps) {
  const { showToast } = useToast();
  const titleId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<ClientProfileFormState>(() =>
    emptyForm(authEmail)
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveOk, setSaveOk] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordOk, setPasswordOk] = useState<string | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailOk, setEmailOk] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    document.body.classList.add(LOCK_CLASS);
    document.documentElement.classList.add(LOCK_CLASS);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove(LOCK_CLASS);
      document.documentElement.classList.remove(LOCK_CLASS);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !userId) return;

    let cancelled = false;
    setLoading(true);
    setSaveError(null);
    setSaveOk(null);
    setAvatarError(null);
    setPasswordOpen(false);
    setPassword("");
    setConfirmPassword("");
    setPasswordError(null);
    setPasswordOk(null);
    setEmailError(null);
    setEmailOk(null);

    void (async () => {
      const supabase = createSupabaseBrowserClient();
      if (supabase) {
        await ensureClientProfileRow(supabase, {
          userId,
          email: authEmail,
        });
      }
      const next = await loadClientProfileFormState(userId, authEmail);
      if (!cancelled) {
        setForm(next);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, userId, authEmail]);

  const patchForm = useCallback(
    (patch: Partial<ClientProfileFormState>) => {
      setForm((current) => ({ ...current, ...patch }));
      setSaveOk(null);
      setSaveError(null);
    },
    []
  );

  const avatarInitials =
    getInitials(
      form.displayName.trim() ||
        `${form.firstName} ${form.lastName}`.trim() ||
        form.email ||
        "U"
    ) || "U";

  async function handleAvatarPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setAvatarError(null);
    try {
      validateClientAvatarSourceFile(file);
      const dataUrl = await readFileAsDataUrl(file);
      setCropImageSrc(dataUrl);
    } catch (error) {
      setAvatarError(formatClientAvatarPipelineError(error));
    }
  }

  async function handleCropConfirm(
    _croppedImageData: string,
    _cropSettings: { x: number; y: number; zoom: number },
    croppedAreaPixels: Area
  ) {
    if (!cropImageSrc) return;

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      throw new ClientAvatarPipelineError(
        "auth",
        "Supabase browser client is null — check NEXT_PUBLIC_SUPABASE_URL / ANON_KEY."
      );
    }

    let uploadedPath: string | null = null;
    let storageSucceeded = false;
    try {
      console.info("[avatars:canvas]", {
        crop: croppedAreaPixels,
        userId,
      });
      let processed: File;
      try {
        processed = await getCroppedAvatarFile(
          cropImageSrc,
          croppedAreaPixels,
          "avatar"
        );
      } catch (canvasError) {
        throw new ClientAvatarPipelineError(
          "canvas",
          canvasError instanceof Error
            ? canvasError.message
            : "Canvas/image processing failed.",
          { crop: croppedAreaPixels }
        );
      }
      console.info("[avatars:canvas:done]", {
        mime: processed.type,
        size: processed.size,
        name: processed.name,
      });

      const uploaded = await uploadClientAvatar(supabase, userId, processed);
      uploadedPath = uploaded.path;
      storageSucceeded = true;
      const displayUrl = withAvatarCacheBust(
        uploaded.publicUrl,
        uploaded.version
      );

      const synced = await syncClientAvatarToProfile(userId, {
        path: uploaded.path,
        publicUrl: uploaded.publicUrl,
        displayUrl,
      });
      if (!synced.ok) {
        throw new ClientAvatarPipelineError(
          "profile_update",
          synced.message,
          {
            code: synced.code,
            path: uploaded.path,
            publicUrl: uploaded.publicUrl,
            note: "Storage upload succeeded; profile table update failed.",
          }
        );
      }

      console.info("[avatars:session_refresh:done]", { displayUrl });
      patchForm({
        avatarPath: uploaded.path,
        avatarUrl: displayUrl,
      });
      setCropImageSrc(null);
      showToast({ type: "success", message: "Profile photo updated." });
    } catch (error) {
      if (storageSucceeded && uploadedPath) {
        console.warn(
          "[avatars] storage succeeded but a later stage failed; leaving object in place for retry",
          { uploadedPath, error }
        );
        /* Do not delete the object when only profile_update failed — retrying
         * Save/Use photo can re-link the same path after the column is added. */
      } else if (uploadedPath) {
        try {
          await removeClientAvatarObject(supabase, uploadedPath);
        } catch (cleanupError) {
          console.error("[avatars] orphan cleanup failed", cleanupError);
        }
      }
      throw new Error(formatClientAvatarPipelineError(error));
    }
  }

  async function handleRemoveAvatar() {
    if (!form.avatarUrl && !form.avatarPath) return;
    const confirmed = window.confirm(
      "Remove your profile photo? This cannot be undone."
    );
    if (!confirmed) return;

    setAvatarError(null);
    setAvatarBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      if (supabase && form.avatarPath) {
        await removeClientAvatarObject(supabase, form.avatarPath);
      }
      const cleared = await clearClientAvatarOnProfile(userId);
      if (!cleared.ok) {
        throw new Error(cleared.message);
      }
      patchForm({ avatarPath: "", avatarUrl: "" });
      showToast({ type: "success", message: "Profile photo removed." });
    } catch (error) {
      setAvatarError(formatClientAvatarPipelineError(error));
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleEmailUpdate() {
    setEmailError(null);
    setEmailOk(null);
    const next = form.pendingEmail.trim().toLowerCase();
    if (!next) {
      setEmailError("Email cannot be empty.");
      return;
    }
    setEmailBusy(true);
    const result = await updateAuthEmail(next);
    setEmailBusy(false);
    if (!result.ok) {
      setEmailError(result.message);
      return;
    }
    setEmailOk(result.message);
    showToast({ type: "success", message: result.message });
  }

  async function handlePasswordUpdate() {
    setPasswordError(null);
    setPasswordOk(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setPasswordBusy(true);
    const result = await updatePassword(password);
    setPasswordBusy(false);
    if (!result.ok) {
      setPasswordError(result.message);
      return;
    }
    setPassword("");
    setConfirmPassword("");
    setPasswordOk("Password updated.");
    showToast({ type: "success", message: "Password updated." });
  }

  async function handleSave() {
    if (saving) return;
    setSaveError(null);
    setSaveOk(null);

    const priceError = validateCustomPriceRange(
      form.pricePreset,
      form.customPriceMin,
      form.customPriceMax
    );
    if (priceError) {
      setSaveError(priceError);
      return;
    }

    const authEmailSafe = (authEmail || form.email).trim().toLowerCase();
    if (!authEmailSafe) {
      setSaveError("Your account email is required and cannot be removed.");
      return;
    }

    const bounds = priceBoundsForPreset(
      form.pricePreset,
      form.customPriceMin,
      form.customPriceMax
    );

    setSaving(true);
    const result = await saveClientProfile(userId, {
      firstName: form.firstName,
      lastName: form.lastName,
      displayName: form.displayName,
      phone: form.phone,
      postalCode: form.postalCode,
      city: form.city,
      state: form.state,
      email: authEmailSafe,
      avatarUrl: form.avatarUrl.split("?")[0] ?? form.avatarUrl,
      avatarPath: form.avatarPath,
      goals: form.goals,
      preferredRadiusMiles: form.preferredRadiusMiles,
      preferredPriceMin: bounds.min,
      preferredPriceMax: bounds.max,
      clientBudgetLabel: bounds.label,
      preferredProfessions: form.preferredProfessions,
      preferredSpecialties: form.preferredSpecialties,
      preferredGender: form.preferredGender,
      preferredSessionFormat: form.preferredSessionFormat,
    });
    setSaving(false);

    if (!result.ok) {
      setSaveError(result.message);
      return;
    }

    setForm((current) => ({
      ...current,
      email: authEmailSafe,
      profileCompleted: result.profileCompleted,
    }));
    setSaveOk("Profile saved.");
    showToast({ type: "success", message: "Profile saved." });

    window.setTimeout(() => {
      onClose();
    }, 650);
  }

  if (!mounted || !open || typeof document === "undefined") {
    return null;
  }

  return (
    <>
      {createPortal(
        <div className="client-profile-sheet-root" role="presentation">
          <button
            type="button"
            className="client-profile-sheet__backdrop"
            aria-label="Close profile editor"
            onClick={onClose}
          />
          <div
            className="client-profile-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
          >
        <div className="client-profile-sheet__chrome">
          <div className="client-profile-sheet__handle" aria-hidden />
          <div className="client-profile-sheet__top">
            <h2 id={titleId} className="client-profile-sheet__title">
              {form.profileCompleted ? "Your profile" : "Complete your profile"}
            </h2>
            <button
              type="button"
              className="client-profile-sheet__close"
              onClick={onClose}
              aria-label="Close"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="client-profile-sheet__body">
          {loading ? (
            <p className="client-profile-section__hint">Loading your profile…</p>
          ) : (
            <>
              <section className="client-profile-section">
                <h3 className="client-profile-section__title">Profile photo</h3>
                <div className="client-profile-avatar">
                  <div className="client-profile-avatar__circle">
                    {form.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- auth avatar URLs / cache-busted storage
                      <img
                        src={form.avatarUrl}
                        alt=""
                        className="client-profile-avatar__img"
                      />
                    ) : (
                      <span className="client-profile-avatar__initials">
                        {avatarInitials}
                      </span>
                    )}
                  </div>
                  <div className="client-profile-avatar__actions">
                    <button
                      type="button"
                      className="client-profile-avatar__btn"
                      disabled={avatarBusy}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {avatarBusy
                        ? "Working…"
                        : form.avatarUrl
                          ? "Change photo"
                          : "Upload photo"}
                    </button>
                    {form.avatarUrl ? (
                      <button
                        type="button"
                        className="client-profile-avatar__btn client-profile-avatar__btn--danger"
                        disabled={avatarBusy}
                        onClick={() => void handleRemoveAvatar()}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={CLIENT_AVATAR_ACCEPT}
                    hidden
                    onChange={(event) => void handleAvatarPick(event)}
                  />
                  {avatarError ? (
                    <p className="client-profile-avatar__error">{avatarError}</p>
                  ) : null}
                </div>
              </section>

              <section className="client-profile-section">
                <h3 className="client-profile-section__title">Basic information</h3>
                <div className="client-profile-fields client-profile-fields--2">
                  <label className="client-profile-field">
                    <span className="client-profile-field__label">First name</span>
                    <input
                      className="client-profile-field__input"
                      value={form.firstName}
                      onChange={(e) => patchForm({ firstName: e.target.value })}
                      autoComplete="given-name"
                    />
                  </label>
                  <label className="client-profile-field">
                    <span className="client-profile-field__label">Last name</span>
                    <input
                      className="client-profile-field__input"
                      value={form.lastName}
                      onChange={(e) => patchForm({ lastName: e.target.value })}
                      autoComplete="family-name"
                    />
                  </label>
                  <label className="client-profile-field">
                    <span className="client-profile-field__label">Display name</span>
                    <input
                      className="client-profile-field__input"
                      value={form.displayName}
                      onChange={(e) => patchForm({ displayName: e.target.value })}
                      autoComplete="nickname"
                    />
                  </label>
                  <label className="client-profile-field">
                    <span className="client-profile-field__label">Phone</span>
                    <input
                      className="client-profile-field__input"
                      value={form.phone}
                      onChange={(e) => patchForm({ phone: e.target.value })}
                      autoComplete="tel"
                      inputMode="tel"
                    />
                  </label>
                  <label className="client-profile-field">
                    <span className="client-profile-field__label">ZIP code</span>
                    <input
                      className="client-profile-field__input"
                      value={form.postalCode}
                      onChange={(e) => patchForm({ postalCode: e.target.value })}
                      autoComplete="postal-code"
                    />
                  </label>
                  <label className="client-profile-field">
                    <span className="client-profile-field__label">City</span>
                    <input
                      className="client-profile-field__input"
                      value={form.city}
                      onChange={(e) => patchForm({ city: e.target.value })}
                      autoComplete="address-level2"
                    />
                  </label>
                  <label className="client-profile-field">
                    <span className="client-profile-field__label">State</span>
                    <input
                      className="client-profile-field__input"
                      value={form.state}
                      onChange={(e) => patchForm({ state: e.target.value })}
                      autoComplete="address-level1"
                    />
                  </label>
                </div>
              </section>

              <section className="client-profile-section">
                <h3 className="client-profile-section__title">Email address</h3>
                <p className="client-profile-section__hint">
                  Sign-in email is managed by Supabase Auth and cannot be removed.
                  Changing it may require confirmation from the new inbox.
                </p>
                <label className="client-profile-field">
                  <span className="client-profile-field__label">Current email</span>
                  <input
                    className="client-profile-field__input"
                    value={form.email || authEmail}
                    readOnly
                    aria-readonly="true"
                  />
                </label>
                <label className="client-profile-field">
                  <span className="client-profile-field__label">New email</span>
                  <input
                    className="client-profile-field__input"
                    type="email"
                    value={form.pendingEmail}
                    onChange={(e) =>
                      patchForm({ pendingEmail: e.target.value })
                    }
                    autoComplete="email"
                    placeholder="optional"
                  />
                </label>
                <button
                  type="button"
                  className="client-profile-avatar__btn"
                  disabled={emailBusy || !form.pendingEmail.trim()}
                  onClick={() => void handleEmailUpdate()}
                >
                  {emailBusy ? "Sending confirmation…" : "Update email"}
                </button>
                {emailError ? (
                  <p className="client-profile-banner--error">{emailError}</p>
                ) : null}
                {emailOk ? (
                  <p className="client-profile-banner--ok">{emailOk}</p>
                ) : null}
              </section>

              <section className="client-profile-section">
                <h3 className="client-profile-section__title">Account</h3>
                <button
                  type="button"
                  className="client-profile-account-toggle"
                  onClick={() => setPasswordOpen((openNow) => !openNow)}
                  aria-expanded={passwordOpen}
                >
                  <span>Change password</span>
                  <span aria-hidden>{passwordOpen ? "−" : "+"}</span>
                </button>
                {passwordOpen ? (
                  <div className="client-profile-password">
                    <label className="client-profile-field">
                      <span className="client-profile-field__label">
                        New password
                      </span>
                      <PasswordInput
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setPasswordError(null);
                          setPasswordOk(null);
                        }}
                        autoComplete="new-password"
                        placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                      />
                    </label>
                    <label className="client-profile-field">
                      <span className="client-profile-field__label">
                        Confirm password
                      </span>
                      <PasswordInput
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          setPasswordError(null);
                          setPasswordOk(null);
                        }}
                        autoComplete="new-password"
                        placeholder="Re-enter password"
                      />
                    </label>
                    {confirmPassword && password !== confirmPassword ? (
                      <p className="client-profile-field__error">
                        Passwords do not match
                      </p>
                    ) : null}
                    <button
                      type="button"
                      className="client-profile-avatar__btn"
                      disabled={passwordBusy}
                      onClick={() => void handlePasswordUpdate()}
                    >
                      {passwordBusy ? "Updating…" : "Save password"}
                    </button>
                    {passwordError ? (
                      <p className="client-profile-banner--error">
                        {passwordError}
                      </p>
                    ) : null}
                    {passwordOk ? (
                      <p className="client-profile-banner--ok">{passwordOk}</p>
                    ) : null}
                  </div>
                ) : null}
              </section>

              <section className="client-profile-section">
                <h3 className="client-profile-section__title">Fitness goals</h3>
                <div className="client-profile-chips">
                  {CLIENT_PROFILE_GOAL_OPTIONS.map((goal) => {
                    const active = form.goals.includes(goal);
                    return (
                      <button
                        key={goal}
                        type="button"
                        className={cn(
                          "client-profile-chip",
                          active && "client-profile-chip--active"
                        )}
                        aria-pressed={active}
                        onClick={() =>
                          patchForm({
                            goals: toggleStringInList(form.goals, goal),
                          })
                        }
                      >
                        {goal}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="client-profile-section">
                <h3 className="client-profile-section__title">
                  Preferred search distance
                </h3>
                <p className="client-profile-section__hint">
                  We’ll prioritize specialists within this distance from your
                  selected location.
                </p>
                <div className="client-profile-chips">
                  {CLIENT_SEARCH_RADIUS_OPTIONS.map((option) => {
                    const active = form.preferredRadiusMiles === option.value;
                    return (
                      <button
                        key={option.label}
                        type="button"
                        className={cn(
                          "client-profile-chip",
                          active && "client-profile-chip--active"
                        )}
                        aria-pressed={active}
                        onClick={() =>
                          patchForm({ preferredRadiusMiles: option.value })
                        }
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="client-profile-section">
                <h3 className="client-profile-section__title">Pricing</h3>
                <p className="client-profile-section__hint">
                  Optional. Used as a recommendation default — not a hard filter
                  unless you apply it later in Search.
                </p>
                <div className="client-profile-chips">
                  {CLIENT_PRICE_PRESET_OPTIONS.map((option) => {
                    const active = form.pricePreset === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={cn(
                          "client-profile-chip",
                          active && "client-profile-chip--active"
                        )}
                        aria-pressed={active}
                        onClick={() =>
                          patchForm({
                            pricePreset: option.id as ClientPricePresetId,
                          })
                        }
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                {form.pricePreset === "custom" ? (
                  <div className="client-profile-fields client-profile-fields--2">
                    <label className="client-profile-field">
                      <span className="client-profile-field__label">
                        Minimum ($)
                      </span>
                      <input
                        className="client-profile-field__input"
                        inputMode="decimal"
                        value={form.customPriceMin}
                        onChange={(e) =>
                          patchForm({ customPriceMin: e.target.value })
                        }
                      />
                    </label>
                    <label className="client-profile-field">
                      <span className="client-profile-field__label">
                        Maximum ($)
                      </span>
                      <input
                        className="client-profile-field__input"
                        inputMode="decimal"
                        value={form.customPriceMax}
                        onChange={(e) =>
                          patchForm({ customPriceMax: e.target.value })
                        }
                      />
                    </label>
                  </div>
                ) : null}
              </section>

              <section className="client-profile-section">
                <h3 className="client-profile-section__title">
                  Specialist preferences
                </h3>
                <p className="client-profile-section__hint">
                  Optional defaults for Search. These never block profile
                  completion.
                </p>
                <p className="client-profile-field__label">Preferred profession</p>
                <div className="client-profile-chips">
                  {CLIENT_PROFESSION_OPTIONS.map((item) => {
                    const active = form.preferredProfessions.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        className={cn(
                          "client-profile-chip",
                          active && "client-profile-chip--active"
                        )}
                        aria-pressed={active}
                        onClick={() =>
                          patchForm({
                            preferredProfessions: toggleStringInList(
                              form.preferredProfessions,
                              item
                            ),
                          })
                        }
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
                <p className="client-profile-field__label">Preferred specialties</p>
                <div className="client-profile-chips">
                  {CLIENT_SPECIALTY_OPTIONS.map((item) => {
                    const active = form.preferredSpecialties.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        className={cn(
                          "client-profile-chip",
                          active && "client-profile-chip--active"
                        )}
                        aria-pressed={active}
                        onClick={() =>
                          patchForm({
                            preferredSpecialties: toggleStringInList(
                              form.preferredSpecialties,
                              item
                            ),
                          })
                        }
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
                <label className="client-profile-field">
                  <span className="client-profile-field__label">
                    Preferred specialist gender
                  </span>
                  <select
                    className="client-profile-field__select"
                    value={form.preferredGender}
                    onChange={(e) =>
                      patchForm({ preferredGender: e.target.value })
                    }
                  >
                    {CLIENT_GENDER_PREF_OPTIONS.map((option) => (
                      <option key={option.value || "any"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="client-profile-field">
                  <span className="client-profile-field__label">
                    Training format
                  </span>
                  <select
                    className="client-profile-field__select"
                    value={form.preferredSessionFormat}
                    onChange={(e) =>
                      patchForm({ preferredSessionFormat: e.target.value })
                    }
                  >
                    {CLIENT_SESSION_FORMAT_OPTIONS.map((option) => (
                      <option key={option.value || "any"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </section>

              {saveError ? (
                <p className="client-profile-banner--error" role="alert">
                  {saveError}
                </p>
              ) : null}
              {saveOk ? (
                <p className="client-profile-banner--ok" role="status">
                  {saveOk}
                </p>
              ) : null}
            </>
          )}
        </div>

        <div className="client-profile-sheet__footer">
          <button
            type="button"
            className="client-profile-save"
            disabled={saving || loading || Boolean(cropImageSrc)}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>,
        document.body
      )}

      {cropImageSrc ? (
        <ProfilePhotoCropper
          imageSrc={cropImageSrc}
          aspect={1}
          cropShape="round"
          title="Adjust your photo"
          lead="Drag to reposition. Pinch or use the slider to zoom. The circle shows your final avatar."
          confirmLabel="Use photo"
          confirmingLabel="Uploading…"
          onCancel={() => setCropImageSrc(null)}
          onSave={handleCropConfirm}
        />
      ) : null}
    </>
  );
}
