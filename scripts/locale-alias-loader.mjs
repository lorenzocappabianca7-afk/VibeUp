export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const relative = specifier.slice(2);
    const file = relative.endsWith(".ts") ? relative : `${relative}.ts`;
    return nextResolve(new URL(`../src/${file}`, import.meta.url).href, context);
  }
  return nextResolve(specifier, context);
}
