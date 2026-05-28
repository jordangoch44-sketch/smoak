import { Suspense } from "react";
import { PageTransition } from "./PageTransition";
import { SitePageBackdrop } from "./SitePageBackdrop";

interface AppMainProps {
  children: React.ReactNode;
}

function PageTransitionFallback({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-transition">
      <div className="page-transition__content">{children}</div>
    </div>
  );
}

/** Routed page outlet — navbar/footer stay outside; backdrop stays fixed */
export function AppMain({ children }: AppMainProps) {
  return (
    <main className="app-main">
      <SitePageBackdrop />
      <Suspense fallback={<PageTransitionFallback>{children}</PageTransitionFallback>}>
        <PageTransition>{children}</PageTransition>
      </Suspense>
    </main>
  );
}
