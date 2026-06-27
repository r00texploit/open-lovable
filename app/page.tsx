import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { ArrowRight } from "lucide-react";
import { NoeronLogo } from "@/components/brand/noeron-logo";
import { MobileNav } from "@/components/mobile-nav";
import {
  HeroSection,
  FeaturesBento,
  HowItWorks,
  PricingEditorial,
  FAQSection,
  CTASection,
  Footer,
} from "@/components/sections";

const navItems = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const isSignedIn = !!session?.user;

  return (
    <div className="min-h-screen bg-black overflow-x-hidden">
      {/* Skip link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:text-sm focus:font-medium focus:rounded-lg"
      >
        Skip to content
      </a>

      {/* Navigation - Clean with proper spacing */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-dark border-b border-white/[0.06]">
        <div className="container-modern">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center" aria-label="Noeron Home">
              <NoeronLogo
                variant="dark"
                iconClassName="h-8 w-8"
                textClassName="text-lg font-semibold text-white"
              />
            </Link>

            {/* Desktop Nav - Using nav-link class */}
            <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Main navigation">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="nav-link"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              {isSignedIn ? (
                <Link
                  href="/generation"
                  className="btn-primary"
                >
                  Open Builder
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/signin"
                    className="nav-link"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/auth/signin"
                    className="btn-primary"
                  >
                    Start building
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu */}
            <MobileNav isSignedIn={isSignedIn} navItems={navItems} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="relative pt-16 lg:pt-20">
        <HeroSection />
        <FeaturesBento />
        <HowItWorks />
        <PricingEditorial />
        <FAQSection />
        <CTASection />
      </main>

      <Footer />
    </div>
  );
}
