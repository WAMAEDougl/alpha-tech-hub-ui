import Header from "@/components/landing/Header";
import HeroSection from "@/components/landing/HeroSection";
import CatalogSection from "@/components/landing/CatalogSection";
import ServicesSection from "@/components/landing/ServicesSection";
import Footer from "@/components/landing/Footer";
import WhatsAppFAB from "@/components/WhatsAppFAB";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-16">
        <HeroSection />
        <CatalogSection />
        <ServicesSection />
      </main>
      <Footer />
      <WhatsAppFAB />
    </div>
  );
};

export default Index;
