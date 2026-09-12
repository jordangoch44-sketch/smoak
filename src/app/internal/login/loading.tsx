import { PageWaitState } from "@/components/brand/PageWaitState";

export default function InternalLoginLoading() {
  return (
    <div className="internal-login" aria-busy="true">
      <PageWaitState label="Opening admin" />
    </div>
  );
}
