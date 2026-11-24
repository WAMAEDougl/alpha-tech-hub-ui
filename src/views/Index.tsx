import Header from "@/components/landing/Header";
import HeroSection from "@/components/landing/HeroSection";
import CatalogSection from "@/components/landing/CatalogSection";
import ServicesSection from "@/components/landing/ServicesSection";
import CustomBuildsSection from "@/components/landing/CustomBuildsSection";
import DisposalSection from "@/components/landing/DisposalSection";
import PCPartsSection from "@/components/landing/PCPartsSection";
import LaptopPartsSection from "@/components/landing/LaptopPartsSection";
import AboutSection from "@/components/landing/AboutSection";
import Footer from "@/components/landing/Footer";
import WhatsAppFAB from "@/components/WhatsAppFAB";

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* soft colour behind the page so the glass cards and navbar have something to blur */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(42rem_28rem_at_8%_18%,hsl(var(--primary)/0.16),transparent_70%),radial-gradient(40rem_30rem_at_95%_45%,hsl(215_90%_60%/0.14),transparent_70%),radial-gradient(36rem_26rem_at_30%_95%,hsl(280_80%_65%/0.12),transparent_70%)]" />
      <Header />
      <main className="pt-16">
        <HeroSection />
        <CatalogSection />
        <PCPartsSection />
        <LaptopPartsSection />
        <ServicesSection />
        <CustomBuildsSection />
        <DisposalSection />
        <AboutSection />
      </main>
      <Footer />
      <WhatsAppFAB />
    </div>
  );
};

export default Index;
