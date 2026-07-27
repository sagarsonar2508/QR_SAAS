import { Suspense } from "react";
import { redirect } from "next/navigation";
import AuthForm from "@/components/AuthForm";
import { getSessionUser } from "@/lib/auth";

export default async function SignupPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  return (
    <Suspense>
      <AuthForm mode="signup" googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID)} />
    </Suspense>
  );
}
