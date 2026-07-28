import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LegalPage from "@/components/marketing/LegalPage";
import { legalDoc } from "@/lib/legal/content";

const doc = legalDoc("privacy")!;

export const metadata: Metadata = {
  title: `${doc.title} · QRVeda`,
  description: doc.description,
  alternates: { canonical: "/privacy" },
};

export default function Page() {
  if (!doc) notFound();
  return <LegalPage doc={doc} />;
}
