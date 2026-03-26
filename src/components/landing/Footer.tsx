import { Phone, Mail, MapPin, Facebook, Twitter, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import logoRed from "@/assets/logo-red.png";
import { useSiteConfig } from "@/contexts/SiteConfigContext";

const Footer = () => {
  const { config } = useSiteConfig();
  const mapsUrl = `https://www.google.com/maps?q=${config.mapLat},${config.mapLng}`;

  return (
    <footer id="contact" className="bg-accent text-accent-foreground pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <img src={logoRed} alt="Alpha Computers" className="h-14 w-auto mb-4" />
            <p className="text-accent-foreground/70 text-sm mb-4">
              Your trusted technology hub in Nanyuki, Kenya. Quality hardware, expert repairs, and unmatched service since 2015.
            </p>
            <div className="flex gap-3">
              <a href="#" className="h-9 w-9 rounded-full bg-accent-foreground/10 flex items-center justify-center hover:bg-primary transition-colors">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" className="h-9 w-9 rounded-full bg-accent-foreground/10 flex items-center justify-center hover:bg-primary transition-colors">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="https://wa.me/254700000000" className="h-9 w-9 rounded-full bg-accent-foreground/10 flex items-center justify-center hover:bg-primary transition-colors">
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-heading font-semibold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-accent-foreground/70">
              <li><a href="#" className="hover:text-primary transition-colors">Shop Laptops</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Shop Desktops</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Accessories</a></li>
              <li><a href="#services" className="hover:text-primary transition-colors">Repair Services</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms & Conditions</a></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-heading font-semibold text-lg mb-4">Contact Us</h3>
            <ul className="space-y-3 text-sm text-accent-foreground/70">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                Kenyatta Avenue, Nanyuki Town, Laikipia County, Kenya
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary shrink-0" />
                {config.phone}
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary shrink-0" />
                info@alphacomputersnanyuki.co.ke
              </li>
            </ul>
          </div>

          {/* Contact Form */}
          <div>
            <h3 className="font-heading font-semibold text-lg mb-4">Send a Message</h3>
            <form className="space-y-3" onSubmit={(e) => e.preventDefault()}>
              <Input placeholder="Your Name" className="bg-accent-foreground/10 border-accent-foreground/20 text-accent-foreground placeholder:text-accent-foreground/40" />
              <Input placeholder="Your Email" type="email" className="bg-accent-foreground/10 border-accent-foreground/20 text-accent-foreground placeholder:text-accent-foreground/40" />
              <Textarea placeholder="Your Message" rows={3} className="bg-accent-foreground/10 border-accent-foreground/20 text-accent-foreground placeholder:text-accent-foreground/40" />
              <Button className="w-full">Send Message</Button>
            </form>
          </div>
        </div>

        {/* Map */}
        <div className="rounded-lg overflow-hidden mb-8 h-48">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
            <iframe
              src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15959.42!2d${config.mapLng}!3d${config.mapLat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x17881a1a1a1a1a1a%3A0x1a1a1a1a1a1a1a1a!2sNanyuki%2C%20Kenya!5e0!3m2!1sen!2ske!4v1`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              title={`${config.companyName} Location`}
            />
          </a>
        </div>

        <div className="border-t border-accent-foreground/10 pt-6 text-center text-sm text-accent-foreground/50">
          © {new Date().getFullYear()} {config.companyName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
