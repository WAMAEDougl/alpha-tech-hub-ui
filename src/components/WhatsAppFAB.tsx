import { MessageCircle } from "lucide-react";
import { useSiteConfig } from "@/contexts/SiteConfigContext";

const DEFAULT_NUMBER = "+254700000000";

export function WhatsAppFAB() {
  const { config } = useSiteConfig();
  const { whatsappNumber } = config;

  if (!whatsappNumber || whatsappNumber === DEFAULT_NUMBER) {
    return null;
  }

  return (
    <a
      href={`https://wa.me/${whatsappNumber}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg text-white hover:opacity-90 transition-opacity"
    >
      <MessageCircle className="h-7 w-7" />
    </a>
  );
}

export default WhatsAppFAB;
