import NewQrWizard from "@/components/qr/NewQrWizard";
import { appUrl } from "@/lib/qr-image";

export default function NewQrPage() {
  return <NewQrWizard appUrl={appUrl()} />;
}
