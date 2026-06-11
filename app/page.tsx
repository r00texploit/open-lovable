import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { NoeronLogo } from "@/components/brand/noeron-logo";
import { BuildLauncher } from "@/components/saas-landing/build-launcher";
import { formatTokenAmount, TIERS, type SubscriptionTier } from "@/lib/stripe/stripe";

const navItems = [
  { label: "Studio", href: "#studio" },
  { label: "Workflow", href: "#workflow" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const featureCards = [
  {
    title: "Scrape the real site",
    text: "Bring in a URL and keep the useful structure, content, colors, and tone instead of starting from a blank prompt.",
    meta: "01",
  },
  {
    title: "Generate editable React",
    text: "The builder writes a Vite + React + Tailwind app into a live sandbox, then keeps the files available for revision.",
    meta: "02",
  },
  {
    title: "Tune with chat",
    text: "Ask for layout, copy, or code changes in plain language and preview the result as the app updates.",
    meta: "03",
  },
];

const timeline = [
  "Paste a site or describe the build",
  "Noeron reads brand and page intent",
  "A React app appears in the sandbox",
  "You edit, preview, and export the code",
];

const faq = [
  {
    q: "Is this just a landing-page generator?",
    a: "No. The output is a working React project in a sandbox, with files you can inspect, edit, and keep shaping.",
  },
  {
    q: "Can I use an existing website as the source?",
    a: "Yes. Paste a URL and Noeron can use the page as context for layout, copy, and visual direction.",
  },
  {
    q: "Do I need to connect every AI provider?",
    a: "No. Add at least one supported provider key, then choose models from the builder when you need them.",
  },
];

const planOrder: SubscriptionTier[] = ["free", "pro", "plus", "team"];

const planDescriptions: Record<SubscriptionTier, string> = {
  free: "Try the builder and validate the flow.",
  pro: "For regular builders shipping client or product work.",
  plus: "For power users needing more tokens and API access.",
  team: "A larger token pool for studios and small teams.",
};

function BrandMark() {
  return (
    <NoeronLogo iconClassName="h-[40px] w-[40px]" textClassName="text-[#17130f]" />
  );
}

function ArrowPuck() {
  return (
    <span className="ml-[4px] flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[#25170e] text-[#fff7e8] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-[4px]">
      -&gt;
    </span>
  );
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <main className="ol-shell min-h-screen overflow-hidden font-sans">
      <div className="ol-noise" />

      <header className="relative z-10 mx-auto flex w-full max-w-[1280px] items-center justify-between px-[24px] py-[24px] sm:px-[40px]">
        <Link href="/" aria-label="Noeron home" className="text-[15px] text-[#17130f]">
          <BrandMark />
        </Link>

        <nav className="hidden items-center gap-[4px] rounded-full border border-[#261e151f] bg-[#fff9ee99] p-[4px] text-sm text-[#5f5343] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-[16px] py-[8px] transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-[#17130f] hover:text-[#fff7e8]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {session?.user ? (
          <Link href="/generation" className="ol-primary-button group px-[16px] py-[8px] text-sm">
            Open builder
            <ArrowPuck />
          </Link>
        ) : (
          <Link href="/auth/signin" className="ol-primary-button group px-[16px] py-[8px] text-sm">
            Sign in
            <ArrowPuck />
          </Link>
        )}
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-[1280px] items-center gap-[52px] px-[24px] pb-[72px] pt-[36px] sm:px-[40px] lg:grid-cols-[0.84fr_1.16fr] lg:pb-[80px] lg:pt-[44px]">
        <div>
          <div className="mb-[20px] inline-flex items-center gap-[8px] rounded-full border border-[#2b21161a] bg-[#fff9ecb8] px-[14px] py-[7px] text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a4a25]">
            <span className="h-[8px] w-[8px] rounded-full bg-[#ff6728]" />
            Site to sandbox
          </div>

          <h1 className="max-w-[610px] text-[clamp(3.05rem,5.7vw,5.25rem)] font-black leading-[0.91] tracking-[-0.065em] text-[#17130f]">
            Build from the web.
            <span className="block pl-[0.06em] text-[#8c4b26]">Keep the code.</span>
          </h1>

          <p className="mt-[22px] max-w-[540px] text-balance text-base leading-[1.55] text-[#5b4d3d] sm:text-xl">
            Noeron turns a URL or a rough idea into a live React app, then gives you the files, preview, and chat loop to keep shaping it.
          </p>

          <BuildLauncher />

          <div className="mt-[16px] flex flex-col gap-[12px] sm:flex-row">
            <Link href="#studio" className="ol-secondary-button px-[24px] py-[12px]">
              See the studio
            </Link>
          </div>
        </div>

        <div id="studio" className="relative">
          <div className="ol-bezel rounded-[32px] p-[8px]">
            <div className="ol-ink-panel rounded-[24px] p-[18px] sm:p-[24px]">
              <div className="mb-[20px] flex items-center justify-between border-b border-[#fff7e81a] pb-[16px]">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[#d2bfa3]">Generation run</p>
                  <p className="mt-[4px] text-lg font-semibold">noeron-site-remix</p>
                </div>
                <span className="rounded-full bg-[#ff6728] px-[12px] py-[4px] text-xs font-bold text-[#20130a]">
                  live
                </span>
              </div>

              <div className="grid gap-[16px] lg:grid-cols-[0.76fr_1.24fr]">
                <div className="rounded-[22px] bg-[#fff7e80d] p-[18px]">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#cdbb9f]">Prompt</p>
                  <p className="mt-[14px] text-[clamp(1.4rem,2.4vw,2rem)] font-semibold leading-[1.1] tracking-[-0.04em]">
                    Rebuild this launch page as a sharper React app.
                  </p>
                  <div className="mt-[24px] space-y-[10px] text-sm text-[#d7c9b5]">
                    <p className="rounded-[16px] bg-[#fff7e80d] px-[12px] py-[8px]">Extract brand palette</p>
                    <p className="rounded-[16px] bg-[#fff7e80d] px-[12px] py-[8px]">Create responsive sections</p>
                    <p className="rounded-[16px] bg-[#fff7e80d] px-[12px] py-[8px]">Keep components editable</p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[24px] bg-[#f5ead8] text-[#17130f] shadow-[0_24px_54px_rgba(0,0,0,0.24)]">
                  <div className="flex items-center gap-[8px] border-b border-[#2d21151a] bg-[#fff9ee] px-[16px] py-[12px]">
                    <span className="h-[12px] w-[12px] rounded-full bg-[#ff6728]" />
                    <span className="h-[12px] w-[12px] rounded-full bg-[#d2b179]" />
                    <span className="h-[12px] w-[12px] rounded-full bg-[#7d8a58]" />
                    <span className="ml-auto font-mono text-xs text-[#786953]">localhost:3000</span>
                  </div>
                  <div className="grid min-h-[300px] grid-rows-[1fr_auto] p-[20px]">
                    <div>
                      <div className="mb-[28px] flex items-center justify-between">
                        <NoeronLogo variant="light" iconClassName="h-[32px] w-[32px]" textClassName="text-[#17130f]" />
                        <span className="rounded-full border border-[#2d211526] px-[12px] py-[4px] text-xs">Preview</span>
                      </div>
                      <p className="max-w-[360px] text-[clamp(2.45rem,3.5vw,3.5rem)] font-black leading-[0.92] tracking-[-0.06em]">
                        Furniture with a slower pulse.
                      </p>
                      <div className="mt-[28px] grid grid-cols-3 gap-[8px]">
                        <span className="h-[24px] rounded-[18px] bg-[#1a1510]" />
                        <span className="h-[24px] rounded-[18px] bg-[#b45e2d]" />
                        <span className="h-[24px] rounded-[18px] bg-[#dfc39b]" />
                      </div>
                    </div>
                    <div className="mt-[24px] rounded-[18px] bg-[#17130f] p-[12px] font-mono text-xs text-[#ffe7c6]">
                      <p>src/App.jsx</p>
                      <p className="mt-[8px] text-[#ff9b65]">+ 11 files updated</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-[1280px] px-[24px] py-[68px] sm:px-[40px] lg:py-[76px]">
        <div className="grid gap-[24px] md:grid-cols-3">
          {featureCards.map((feature) => (
            <article
              key={feature.title}
              className="ol-bezel min-h-[220px] rounded-[28px] p-[28px]"
            >
              <p className="font-mono text-xs text-[#a15a2d]">{feature.meta}</p>
              <h2 className="mt-[34px] text-[clamp(1.8rem,2.3vw,2.4rem)] font-black leading-[0.98] tracking-[-0.045em] text-[#17130f]">
                {feature.title}
              </h2>
              <p className="mt-[18px] leading-[1.55] text-[#655847]">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="workflow" className="relative z-10 mx-auto w-full max-w-[1280px] px-[24px] py-[68px] sm:px-[40px] lg:pb-[72px] lg:pt-[84px]">
        <div className="grid items-center gap-[56px] lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8c4b26]">Workflow</p>
            <h2 className="mt-[18px] text-[clamp(3.2rem,5.1vw,5.35rem)] font-black leading-[0.92] tracking-[-0.06em] text-[#17130f]">
              The shortest path from reference to repo.
            </h2>
          </div>
          <div className="ol-ink-panel rounded-[32px] p-[10px]">
            <div className="rounded-[24px] border border-[#fff7e817] bg-[#fff7e80a] p-[24px]">
              {timeline.map((item, index) => (
                <div key={item} className="grid grid-cols-[42px_1fr] gap-[16px] border-b border-[#fff7e814] py-[16px] first:pt-[4px] last:border-b-0 last:pb-[4px]">
                  <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#ff6728] font-mono text-sm font-bold text-[#20130a]">
                    {index + 1}
                  </span>
                  <p className="text-[clamp(1.15rem,1.65vw,1.45rem)] font-semibold leading-[1.25] tracking-[-0.025em] text-[#fff7e8]">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="relative z-10 mx-auto w-full max-w-[1280px] px-[24px] py-[68px] sm:px-[40px] lg:py-[76px]">
        <div className="mb-[28px] flex flex-col gap-[16px] lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8c4b26]">Pricing</p>
            <h2 className="mt-[18px] max-w-[760px] text-[clamp(3rem,4.6vw,5rem)] font-black leading-[0.92] tracking-[-0.06em] text-[#17130f]">
              Start free. Upgrade when builds become daily work.
            </h2>
          </div>
          <Link href="/pricing" className="ol-secondary-button w-max px-[22px] py-[12px]">
            Compare all plans
          </Link>
        </div>

        <div className="grid gap-[18px] lg:grid-cols-3">
          {planOrder.map((tier) => {
            const plan = TIERS[tier];
            const isPaid = tier !== "free";

            return (
              <article
                key={tier}
                className={`flex min-h-[430px] flex-col rounded-[30px] border p-[28px] ${
                  tier === "pro"
                    ? "border-[#ff6728a8] bg-[#17130f] text-[#fff7e8] shadow-[0_32px_90px_rgba(47,31,17,0.22)]"
                    : "ol-bezel text-[#17130f]"
                }`}
              >
                <div className="flex items-start justify-between gap-[16px]">
                  <div>
                    <p className={`text-[13px] font-bold uppercase tracking-[0.18em] ${
                      tier === "pro" ? "text-[#ff9b65]" : "text-[#8c4b26]"
                    }`}>
                      {plan.name}
                    </p>
                    <p className={`mt-[14px] text-sm leading-[1.5] ${
                      tier === "pro" ? "text-[#d7c9b5]" : "text-[#655847]"
                    }`}>
                      {planDescriptions[tier]}
                    </p>
                  </div>
                  {tier === "pro" ? (
                    <span className="rounded-full bg-[#ff6728] px-[10px] py-[5px] text-xs font-black uppercase tracking-[0.08em] text-[#20130a]">
                      Popular
                    </span>
                  ) : null}
                </div>

                <div className="mt-[30px] flex items-end gap-[6px]">
                  <span className="text-[clamp(3.4rem,5vw,5rem)] font-black leading-none tracking-[-0.06em]">
                    ${plan.price}
                  </span>
                  <span className={`pb-[8px] text-sm ${tier === "pro" ? "text-[#d7c9b5]" : "text-[#655847]"}`}>
                    /month
                  </span>
                </div>

                <p className={`mt-[10px] text-sm ${tier === "pro" ? "text-[#d7c9b5]" : "text-[#655847]"}`}>
                  {formatTokenAmount(plan.tokens)} tokens per month
                </p>

                <ul className="mt-[28px] flex-1 space-y-[12px]">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-[10px] text-sm leading-[1.45]">
                      <span className={`mt-[3px] h-[8px] w-[8px] shrink-0 rounded-full ${
                        tier === "pro" ? "bg-[#ff6728]" : "bg-[#8c4b26]"
                      }`} />
                      <span className={tier === "pro" ? "text-[#f1e2c9]" : "text-[#514637]"}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={isPaid ? "/pricing" : "/auth/signin?callbackUrl=/generation"}
                  className={`${tier === "pro" ? "ol-primary-button" : "ol-secondary-button"} mt-[30px] px-[20px] py-[12px]`}
                >
                  {isPaid ? "Subscribe" : "Start free"}
                  <ArrowPuck />
                </Link>
              </article>
            );
          })}
        </div>

        <div className="mt-[18px] rounded-[24px] border border-[#2d21151a] bg-[#fff9ef8a] px-[22px] py-[16px] text-sm leading-[1.55] text-[#655847]">
          Paid subscriptions are handled by Stripe. Sign in first, then choose Pro or Team on the full pricing page.
        </div>
      </section>

      <section id="faq" className="relative z-10 mx-auto w-full max-w-[1280px] px-[24px] py-[68px] sm:px-[40px] lg:py-[76px]">
        <div className="grid gap-[56px] lg:grid-cols-[0.62fr_1fr]">
          <h2 className="text-[clamp(2.8rem,4.3vw,4.8rem)] font-black leading-[0.95] tracking-[-0.06em] text-[#17130f]">
            Plain answers.
          </h2>
          <div className="space-y-[16px]">
            {faq.map((item) => (
              <article key={item.q} className="ol-bezel rounded-[24px] p-[24px]">
                <h3 className="text-[clamp(1.25rem,1.7vw,1.6rem)] font-bold leading-[1.15] tracking-[-0.025em]">{item.q}</h3>
                <p className="mt-[10px] leading-[1.6] text-[#655847]">{item.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative z-10 mx-auto flex w-full max-w-[1280px] flex-col gap-[20px] px-[24px] py-[48px] text-sm text-[#665745] sm:px-[40px] md:flex-row md:items-center md:justify-between">
        <BrandMark />
        <div className="flex gap-[20px]">
          <Link href={session?.user ? "/generation" : "/auth/signin"} className="transition-colors hover:text-[#17130f]">
            {session?.user ? "Open builder" : "Sign in"}
          </Link>
          <Link href="/pricing" className="transition-colors hover:text-[#17130f]">
            Pricing
          </Link>
        </div>
      </footer>
    </main>
  );
}
