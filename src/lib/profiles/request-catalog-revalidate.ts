/** Client-side: ask the server to drop the SSR public catalog cache. */
export function requestPublicCatalogRevalidate(): void {
  if (typeof window === "undefined") return;
  void fetch("/api/catalog/revalidate", { method: "POST" }).catch(
    () => undefined
  );
}
