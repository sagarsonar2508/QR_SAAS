import type { Metadata } from "next";
import { Suspense } from "react";
import ForgotForm from "@/components/ForgotForm";

export const metadata: Metadata = {
  title: "Forgot password · QRVeda",
  robots: { index: false, follow: false },
};

export default function ForgotPage() {
  return (
    <Suspense>
      <ForgotForm />
    </Suspense>
  );
}
