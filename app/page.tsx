import { CostComparison } from "@/components/landing/CostComparison";
import { Hero } from "@/components/landing/Hero";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";
import { ModuleShowcase } from "@/components/landing/ModuleShowcase";
import { ModulesGrid } from "@/components/landing/ModulesGrid";
import { PainPoints } from "@/components/landing/PainPoints";
import { Pricing } from "@/components/landing/Pricing";
import { ProductProof } from "@/components/landing/ProductProof";
import { Roadmap } from "@/components/landing/Roadmap";
import { SignupCta } from "@/components/landing/SignupCta";

export default function LandingPage() {
  return (
    <div className="min-h-screen scroll-smooth bg-[#101010] text-[#f5f5f5]">
      <LandingNav />
      <main>
        <Hero />
        <ModulesGrid />
        <CostComparison />
        <ModuleShowcase />
        <PainPoints />
        <ProductProof />
        <Roadmap />
        <Pricing />
        <SignupCta />
      </main>
      <LandingFooter />
    </div>
  );
}
