import { PageWaitState } from "@/components/brand/PageWaitState";

/** Login-shell wait for /login and /complete-account. */
export function AuthPageWait({ label }: { label: string }) {
  return (
    <div className="login-page" aria-busy="true">
      <PageWaitState label={label} className="page-wait-state--embedded" />
    </div>
  );
}
