/** Fixed aurora layer — stays stable while routed page content transitions */
export function SitePageBackdrop() {
  return (
    <div className="site-page-backdrop" aria-hidden>
      <div className="site-page-backdrop__base" />
      <div className="site-page-backdrop__mesh atmosphere-mesh">
        <div className="atmosphere-blob atmosphere-blob--indigo site-page-backdrop__blob" />
        <div className="atmosphere-blob atmosphere-blob--violet site-page-backdrop__blob" />
        <div className="atmosphere-blob atmosphere-blob--magenta site-page-backdrop__blob" />
        <div className="atmosphere-blob atmosphere-blob--core site-page-backdrop__blob" />
      </div>
      <div className="site-page-backdrop__vignette atmosphere-vignette atmosphere-vignette--soft" />
    </div>
  );
}
