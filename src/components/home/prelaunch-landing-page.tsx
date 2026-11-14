import { PrelaunchLanding } from "@/components/home/prelaunch-landing";
import { loadLandingCompareTable } from "@/server/landing/compare-sample";

export async function PrelaunchLandingPage({ startSignup = false }: { startSignup?: boolean }) {
  const compare = await loadLandingCompareTable();
  return <PrelaunchLanding startSignup={startSignup} compare={compare} />;
}
