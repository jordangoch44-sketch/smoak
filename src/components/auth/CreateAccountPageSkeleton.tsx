/** Instant signup wait — same stage as Quick & easy signup, with light sweeps. */

export function CreateAccountPageSkeleton() {
  return (
    <div
      className="login-page login-page--wizard login-page--specialist-onboarding login-page--create-account login-page--create-account-entry"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="login-page__canvas" aria-hidden>
        <div className="wizard-aurora-pool wizard-aurora-pool--primary" />
        <div className="wizard-aurora-pool wizard-aurora-pool--secondary" />
        <div className="atmosphere-mesh wizard-atmosphere-mesh">
          <div className="atmosphere-blob atmosphere-blob--indigo" />
          <div className="atmosphere-blob atmosphere-blob--blue" />
          <div className="atmosphere-blob atmosphere-blob--violet" />
          <div className="atmosphere-blob atmosphere-blob--magenta" />
          <div className="atmosphere-blob atmosphere-blob--pink" />
          <div className="atmosphere-blob atmosphere-blob--core" />
        </div>
        <div className="login-page__card-glow wizard-card-glow" />
        <div className="atmosphere-vignette atmosphere-vignette--soft wizard-vignette" />
        <div className="atmosphere-grain" />
      </div>

      <div className="login-page__shell interview-shell">
        <div className="interview-stage">
          <div className="interview-intro">
            <h1 className="interview-intro__title">Quick & easy signup</h1>
            <p className="interview-intro__sub">
              A few short questions — then you’re in.
            </p>
          </div>

          <div className="login-card wizard-card interview-card interview-card--sweep">
            <div className="interview-card__chrome">
              <div className="interview-card__meta">
                <span className="interview-card__icon-btn interview-card__icon-btn--spacer" />
                <span className="interview-sweep interview-sweep--count" />
                <span className="interview-card__icon-btn interview-card__icon-btn--spacer" />
              </div>
              <div className="interview-sweep interview-sweep--progress" />
            </div>

            <span className="interview-sweep interview-sweep--title" />
            <span className="interview-sweep interview-sweep--sub" />

            <div className="interview-card__field">
              <span className="interview-sweep interview-sweep--option" />
              <span className="interview-sweep interview-sweep--option" />
            </div>

            <div className="interview-card__footer">
              <span className="interview-sweep interview-sweep--continue" />
              <span className="interview-sweep interview-sweep--signin" />
            </div>
          </div>
        </div>
      </div>
      <span className="sr-only">Loading signup</span>
    </div>
  );
}
