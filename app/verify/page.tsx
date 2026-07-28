import type { Metadata } from "next";
import { Suspense } from "react";
import VerifyEmail from "@/components/VerifyEmail";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Confirm your email · QRVeda",
  robots: { index: false, follow: false },
};

export default async function VerifyPage() {
  const user = await getSessionUser();
  return (
    <Suspense>
      <VerifyEmail signedIn={Boolean(user)} />
    </Suspense>
  );
}
