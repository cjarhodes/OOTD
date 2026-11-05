import type { Metadata } from "next";
import { Suspense } from "react";
import { TripsView } from "@/components/TripsView";

export const metadata: Metadata = { title: "Trips" };

export default function TripsPage() {
  return (
    <Suspense fallback={<div className="empty" aria-busy="true" />}>
      <TripsView />
    </Suspense>
  );
}
