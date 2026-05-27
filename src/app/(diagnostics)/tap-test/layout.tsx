import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tap Test — iPhone Safari",
  robots: "noindex, nofollow",
};

const bootProbeScript = `
(function () {
  window.__TAP_TEST_BOOT__ = true;
  function set(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }
  document.addEventListener("DOMContentLoaded", function () {
    set("boot-inline", "YES — inline script ran (no React)");
    var scripts = document.querySelectorAll('script[src*="/_next/"]');
    if (!scripts.length) {
      set("chunk-probe", "No /_next/ script tags found in HTML");
      return;
    }
    var src = scripts[scripts.length - 1].src;
    fetch(src, { credentials: "same-origin", mode: "no-cors" })
      .then(function (res) {
        set(
          "chunk-probe",
          "Chunk probe: HTTP " +
            res.status +
            " — " +
            (res.ok ? "OK" : "BLOCKED (check allowedDevOrigins)") +
            "\\n" +
            src
        );
      })
      .catch(function (err) {
        set("chunk-probe", "Chunk probe failed: " + String(err));
      });
  });
})();
`;

/** Dev diagnostics — isolated from site layout (no chrome, providers, or globals) */
export default function TapTestRouteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: bootProbeScript }} />
      {children}
    </>
  );
}
