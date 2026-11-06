import type { Metadata } from "next";
import { Suspense } from "react";
import { TodaySkeleton, TodayView } from "@/components/TodayView";

// Only the home page declares a canonical URL; the other screens are app views.
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function TodayPage() {
  return (
    <Suspense fallback={<TodaySkeleton />}>
      <TodayView />
    </Suspense>
  );
}
