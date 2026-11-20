import { Resolver } from "node:dns/promises";

/** True when the domain publishes MX. Null when DNS did not answer in time. */
export async function domainHasMx(domain: string, timeoutMs = 1500): Promise<boolean | null> {
  const name = domain.trim().toLowerCase().replace(/\.$/, "");
  if (!name || !name.includes(".")) return false;
  const resolver = new Resolver();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const records = await Promise.race([
      resolver.resolveMx(name),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          resolver.cancel();
          const error = new Error("timeout");
          (error as { code?: string }).code = "ETIMEOUT";
          reject(error);
        }, timeoutMs);
      }),
    ]);
    return records.some((record) => record.exchange && record.exchange !== ".");
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code === "ENOTFOUND" || code === "ENODATA" || code === "EFORMERR" || code === "ENOTIMP") {
      return false;
    }
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
