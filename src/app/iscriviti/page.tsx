import { PrelaunchLanding } from "@/components/home/prelaunch-landing";
import { signupCopy } from "@/content/signup";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: signupCopy.nameTitle },
  robots: { index: false, follow: false },
};

/** Full-screen waitlist. Always reachable, including before the public app launches. */
export default function IscrivitiPage() {
  return <PrelaunchLanding startSignup />;
}
