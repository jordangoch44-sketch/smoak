import "@/styles/explore.css";
import { ExploreMapShellScrollLock } from "@/components/explore/ExploreMapShellScrollLock";

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ExploreMapShellScrollLock />
      {children}
    </>
  );
}
