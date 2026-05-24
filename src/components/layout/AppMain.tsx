import { PageTransition } from "./PageTransition";
import { SitePageBackdrop } from "./SitePageBackdrop";

interface AppMainProps {
  children: React.ReactNode;
}

/** Routed page outlet — navbar/footer stay outside; backdrop stays fixed */
export function AppMain({ children }: AppMainProps) {
  return (
    <main className="app-main">
      <SitePageBackdrop />
      <PageTransition>{children}</PageTransition>
    </main>
  );
}
