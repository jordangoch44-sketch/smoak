import dynamic from "next/dynamic";

const SavedPageClient = dynamic(
  () =>
    import("@/components/saved/SavedPageClient").then(
      (mod) => mod.SavedPageClient
    ),
  { ssr: true }
);

export const metadata = {
  title: "Saved Specialists",
};

export default function SavedPage() {
  return <SavedPageClient />;
}
