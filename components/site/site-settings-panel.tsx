'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ExternalLink, Globe, Loader2, RefreshCw, Save } from 'lucide-react';

interface SiteSummary {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  customDomain: string | null;
  customDomainVerified: boolean;
  domainStatus: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  lastPublishedAt: string | null;
  liveUrl: string;
}

function suggestSiteDetailsFromUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return { name: 'My Site', slug: 'my-site' };
  }

  const normalized = trimmed.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return {
    name: trimmed,
    slug: normalized.slice(0, 50) || 'my-site',
  };
}

export function SiteSettingsPanel() {
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [verification, setVerification] = useState<Array<{ type: string; domain: string; value: string; reason?: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteSlug, setNewSiteSlug] = useState('');

  const selectedSite = sites.find((site) => site.id === selectedSiteId) || null;

  useEffect(() => {
    fetchSites();
  }, []);

  useEffect(() => {
    if (selectedSite) {
      setName(selectedSite.name);
      setSlug(selectedSite.slug);
      setCustomDomain(selectedSite.customDomain || '');
    }
  }, [selectedSite]);

  const fetchSites = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sites');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch sites');
      }

      setSites(data.sites || []);
      if (!selectedSiteId && data.sites?.[0]) {
        setSelectedSiteId(data.sites[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createSite = async () => {
    setMessage(null);
    setError(null);

    try {
      setAction('create');
      const response = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSiteName, slug: newSiteSlug }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create site');
      }

      setSites((prev) => [data.site, ...prev]);
      setSelectedSiteId(data.site.id);
      setNewSiteName('');
      setNewSiteSlug('');
      setMessage(`Created ${data.site.name}. Generate and publish a build from the app workspace to make it live.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAction(null);
    }
  };

  const saveSite = async () => {
    if (!selectedSite) {
      return;
    }

    setMessage(null);
    setError(null);

    try {
      setAction('save');
      const response = await fetch(`/api/sites/${selectedSite.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save site');
      }

      setSites((prev) => prev.map((site) => (site.id === data.site.id ? data.site : site)));
      setMessage(`Saved ${data.site.name}.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAction(null);
    }
  };

  const togglePublished = async () => {
    if (!selectedSite) {
      return;
    }

    setMessage(null);
    setError(null);

    try {
      setAction('toggle-published');
      const response = await fetch(`/api/sites/${selectedSite.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !selectedSite.published }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update publish status');
      }

      setSites((prev) => prev.map((site) => (site.id === data.site.id ? data.site : site)));
      setMessage(
        data.site.published
          ? `Re-enabled public access for ${data.site.name}.`
          : `Unpublished ${data.site.name}.`
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAction(null);
    }
  };

  const connectDomain = async () => {
    if (!selectedSite) {
      return;
    }

    setMessage(null);
    setError(null);

    try {
      setAction('connect-domain');
      const response = await fetch(`/api/sites/${selectedSite.id}/custom-domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: customDomain }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect custom domain');
      }

      setSites((prev) => prev.map((site) => (site.id === data.site.id ? data.site : site)));
      setVerification(data.verification || []);
      setMessage(
        data.site.customDomainVerified
          ? `Connected and verified ${data.site.customDomain}.`
          : `Custom domain added. Finish DNS setup, then verify.`
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAction(null);
    }
  };

  const refreshDomainStatus = async () => {
    if (!selectedSite) {
      return;
    }

    setMessage(null);
    setError(null);

    try {
      setAction('refresh-domain');
      const response = await fetch(`/api/sites/${selectedSite.id}/custom-domain/status`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to refresh domain status');
      }

      setSites((prev) =>
        prev.map((site) =>
          site.id === selectedSite.id
            ? {
                ...site,
                customDomainVerified: data.site.customDomainVerified,
                domainStatus: data.site.domainStatus,
              }
            : site
        )
      );
      setVerification(data.verification || []);
      setMessage(`Fetched the latest verification status for ${selectedSite.customDomain}.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAction(null);
    }
  };

  const verifyDomain = async () => {
    if (!selectedSite) {
      return;
    }

    setMessage(null);
    setError(null);

    try {
      setAction('verify-domain');
      const response = await fetch(`/api/sites/${selectedSite.id}/custom-domain/verify`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify domain');
      }

      setSites((prev) =>
        prev.map((site) =>
          site.id === selectedSite.id
            ? {
                ...site,
                customDomainVerified: data.site.customDomainVerified,
                domainStatus: data.site.domainStatus,
              }
            : site
        )
      );
      setVerification(data.verification || []);
      setMessage(
        data.site.customDomainVerified
          ? `${selectedSite.customDomain} is now verified.`
          : `Verification is still pending. Update DNS and try again.`
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAction(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#261e151f] bg-white p-8 text-center text-[#5f5343]">
        <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-[#8c4b26]" />
        Loading site settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#261e151f] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-[#17130f]">Sites</h3>
            <p className="text-sm text-[#5f5343]">
              Manage subdomains, publish state, and optional custom domains for your tenant sites.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={newSiteName}
              onChange={(event) => {
                const value = event.target.value;
                setNewSiteName(value);
                if (!newSiteSlug) {
                  setNewSiteSlug(suggestSiteDetailsFromUrl(value).slug);
                }
              }}
              placeholder="New site name"
              className="rounded-lg border border-[#261e151f] px-3 py-2 text-sm"
            />
            <input
              value={newSiteSlug}
              onChange={(event) => setNewSiteSlug(event.target.value.toLowerCase())}
              placeholder="new-site-slug"
              className="rounded-lg border border-[#261e151f] px-3 py-2 text-sm"
            />
            <button
              onClick={createSite}
              disabled={action !== null || !newSiteName.trim() || !newSiteSlug.trim()}
              className="ol-primary-button px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {action === 'create' ? 'Creating...' : 'Create Site'}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <select
            value={selectedSiteId}
            onChange={(event) => setSelectedSiteId(event.target.value)}
            className="min-w-[260px] rounded-lg border border-[#261e151f] bg-[#fff7e8] px-3 py-2 text-sm"
          >
            <option value="">Select a site</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name} ({site.slug})
              </option>
            ))}
          </select>

          {selectedSite && (
            <>
              <Link
                href={selectedSite.liveUrl}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-lg border border-[#261e151f] px-4 py-2 text-sm text-[#17130f] hover:bg-[#17130f]/5"
              >
                Open Live URL
                <ExternalLink className="h-4 w-4" />
              </Link>
              <Link
                href={`/site-preview/${selectedSite.slug}`}
                target="_blank"
                className="inline-flex items-center gap-2 rounded-lg border border-[#261e151f] px-4 py-2 text-sm text-[#17130f] hover:bg-[#17130f]/5"
              >
                Preview Snapshot
                <Globe className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </div>

      {selectedSite && (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-[#261e151f] bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h4 className="text-lg font-semibold text-[#17130f]">Site Identity</h4>
                <p className="text-sm text-[#5f5343]">
                  Free URL: {selectedSite.liveUrl}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-medium ${
                selectedSite.published ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {selectedSite.published ? 'Published' : 'Draft'}
              </span>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#17130f]">Site name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-lg border border-[#261e151f] px-3 py-2 text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#17130f]">Subdomain slug</span>
                <input
                  value={slug}
                  onChange={(event) => setSlug(event.target.value.toLowerCase())}
                  className="w-full rounded-lg border border-[#261e151f] px-3 py-2 text-sm"
                />
              </label>

              <div className="rounded-xl border border-dashed border-[#261e151f] bg-[#fff7e8] p-4">
                <p className="text-sm font-medium text-[#17130f]">Publishing</p>
                <p className="mt-1 text-sm text-[#5f5343]">
                  Publish the current sandbox build from the generation workspace. After the first publish, you can toggle visibility here without losing the stored snapshot.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={togglePublished}
                    disabled={action !== null}
                    className="inline-flex items-center gap-2 rounded-lg border border-[#261e151f] px-4 py-2 text-sm text-[#17130f] hover:bg-[#17130f]/5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {selectedSite.published ? 'Unpublish' : 'Enable Public Access'}
                  </button>
                  {selectedSite.lastPublishedAt && (
                    <span className="text-sm text-[#5f5343]">
                      Last published {new Date(selectedSite.lastPublishedAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={saveSite}
                disabled={action !== null}
                className="inline-flex items-center gap-2 rounded-lg bg-[#17130f] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {action === 'save' ? 'Saving...' : 'Save Site Settings'}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-[#261e151f] bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-[#17130f]">Custom Domain</h4>
              <p className="text-sm text-[#5f5343]">
                Add an optional branded domain after your default `{selectedSite.slug}.{process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'mydomain.com'}` URL is working.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#17130f]">Custom domain</span>
                <input
                  value={customDomain}
                  onChange={(event) => setCustomDomain(event.target.value.toLowerCase())}
                  placeholder="customerbrand.com"
                  className="w-full rounded-lg border border-[#261e151f] px-3 py-2 text-sm"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={connectDomain}
                  disabled={action !== null || !customDomain.trim()}
                  className="rounded-lg bg-[#17130f] px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {action === 'connect-domain' ? 'Connecting...' : 'Add Domain'}
                </button>
                <button
                  onClick={refreshDomainStatus}
                  disabled={action !== null || !selectedSite.customDomain}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#261e151f] px-4 py-2 text-sm text-[#17130f] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Status
                </button>
                <button
                  onClick={verifyDomain}
                  disabled={action !== null || !selectedSite.customDomain}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#261e151f] px-4 py-2 text-sm text-[#17130f] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  Verify
                </button>
              </div>

              <div className="rounded-xl border border-dashed border-[#261e151f] bg-[#fff7e8] p-4">
                <p className="text-sm font-medium text-[#17130f]">
                  Verification status: {selectedSite.customDomainVerified ? 'Verified' : selectedSite.domainStatus}
                </p>
                <p className="mt-1 text-sm text-[#5f5343]">
                  Point your DNS to Vercel, then refresh and verify here. Wildcard and root platform domains are configured once at the platform level; this screen is for per-site customer domains.
                </p>
                {verification.length > 0 && (
                  <div className="mt-3 space-y-2 text-xs text-[#5f5343]">
                    {verification.map((item) => (
                      <div key={`${item.type}-${item.domain}-${item.value}`} className="rounded-lg bg-white p-3">
                        <p><strong>{item.type}</strong> record for {item.domain}</p>
                        <p>Value: {item.value}</p>
                        {item.reason && <p>Reason: {item.reason}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-[#261e151f] bg-[#17130f]/[0.03] p-4 text-sm text-[#5f5343]">
                DNS setup flow:
                <div className="mt-2 space-y-1">
                  <p>1. Add the domain here.</p>
                  <p>2. Apply the DNS records Vercel asks for.</p>
                  <p>3. Refresh status and verify once propagation completes.</p>
                  <p>4. Keep the default Noeron URL as your fallback path.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {sites.length === 0 && !loading && (
        <div className="rounded-2xl border border-dashed border-[#261e151f] bg-white p-8 text-center">
          <p className="text-[#17130f]">No sites yet.</p>
          <p className="mt-2 text-sm text-[#5f5343]">
            Create your first site here, then open the generation workspace to build and publish it.
          </p>
          <Link href="/generation" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#8c4b26]">
            Open Generation Workspace
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
