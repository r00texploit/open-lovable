import Link from 'next/link';
import { ReactNode } from 'react';
import { NoeronLogo } from '@/components/brand/noeron-logo';

interface AuthLayoutProps {
  children: ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="ol-auth-bg relative min-h-screen overflow-hidden px-4 py-5 text-[#fff7e8] sm:px-6 lg:px-8">
      <div className="ol-noise" />

      <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-40px)] w-full max-w-[1180px] gap-6 lg:grid-cols-[1fr_520px]">
        <section className="hidden rounded-[32px] border border-[#2a21191a] bg-[#fff7e8d9] p-8 text-[#17130f] shadow-[0_28px_80px_rgba(65,42,18,0.16)] lg:flex lg:flex-col lg:justify-between">
          <Link href="/" className="inline-flex w-max items-center gap-3 text-[15px] font-semibold tracking-[-0.02em]">
            <NoeronLogo iconClassName="h-[40px] w-[40px]" textClassName="text-[#17130f]" />
          </Link>

          <div className="max-w-[620px]">
            <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#8c4b26]">
              Builder access
            </p>
            <NoeronLogo
              iconClassName="h-[64px] w-[64px]"
              textClassName="bg-gradient-to-r from-[#101524] via-[#6f45ff] to-[#10cbe0] bg-clip-text text-5xl font-black text-transparent"
              className="mb-8 gap-4"
            />
            <h2 className="text-7xl font-black leading-[0.9] tracking-[-0.07em]">
              Your next site starts with a working app.
            </h2>
            <p className="mt-7 max-w-[520px] text-lg leading-8 text-[#645744]">
              Sign in to continue from prompt, URL, or sandbox. The generated code stays visible, editable, and ready for export.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {['URL scrape', 'React files', 'Live preview'].map((item) => (
              <div key={item} className="rounded-[22px] bg-[#17130f] p-4 text-sm font-semibold text-[#fff7e8]">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="flex min-h-full items-center justify-center">
          <div className="w-full max-w-[520px]">
            <div className="mb-6 flex items-center justify-between lg:hidden">
              <Link href="/" className="inline-flex items-center gap-3 text-[15px] font-semibold tracking-[-0.02em] text-[#17130f]">
                <NoeronLogo iconClassName="h-[40px] w-[40px]" textClassName="text-[#17130f]" />
              </Link>
            </div>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
