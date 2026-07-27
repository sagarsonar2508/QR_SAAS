import {
  Globe,
  MessageCircle,
  Phone,
  Mail,
  MessageSquare,
  IndianRupee,
  FileText,
  Image as ImageIcon,
  Wifi,
  Contact,
  Star,
  QrCode,
} from "lucide-react";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  website: Globe,
  whatsapp: MessageCircle,
  phone: Phone,
  email: Mail,
  sms: MessageSquare,
  upi: IndianRupee,
  pdf: FileText,
  image: ImageIcon,
  wifi: Wifi,
  vcard: Contact,
  feedback: Star,
};

export default function TypeIcon({
  type,
  className,
}: {
  type: string;
  className?: string;
}) {
  const Icon = ICONS[type] ?? QrCode;
  return <Icon className={className ?? "w-4 h-4"} />;
}
