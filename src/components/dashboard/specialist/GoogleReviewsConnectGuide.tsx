"use client";

const CONNECT_STEPS = [
  { n: 1, word: "one", text: "Go open Google Maps." },
  { n: 2, word: "two", text: "Search your business on Google Maps." },
  { n: 3, word: "three", text: "Tap Share." },
  { n: 4, word: "four", text: "Copy that link." },
  { n: 5, word: "five", text: "Paste it here." },
] as const;

interface GoogleReviewsConnectGuideProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function GoogleReviewsConnectGuide({
  value,
  onChange,
  disabled = false,
}: GoogleReviewsConnectGuideProps) {
  return (
    <>
      <ol className="dashboard-google-reviews__steps">
        {CONNECT_STEPS.map((step) => (
          <li key={step.n} className="dashboard-google-reviews__step">
            <span className="dashboard-google-reviews__step-num" aria-hidden>
              {step.n}
            </span>
            <span className="dashboard-google-reviews__step-body">
              <span className="dashboard-google-reviews__step-kicker">
                Step {step.word}
              </span>
              <span className="dashboard-google-reviews__step-copy">{step.text}</span>
            </span>
          </li>
        ))}
      </ol>
      <label className="dashboard-google-reviews__paste">
        <span className="dashboard-google-reviews__paste-label">
          Paste your Maps share link here
        </span>
        <input
          className="dashboard-google-reviews__paste-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://maps.app.goo.gl/…"
          autoComplete="off"
          inputMode="url"
          disabled={disabled}
        />
        <span className="dashboard-google-reviews__paste-hint">
          Once a Maps share link is pasted, click Connect.
        </span>
      </label>
    </>
  );
}
