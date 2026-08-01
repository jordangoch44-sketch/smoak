import { SITE_INTRO_SEEN_KEY } from "@/lib/site-intro-storage";

/**
 * Runs before paint — covers the homepage until the warp intro mounts
 * so first-visit users never glimpse site chrome underneath.
 */
export function SiteIntroBoot() {
  const key = JSON.stringify(SITE_INTRO_SEEN_KEY);
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
html.site-intro-pending,
html.site-intro-pending body {
  background: #020203 !important;
}
html.site-intro-pending #root {
  opacity: 0 !important;
  pointer-events: none !important;
}
/* Below --z-welcome-intro (10050) so the warp paints on top of this cover */
html.site-intro-pending body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: 10040;
  background: #020203;
  pointer-events: none;
}
`,
        }}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var k=${key};var path=location.pathname||"/";if(path!=="/")return;var q=new URLSearchParams(location.search);if(q.get("replay-intro")==="1"){try{localStorage.removeItem(k);sessionStorage.removeItem(k);}catch(e){}}var seen=false;try{seen=localStorage.getItem(k)==="1"||sessionStorage.getItem(k)==="1";}catch(e){seen=true;}if(!seen)document.documentElement.classList.add("site-intro-pending");}catch(e){}})();`,
        }}
      />
    </>
  );
}
