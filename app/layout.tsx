import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Source_Sans_3 } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";

// Distinctive font pairing - NOT Inter/Roboto
// Space Grotesk for headings (geometric, modern)
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Source Sans 3 for body (highly readable, professional)
const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

// $10K Checklist #08: The invisible expensive stuff - proper meta tags
export const metadata: Metadata = {
  title: {
    default: "Noeron - AI Website Builder",
    template: "%s | Noeron",
  },
  description: "Transform any idea into a production-ready React application with AI. No coding required. Just describe what you want.",
  keywords: ["AI website builder", "React generator", "no-code", "web development", "GPT-4o", "Claude"],
  authors: [{ name: "Noeron" }],
  creator: "Noeron",
  publisher: "Noeron",
  metadataBase: new URL("https://noeron.io"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://noeron.io",
    siteName: "Noeron",
    title: "Noeron - AI Website Builder",
    description: "Transform any idea into a production-ready React application with AI. No coding required.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Noeron - AI Website Builder",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Noeron - AI Website Builder",
    description: "Transform any idea into a production-ready React application with AI. No coding required.",
    images: ["/og-image.jpg"],
    creator: "@noeron",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0b" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* Local fonts are loaded via next/font/local CSS; avoid manual relative
            preloads because they resolve incorrectly on 404 pages and create
            a recursive /fonts/fonts/... 404 chain. */}
      </head>
      <body
        className={`${spaceGrotesk.variable} ${sourceSans.variable} ${geistSans.variable} ${geistMono.variable} font-body antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
