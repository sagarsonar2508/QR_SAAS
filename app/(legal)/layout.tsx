import { SiteHeader, SiteFooter } from "@/components/marketing/SiteChrome";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white min-h-screen flex flex-col">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
