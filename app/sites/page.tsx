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
  ChevronRight,
  LayoutGrid,
  Sparkles,
  ShieldCheck,
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
      className="p-1.5 rounded-md hover:bg-background-base transition-colors text-foreground-dimmer hover:text-foreground"
      title="Copy URL"
    >
      {copied ? <Check size={14} className="text-accent-forest" /> : <Copy size={14} />}
    </button>
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
      <div className="min-h-screen bg-background-base flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-heat-100 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-foreground-dimmer">Loading your sites...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-base">
      {/* Navigation */}
      <header className="sticky top-0 z-10 bg-background-lighter/80 backdrop-blur-xl border-b border-border-faint">
        <div className="container-modern">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <NoeronLogo iconClassName="h-7 w-7" textClassName="text-foreground font-semibold" />
            </Link>

            <div className="flex items-center gap-3">
              {session?.user?.role === "admin" && (
                <Link href="/admin" className="btn btn-ghost">
                  <ShieldCheck className="w-4 h-4" />
                  Admin
                </Link>
              )}
              <Link
                href="/generation"
                className="btn btn-ghost"
              >
                Studio
              </Link>
              <button onClick={handleCreate} className="btn btn-primary">
                <Plus className="w-4 h-4" />
                New site
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container-modern py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">My Websites</h1>
          <p className="text-sm text-foreground-dimmer mt-1">
            {sites.length > 0
              ? `${sites.length} site${sites.length === 1 ? "" : "s"} deployed`
              : "Build and manage your AI-generated websites"}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <div className="mb-10">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
              Continue editing
            </h2>
            <div className="space-y-2">
              {sessions.slice(0, 5).map((s) => {
                const lastMsg = [...(s.chatMessages ?? [])].reverse().find(
                  (m) => m.type === "user"
                );
                return (
                  <button
                    key={s.id}
                    onClick={() => router.push(`/generation?sandbox=${s.sandboxId}`)}
                    className="w-full flex items-center gap-4 bg-background-lighter rounded-xl p-4 border border-border-faint hover:border-heat-40 hover:shadow-sm transition-all group text-left"
                  >
                    <div className="w-10 h-10 bg-foreground rounded-lg flex items-center justify-center flex-shrink-0">
                      <Zap size={18} className="text-heat-100" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {s.site?.name ?? "Untitled session"}
                      </p>
                      {lastMsg && (
                        <p className="text-xs text-foreground-dimmer truncate mt-0.5">
                          {lastMsg.content.slice(0, 60)}...
                        </p>
                      )}
                    </div>
                    <div className="text-right text-xs text-foreground-dimmer">
                      <p>{timeAgo(s.lastActiveAt)}</p>
                    </div>
                    <ChevronRight size={16} className="text-border-loud group-hover:text-heat-100 transition-colors" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Sites Grid */}
        {sites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-background-lighter rounded-2xl border border-border-faint border-dashed">
            <div className="w-14 h-14 bg-heat-8 rounded-2xl flex items-center justify-center mb-5">
              <Globe size={28} className="text-heat-100" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No websites yet</h3>
            <p className="text-sm text-foreground-dimmer mb-6 max-w-xs">
              Start by building your first website from a URL or description.
            </p>
            <button onClick={handleCreate} className="btn btn-primary">
              <Plus size={16} />
              Build your first site
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sites.map((site) => (
              <div
                key={site.id}
                className="group bg-background-lighter rounded-2xl border border-border-faint overflow-hidden hover:border-heat-40 hover:shadow-lg hover:shadow-black-alpha-10 transition-all"
              >
                {/* Preview stripe */}
                <div className="h-1.5 w-full bg-gradient-to-r from-foreground via-heat-100 to-heat-200" />

                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{site.name}</h3>
                      <p className="text-xs text-foreground-dimmer truncate mt-0.5">{site.slug}</p>
                    </div>
                    <span
                      className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        site.published
                          ? "bg-accent-forest/10 text-accent-forest"
                          : "bg-background-base text-foreground-dimmer"
                      }`}
                    >
                      {site.published ? <CheckCircle2 size={10} /> : <Circle size={10} />}
                      {site.published ? "Live" : "Draft"}
                    </span>
                  </div>

                  {/* URL */}
                  <div className="flex items-center gap-2 bg-background-base rounded-lg px-3 py-2 mb-4">
                    <Globe size={14} className="text-heat-100 shrink-0" />
                    <span className="text-xs text-foreground-dimmer truncate flex-1">{site.liveUrl}</span>
                    <CopyButton text={site.liveUrl} />
                    {site.published && (
                      <a
                        href={site.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-md hover:bg-border-faint transition-colors text-foreground-dimmer hover:text-foreground"
                        title="Open site"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs text-foreground-dimmer">
                      <Clock size={12} />
                      {site.lastPublishedAt
                        ? `Published ${timeAgo(site.lastPublishedAt)}`
                        : `Created ${timeAgo(site.createdAt)}`}
                    </span>

                    <button
                      onClick={() => handleEdit(site.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground hover:bg-accent-black text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      <Edit3 size={12} />
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* New site card */}
            <button
              onClick={handleCreate}
              className="flex flex-col items-center justify-center gap-3 bg-background-lighter rounded-2xl border-2 border-dashed border-border-muted hover:border-heat-100 hover:bg-heat-8 transition-all min-h-[200px] text-foreground-dimmer hover:text-foreground"
            >
              <div className="w-12 h-12 rounded-xl bg-heat-8 flex items-center justify-center">
                <Plus size={24} className="text-heat-100" />
              </div>
              <span className="text-sm font-medium">Create new site</span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
