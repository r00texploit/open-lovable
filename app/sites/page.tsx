"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { NoeronLogo } from "@/components/brand/noeron-logo";
import {
  Globe,
  Plus,
  ExternalLink,
  Edit3,
  Clock,
  CheckCircle2,
  Circle,
  Copy,
  Check,
} from "lucide-react";

interface Site {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  customDomain: string | null;
  published: boolean;
  liveUrl: string;
  createdAt: string;
  updatedAt: string;
  lastPublishedAt: string | null;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="p-1 rounded hover:bg-black/5 transition-colors"
      title="Copy URL"
    >
      {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} className="text-gray-400" />}
    </button>
  );
}

function SiteCard({ site, onEdit }: { site: Site; onEdit: (id: string) => void }) {
  return (
    <div className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      {/* Preview strip */}
      <div className="h-2 w-full" style={{ background: "linear-gradient(90deg, #0a1628 0%, #2a6dd9 50%, #4a90f5 100%)" }} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate text-[15px]">{site.name}</h3>
            <p className="text-[12px] text-gray-400 truncate mt-0.5">{site.slug}</p>
          </div>
          <span
            className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
              site.published
                ? "bg-green-50 text-green-700"
                : "bg-yellow-50 text-yellow-700"
            }`}
          >
            {site.published ? (
              <CheckCircle2 size={10} />
            ) : (
              <Circle size={10} />
            )}
            {site.published ? "Published" : "Draft"}
          </span>
        </div>

        {/* URL row */}
        <div className="flex items-center gap-1 bg-gray-50 rounded-lg px-3 py-2 mb-4">
          <Globe size={12} className="text-gray-400 shrink-0" />
          <span className="text-[12px] text-gray-500 truncate flex-1">{site.liveUrl}</span>
          <CopyButton text={site.liveUrl} />
          {site.published && (
            <a
              href={site.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded hover:bg-black/5 transition-colors"
              title="Open site"
            >
              <ExternalLink size={13} className="text-gray-400" />
            </a>
          )}
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[11px] text-gray-400">
            <Clock size={11} />
            {site.lastPublishedAt
              ? `Published ${timeAgo(site.lastPublishedAt)}`
              : `Created ${timeAgo(site.createdAt)}`}
          </span>

          <button
            onClick={() => onEdit(site.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-700 text-white text-[12px] font-medium rounded-lg transition-colors"
          >
            <Edit3 size={12} />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-5">
        <Globe size={28} className="text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">No websites yet</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-xs">
        Start by building your first website from a URL or description.
      </p>
      <button
        onClick={onCreate}
        className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium rounded-xl transition-colors"
      >
        <Plus size={16} />
        Build your first site
      </button>
    </div>
  );
}

export default function SitesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/sites");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/sites")
      .then((r) => r.json())
      .then((data) => {
        setSites(data.sites ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load your sites.");
        setLoading(false);
      });
  }, [status]);

  const handleEdit = (siteId: string) => {
    router.push(`/generation?site=${siteId}`);
  };

  const handleCreate = () => {
    router.push("/generation");
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading your sites…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f7]">
      {/* Nav */}
      <header className="sticky top-0 z-10 bg-[#faf9f7]/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <NoeronLogo
              iconClassName="h-[32px] w-[32px]"
              textClassName="text-[17px] font-bold text-gray-900"
            />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/generation"
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              Studio
            </Link>
            <button
              onClick={handleCreate}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-gray-700 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus size={15} />
              New site
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My Websites</h1>
          <p className="text-sm text-gray-500 mt-1">
            {sites.length > 0
              ? `${sites.length} site${sites.length === 1 ? "" : "s"}`
              : "Build and manage your AI-generated websites"}
          </p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        {sites.length === 0 ? (
          <EmptyState onCreate={handleCreate} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sites.map((site) => (
              <SiteCard key={site.id} site={site} onEdit={handleEdit} />
            ))}
            {/* New site card */}
            <button
              onClick={handleCreate}
              className="flex flex-col items-center justify-center gap-3 bg-white rounded-2xl border-2 border-dashed border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 min-h-[180px] text-gray-400 hover:text-gray-600"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <Plus size={20} />
              </div>
              <span className="text-sm font-medium">New website</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
