import type { Metadata } from "next";
import { Suspense } from "react";
import ResetForm from "@/components/ResetForm";

export const metadata: Metadata = {
  title: "Reset password · QRVeda",
  robots: { index: false, follow: false },
};

export default function ResetPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
