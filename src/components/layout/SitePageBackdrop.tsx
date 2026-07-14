import { AuroraAtmosphere } from "@/components/ui/AuroraAtmosphere";

/**
 * Fixed cosmic layer for all (site) routes — persists across PageTransition
 * so the starfield does not remount or restart on navigation.
 */
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
      <AuroraAtmosphere
        mode="absolute"
        intensity="subtle"
        starDensity="light"
        glowPosition="none"
        enableMotion
        className="site-page-backdrop__stars"
      />
      <div className="site-page-backdrop__vignette atmosphere-vignette atmosphere-vignette--soft" />
    </div>
  );
}
