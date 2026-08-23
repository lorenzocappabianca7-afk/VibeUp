import { BusinessOnboardingView } from "@/components/business/business-onboarding-view";

export default async function BusinessOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ listingId?: string; new?: string }>;
}) {
  const params = await searchParams;
  const listingId =
    typeof params.listingId === "string" ? params.listingId : undefined;
  const createNew = params.new === "1" || params.new === "true";

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md bg-background px-4 pt-6 shadow-none sm:shadow-[0_0_60px_-15px_rgba(15,15,17,0.12)]">
      <BusinessOnboardingView listingId={listingId} createNew={createNew} />
    </div>
  );
}
