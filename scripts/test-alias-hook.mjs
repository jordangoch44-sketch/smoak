const root = new URL("../src/", import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const bare = specifier.slice(2);
    const withExt = /\.[a-z]+$/i.test(bare) ? bare : `${bare}.ts`;
    const resolved = await nextResolve(new URL(withExt, root).href, context);
    if (withExt.endsWith(".json")) {
      return {
        ...resolved,
        importAttributes: { type: "json", ...resolved.importAttributes },
      };
    }
    return resolved;
  }
  return nextResolve(specifier, context);
}
