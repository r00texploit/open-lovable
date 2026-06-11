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
  Zap,
} from "lucide-react";

interface GenerationSession {
  id: string;
  sandboxId: string;
  sandboxUrl: string | null;
  aiModel: string | null;
  lastActiveAt: string;
  chatMessages: Array<{ content: string; type: string }>;
  site: { id: string; name: string; slug: string } | null;
}

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
      className="p-1 rounded hover:bg-[#17130f]/5 transition-colors"
      title="Copy URL"
    >
      {copied ? <Check size={13} className="text-green-700" /> : <Copy size={13} className="text-[#5f534399]" />}
    </button>
  );
}

function SiteCard({ site, onEdit }: { site: Site; onEdit: (id: string) => void }) {
  return (
    <div className="group relative ol-bezel rounded-2xl hover:shadow-[0_24px_60px_rgba(74,54,28,0.18)] transition-all duration-200 overflow-hidden">
      {/* Preview strip */}
      <div className="h-2 w-full" style={{ background: "linear-gradient(90deg, #17130f 0%, #8c4b26 55%, #ff6728 100%)" }} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-[#17130f] truncate text-[15px]">{site.name}</h3>
            <p className="text-[12px] text-[#5f534399] truncate mt-0.5">{site.slug}</p>
          </div>
          <span
            className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
              site.published
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
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
        <div className="flex items-center gap-1 bg-[#17130f]/5 rounded-lg px-3 py-2 mb-4">
          <Globe size={12} className="text-[#8c4b26] shrink-0" />
          <span className="text-[12px] text-[#5f5343] truncate flex-1">{site.liveUrl}</span>
          <CopyButton text={site.liveUrl} />
          {site.published && (
            <a
              href={site.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded hover:bg-[#17130f]/5 transition-colors"
              title="Open site"
            >
              <ExternalLink size={13} className="text-[#5f534399]" />
            </a>
          )}
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[11px] text-[#5f534399]">
            <Clock size={11} />
            {site.lastPublishedAt
              ? `Published ${timeAgo(site.lastPublishedAt)}`
              : `Created ${timeAgo(site.createdAt)}`}
          </span>

          <button
            onClick={() => onEdit(site.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#17130f] hover:bg-[#2a221a] text-[#fff7e8] text-[12px] font-medium rounded-full transition-colors"
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
      <div className="w-16 h-16 bg-[#ff6728]/10 rounded-2xl flex items-center justify-center mb-5">
        <Globe size={28} className="text-[#8c4b26]" />
      </div>
      <h3 className="text-lg font-semibold text-[#17130f] mb-2">No websites yet</h3>
      <p className="text-sm text-[#5f5343] mb-6 max-w-xs">
        Start by building your first website from a URL or description.
      </p>
      <button
        onClick={onCreate}
        className="ol-primary-button px-5 py-2.5 text-sm"
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
  const [sessions, setSessions] = useState<GenerationSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin?callbackUrl=/sites");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    Promise.all([
      fetch("/api/sites").then((r) => r.json()),
      fetch("/api/generation-session").then((r) => r.json()),
    ])
      .then(([sitesData, sessionsData]) => {
        setSites(sitesData.sites ?? []);
        setSessions(sessionsData.sessions ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load your data.");
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
      <div className="min-h-screen bg-[#fff7e8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#17130f] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#5f5343]">Loading your sites…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff7e8]">
      {/* Nav */}
      <header className="sticky top-0 z-10 bg-[#fff7e8]/80 backdrop-blur-xl border-b border-[#261e151f]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-[#17130f] hover:text-[#8c4b26] transition-colors">
            <NoeronLogo
              iconClassName="h-[32px] w-[32px]"
              textClassName="text-[17px] font-bold text-[#17130f]"
            />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/generation"
              className="text-sm text-[#5f5343] hover:text-[#17130f] transition-colors"
            >
              Studio
            </Link>
            <button
              onClick={handleCreate}
              className="ol-primary-button px-4 py-2 text-sm"
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
          <h1 className="text-2xl font-black tracking-[-0.035em] text-[#17130f]">My Websites</h1>
          <p className="text-sm text-[#5f5343] mt-1">
            {sites.length > 0
              ? `${sites.length} site${sites.length === 1 ? "" : "s"}`
              : "Build and manage your AI-generated websites"}
          </p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 bg-red-400/10 border border-red-300/40 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Recent sessions — continue where you left off */}
        {sessions.length > 0 && (
          <div className="mb-10">
            <h2 className="text-sm font-semibold text-[#8c4b26] uppercase tracking-wider mb-3">
              Continue editing
            </h2>
            <div className="flex flex-col gap-2">
              {sessions.slice(0, 5).map((s) => {
                const lastMsg = [...(s.chatMessages ?? [])].reverse().find(
                  (m) => m.type === "user"
                );
                return (
                  <button
                    key={s.id}
                    onClick={() =>
                      router.push(`/generation?sandbox=${s.sandboxId}`)
                    }
                    className="flex items-center gap-4 bg-[#fffcf4]/70 border border-[#261e151f] rounded-xl px-4 py-3 text-left hover:border-[#ff672866] hover:shadow-[0_12px_32px_rgba(74,54,28,0.12)] transition-all group"
                  >
                    <div className="shrink-0 w-8 h-8 bg-[#17130f] rounded-lg flex items-center justify-center">
                      <Zap size={14} className="text-[#ff6728]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#17130f] truncate">
                        {s.site?.name ?? "Untitled session"}
                      </p>
                      {lastMsg && (
                        <p className="text-xs text-[#5f534399] truncate mt-0.5">
                          {lastMsg.content.slice(0, 80)}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs text-[#5f534399]">{timeAgo(s.lastActiveAt)}</p>
                      <p className="text-xs text-[#5f534366] mt-0.5">{s.aiModel?.split("/").pop() ?? ""}</p>
                    </div>
                    <Edit3 size={14} className="shrink-0 text-[#5f534366] group-hover:text-[#8c4b26] transition-colors" />
                  </button>
                );
              })}
            </div>
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
              className="flex flex-col items-center justify-center gap-3 bg-[#fffcf4]/50 rounded-2xl border-2 border-dashed border-[#261e1533] hover:border-[#ff6728] hover:bg-[#fffcf4] transition-all duration-200 min-h-[180px] text-[#5f5343] hover:text-[#17130f]"
            >
              <div className="w-10 h-10 rounded-xl bg-[#ff6728]/10 flex items-center justify-center">
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
