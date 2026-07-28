import { Suspense } from "react";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getSessionUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/next-path";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getSessionUser();
  const { next } = await searchParams;
  // Already signed in: honour the pricing CTA they clicked rather than dropping
  // them on the dashboard with their plan choice forgotten.
  if (user) redirect(safeNextPath(next));
  return (
    <Suspense>
      <AuthForm mode="login" googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID)} />
    </Suspense>
  );
}
