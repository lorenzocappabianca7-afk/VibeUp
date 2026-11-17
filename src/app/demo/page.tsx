import { DemoEntry } from "@/components/demo/demo-entry";
import { readTrustedSignupId } from "@/server/launch/signup-cookie";

export default async function DemoRoutePage() {
  const trustedSignupId = await readTrustedSignupId();
  return <DemoEntry trustedSignupId={trustedSignupId} />;
}
