'use client';

import { useState, useEffect, useRef, useCallback, Suspense, type ReactNode } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { appConfig } from '@/config/app.config';
import HeroInput from '@/components/HeroInput';
import SidebarInput from '@/components/app/generation/SidebarInput';
import AiImagesToggle from '@/components/app/generation/AiImagesToggle';
import { processGeneratedCodeForImages } from '@/lib/ai/image-generator';
import BrandSelect from '@/components/app/generation/BrandSelect';
import { NoeronLogo } from '@/components/brand/noeron-logo';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
// Import icons from centralized module to avoid Turbopack chunk issues
import {
  FiFile,
  FiChevronRight,
  FiChevronDown,
  FiGithub,
  BsFolderFill,
  BsFolder2Open,
  SiJavascript,
  SiReact,
  SiCss3,
  SiJson
} from '@/lib/icons';
import { motion } from 'framer-motion';
import CodeApplicationProgress, { type CodeApplicationState } from '@/components/CodeApplicationProgress';

type UploadedImagePayload = { base64: string; type: string; name: string };

const MAX_CHAT_UPLOAD_IMAGES = 40;

const getImagesForGeneratedCode = (
  code: string,
  currentImages?: UploadedImagePayload[],
  fallbackImages?: UploadedImagePayload[]
) => {
  if (!/\/images\/image-\d+\.(png|jpe?g|gif|webp|avif)/i.test(code)) {
    return undefined;
  }

  if (currentImages && currentImages.length > 0) {
    return currentImages;
  }

  if (fallbackImages && fallbackImages.length > 0) {
    return fallbackImages;
  }

  return undefined;
};

interface SandboxData {
  sandboxId: string;
  url: string;
  previewUrl?: string;
  [key: string]: any;
}

interface ChatMessage {
  content: string;
  type: 'user' | 'ai' | 'system' | 'file-update' | 'command' | 'error';
  timestamp: Date;
  metadata?: {
    scrapedUrl?: string;
    scrapedContent?: any;
    generatedCode?: string;
    appliedFiles?: string[];
    commandType?: 'input' | 'output' | 'error' | 'success';
    brandingData?: any;
    sourceUrl?: string;
  };
}

interface ScrapeData {
  success: boolean;
  content?: string;
  url?: string;
  title?: string;
  source?: string;
  screenshot?: string;
  structured?: any;
  metadata?: any;
  message?: string;
  error?: string;
}

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

  try {
    const normalized = trimmed.match(/^https?:\/\//i) ? trimmed : `https://${trimmed}`;
    const { hostname } = new URL(normalized);
    const rootLabel = hostname.replace(/^www\./, '').split('.')[0] || 'site';
    const words = rootLabel
      .split(/[-_]+/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1));

    return {
      name: words.join(' ') || 'My Site',
      slug: rootLabel.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 50) || 'my-site',
    };
  } catch {
    return { name: 'My Site', slug: 'my-site' };
  }
}

function AISandboxPage() {
  const { data: session } = useSession();
  const [sandboxData, setSandboxData] = useState<SandboxData | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ text: 'Not connected', active: false });
  const [responseArea, setResponseArea] = useState<string[]>([]);
  const [structureContent, setStructureContent] = useState('No sandbox created yet');
  const [promptInput, setPromptInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      content: 'Welcome! I can help you generate code with full context of your sandbox files and structure. Just start chatting - I\'ll automatically create a sandbox for you if needed!\n\nTip: If you see package errors like "react-router-dom not found", just type "npm install" or "check packages" to automatically install missing packages.',
      type: 'system',
      timestamp: new Date()
    }
  ]);
  const [aiChatInput, setAiChatInput] = useState('');
  const [aiEnabled] = useState(true);
  const [aiImagesEnabled, setAiImagesEnabled] = useState(false);
  const canUseAiImages = ['plus', 'team'].includes(session?.user?.subscription?.tier ?? '');
  const [chatUploadedImages, setChatUploadedImages] = useState<UploadedImagePayload[]>([]);
  const searchParams = useSearchParams();
  const router = useRouter();
  const [aiModel, setAiModel] = useState(() => {
    const modelParam = searchParams.get('model');
    return appConfig.ai.availableModels.includes(modelParam || '') ? modelParam! : appConfig.ai.defaultModel;
  });
  const [urlOverlayVisible, setUrlOverlayVisible] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlStatus, setUrlStatus] = useState<string[]>([]);
  const [showHomeScreen, setShowHomeScreen] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['app', 'src', 'src/components']));
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [homeScreenFading, setHomeScreenFading] = useState(false);
  const [homeUrlInput, setHomeUrlInput] = useState('');
  const [homeContextInput, setHomeContextInput] = useState('');
  const [activeTab, setActiveTab] = useState<'generation' | 'preview'>('preview');
  const [showStyleSelector, setShowStyleSelector] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [showLoadingBackground, setShowLoadingBackground] = useState(false);
  const [urlScreenshot, setUrlScreenshot] = useState<string | null>(null);
  const [isScreenshotLoaded, setIsScreenshotLoaded] = useState(false);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [isPreparingDesign, setIsPreparingDesign] = useState(false);
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [uploadedImages, setUploadedImages] = useState<UploadedImagePayload[]>([]);
  const [sidebarScrolled, setSidebarScrolled] = useState(false);
  const [screenshotCollapsed, setScreenshotCollapsed] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'gathering' | 'planning' | 'generating' | null>(null);
  const [isStartingNewGeneration, setIsStartingNewGeneration] = useState(false);
  const [sandboxFiles, setSandboxFiles] = useState<Record<string, string>>({});
  const [hasInitialSubmission, setHasInitialSubmission] = useState<boolean>(false);
  const [fileStructure, setFileStructure] = useState<string>('');
  const [sites, setSites] = useState<SiteSummary[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [activeSiteId, setActiveSiteId] = useState('');
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteSlug, setNewSiteSlug] = useState('');
  const [siteError, setSiteError] = useState<string | null>(null);
  const [siteActionLoading, setSiteActionLoading] = useState<'create' | 'publish' | 'unpublish' | null>(null);
  const [siteStatusMessage, setSiteStatusMessage] = useState<string | null>(null);
  
  const [conversationContext, setConversationContext] = useState<{
    scrapedWebsites: Array<{ url: string; content: any; timestamp: Date }>;
    generatedComponents: Array<{ name: string; path: string; content: string }>;
    appliedCode: Array<{ files: string[]; timestamp: Date }>;
    currentProject: string;
    lastGeneratedCode?: string;
    uploadedImages?: UploadedImagePayload[];
    lastGeneratedImages?: UploadedImagePayload[];
  }>({
    scrapedWebsites: [],
    generatedComponents: [],
    appliedCode: [],
    currentProject: '',
    lastGeneratedCode: undefined,
    uploadedImages: undefined,
    lastGeneratedImages: undefined
  });
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const codeDisplayRef = useRef<HTMLDivElement>(null);
  const saveSessionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sandboxDataRef = useRef<SandboxData | null>(null);
  const sandboxJustCreatedAt = useRef<number>(0);
  const codeApplicationInProgress = useRef<boolean>(false);

  useEffect(() => {
    sandboxDataRef.current = sandboxData;
  }, [sandboxData]);

  const fileTypeFromPath = useCallback((path: string) => {
    const fileExt = path.split('.').pop() || '';
    return fileExt === 'jsx' || fileExt === 'js' || fileExt === 'tsx' || fileExt === 'ts' ? 'javascript' :
      fileExt === 'css' ? 'css' :
      fileExt === 'json' ? 'json' :
      fileExt === 'html' ? 'html' : 'text';
  }, []);

  const filesArrayToCache = useCallback((files: Array<{ path: string; content: string }>) => {
    return files.reduce<Record<string, string>>((acc, file) => {
      if (file.path && typeof file.content === 'string') {
        acc[file.path] = file.content;
      }
      return acc;
    }, {});
  }, []);

  const filesCacheToProgressFiles = useCallback((files: Record<string, string>) => {
    return Object.entries(files).map(([path, content]) => ({
      path,
      content,
      type: fileTypeFromPath(path),
      completed: true,
    }));
  }, [fileTypeFromPath]);

  const [codeApplicationState, setCodeApplicationState] = useState<CodeApplicationState>({
    stage: null
  });

  // ── Session persistence ─────────────────────────────────────────────────
  const saveSession = useCallback(async (
    overrideSandbox?: typeof sandboxData,
    overrideMessages?: typeof chatMessages,
    overrideSiteId?: string,
  ) => {
    const sd = overrideSandbox ?? sandboxData;
    if (!sd?.sandboxId) return;

    const fileCache = sandboxFiles;

    const payload = {
      sandboxId: sd.sandboxId,
      sandboxProvider: sd.provider ?? 'vercel',
      sandboxUrl: sd.url ?? null,
      chatMessages: (overrideMessages ?? chatMessages).map(m => ({
        content: m.content,
        type: m.type,
        timestamp: m.timestamp,
      })),
      conversationCtx: conversationContext,
      fileCache,
      homeUrlInput,
      homeContextInput,
      aiModel,
      siteId: overrideSiteId ?? activeSiteId ?? null,
    };

    // Always persist to localStorage so session survives a refresh on the same device
    // Also save file contents separately so they can be restored to a fresh sandbox
    try {
      localStorage.setItem(`noeron_session_${sd.sandboxId}`, JSON.stringify(payload));
      localStorage.setItem('noeron_last_sandbox', sd.sandboxId);
      if (Object.keys(fileCache).length > 0) {
        localStorage.setItem(`noeron_files_${sd.sandboxId}`, JSON.stringify(fileCache));
      }
    } catch { /* quota exceeded — ignore */ }

    // Also persist to DB if user is logged in (for cross-device restore)
    if (!session?.user?.id) return;
    try {
      await fetch('/api/generation-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      // non-blocking — DB save failed, localStorage fallback already done
    }
  }, [sandboxData, sandboxFiles, chatMessages, conversationContext, homeUrlInput, homeContextInput, aiModel, activeSiteId, session?.user?.id]);

  const debouncedSave = useCallback((
    overrideSandbox?: typeof sandboxData,
    overrideMessages?: typeof chatMessages,
    overrideSiteId?: string,
  ) => {
    if (saveSessionTimer.current) clearTimeout(saveSessionTimer.current);
    saveSessionTimer.current = setTimeout(() => saveSession(overrideSandbox, overrideMessages, overrideSiteId), 1500);
  }, [saveSession]);
  // ────────────────────────────────────────────────────────────────────────
  
  const [generationProgress, setGenerationProgress] = useState<{
    isGenerating: boolean;
    status: string;
    components: Array<{ name: string; path: string; completed: boolean }>;
    currentComponent: number;
    streamedCode: string;
    isStreaming: boolean;
    isThinking: boolean;
    thinkingText?: string;
    thinkingDuration?: number;
    currentFile?: { path: string; content: string; type: string };
    files: Array<{ path: string; content: string; type: string; completed: boolean; edited?: boolean }>;
    lastProcessedPosition: number;
    isEdit?: boolean;
  }>({
    isGenerating: false,
    status: '',
    components: [],
    currentComponent: 0,
    streamedCode: '',
    isStreaming: false,
    isThinking: false,
    files: [],
    lastProcessedPosition: 0
  });

  // Store flag to trigger generation after component mounts
  const [shouldAutoGenerate, setShouldAutoGenerate] = useState(false);
  const activeSite = sites.find((site) => site.id === activeSiteId) || null;

  // Clear old conversation data on component mount and create/restore sandbox
  useEffect(() => {
    let isMounted = true;
    let sandboxCreated = false; // Track if sandbox was created in this effect

    const initializePage = async () => {
      // Prevent double execution in React StrictMode
      if (sandboxCreated) return;
      
      // First check URL parameters (from home page navigation)
      const urlParam = searchParams.get('url');
      const templateParam = searchParams.get('template');
      const detailsParam = searchParams.get('details');
      
      // Then check session storage as fallback
      const storedUrl = urlParam || sessionStorage.getItem('targetUrl');
      const storedStyle = templateParam || sessionStorage.getItem('selectedStyle');
      const storedModel = sessionStorage.getItem('selectedModel');
      const storedInstructions = sessionStorage.getItem('additionalInstructions');
      const uploadedImageBase64 = sessionStorage.getItem('uploadedImageBase64');
      const uploadedImageType = sessionStorage.getItem('uploadedImageType');
      const uploadedImageName = sessionStorage.getItem('uploadedImageName');

      // Store uploaded image in state if present
      if (uploadedImageBase64) {
        setUploadedImages([{
          base64: uploadedImageBase64,
          type: uploadedImageType || 'image/png',
          name: uploadedImageName || 'uploaded-image'
        }]);
      }

      if (storedUrl || uploadedImageBase64) {
        // Mark that we have an initial submission since we're loading with a URL
        setHasInitialSubmission(true);
        
        // Clear sessionStorage after reading
        sessionStorage.removeItem('targetUrl');
        sessionStorage.removeItem('selectedStyle');
        sessionStorage.removeItem('selectedModel');
        sessionStorage.removeItem('additionalInstructions');
        sessionStorage.removeItem('uploadedImageBase64');
        sessionStorage.removeItem('uploadedImageType');
        sessionStorage.removeItem('uploadedImageName');
        // Note: Don't clear siteMarkdown here, it will be cleared when used
        
        // Set the values in the component state
        if (storedUrl) {
          setHomeUrlInput(storedUrl);
        }
        setSelectedStyle(storedStyle || 'modern');
        
        // Add details to context if provided
        if (detailsParam) {
          setHomeContextInput(detailsParam);
        } else if (storedStyle && !urlParam) {
          // Only apply stored style if no screenshot URL is provided
          // This prevents unwanted style inheritance when using screenshot search
          const styleNames: Record<string, string> = {
            '1': 'Glassmorphism',
            '2': 'Neumorphism',
            '3': 'Brutalism',
            '4': 'Minimalist',
            '5': 'Dark Mode',
            '6': 'Gradient Rich',
            '7': '3D Depth',
            '8': 'Retro Wave',
            'modern': 'Modern clean and minimalist',
            'playful': 'Fun colorful and playful',
            'professional': 'Corporate professional and sleek',
            'artistic': 'Creative artistic and unique'
          };
          const styleName = styleNames[storedStyle] || storedStyle;
          let contextString = `${styleName} style design`;
          
          // Add additional instructions if provided
          if (storedInstructions) {
            contextString += `. ${storedInstructions}`;
          }
          
          setHomeContextInput(contextString);
        } else if (storedInstructions && !urlParam) {
          // Apply only instructions if no style but instructions are provided
          // and no screenshot URL is provided
          setHomeContextInput(storedInstructions);
        }
        
        if (storedModel) {
          setAiModel(storedModel);
        }
        
        // Skip the home screen and go directly to builder
        setShowHomeScreen(false);
        setHomeScreenFading(false);
        
        // Set flag to auto-trigger generation after component updates
        setShouldAutoGenerate(true);
      }
      
      // Clear old conversation
      try {
        await fetch('/api/conversation-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'clear-old' })
        });
        console.log('[home] Cleared old conversation data on mount');
      } catch (error) {
        console.error('[ai-sandbox] Failed to clear old conversation:', error);
        if (isMounted) {
          addChatMessage('Failed to clear old conversation data.', 'error');
        }
      }
      
      if (!isMounted) return;

      // Check if sandbox ID is in URL
      const sandboxIdParam = searchParams.get('sandbox');

      setLoading(true);
      try {
        if (sandboxIdParam) {
          console.log('[home] Restoring session for sandbox:', sandboxIdParam);

          // Load saved session — DB first, localStorage fallback
          let savedSession: any = null;
          try {
            const sessionRes = await fetch(`/api/generation-session/${sandboxIdParam}`);
            if (sessionRes.ok) {
              const body = await sessionRes.json();
              if (body.session) savedSession = body.session;
            }
          } catch { /* DB unavailable */ }
          if (!savedSession) {
            try {
              const raw = localStorage.getItem(`noeron_session_${sandboxIdParam}`);
              if (raw) savedSession = JSON.parse(raw);
            } catch { /* parse error */ }
          }

          // Restore non-sandbox state immediately (chat, model, site)
          if (savedSession && isMounted) {
            if (Array.isArray(savedSession.chatMessages) && savedSession.chatMessages.length > 0) {
              setChatMessages(savedSession.chatMessages.map((m: any) => ({
                ...m,
                timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
              })));
            }
            if (savedSession.siteId) setActiveSiteId(savedSession.siteId);
            if (savedSession.aiModel) setAiModel(savedSession.aiModel);
            if (savedSession.conversationCtx) {
              setConversationContext(prev => ({
                ...prev,
                ...savedSession.conversationCtx,
                lastGeneratedCode: savedSession.conversationCtx.lastGeneratedCode ?? prev.lastGeneratedCode,
              }));
            }
            const savedHomeUrl = savedSession.homeUrlInput ?? savedSession.conversationCtx?.homeUrlInput;
            const savedHomeContext = savedSession.homeContextInput ?? savedSession.conversationCtx?.homeContextInput;
            if (savedHomeUrl) setHomeUrlInput(savedHomeUrl);
            if (savedHomeContext) setHomeContextInput(savedHomeContext);

            const dbFileCache = savedSession.fileCache?.files ?? savedSession.fileCache;
            if (dbFileCache && typeof dbFileCache === 'object' && Object.keys(dbFileCache).length > 0) {
              const restoredFiles = Object.fromEntries(
                Object.entries(dbFileCache).map(([path, value]: [string, any]) => [
                  path,
                  typeof value === 'string' ? value : value?.content ?? '',
                ]).filter(([, content]) => typeof content === 'string')
              ) as Record<string, string>;

              if (Object.keys(restoredFiles).length > 0) {
                setSandboxFiles(restoredFiles);
                setGenerationProgress(prev => ({
                  ...prev,
                  files: filesCacheToProgressFiles(restoredFiles),
                }));
              }
            }
          }

          // Probe the saved sandbox URL before loading it — Vercel sandboxes expire after 15 min
          const savedUrl: string | null = savedSession?.sandboxUrl ?? null;
          let sandboxAlive = false;
          if (savedUrl) {
            try {
              const probe = await fetch(`/api/probe-url?url=${encodeURIComponent(savedUrl)}`);
              const result = await probe.json();
              sandboxAlive = Boolean(result.ok);
              if (result.needsRecreation || result.stopped) {
                console.log('[home] Saved sandbox is stopped/unreachable:', result);
              }
            } catch {
              sandboxAlive = false;
            }
          }

          if (sandboxAlive && savedUrl && savedSession) {
            sandboxJustCreatedAt.current = Date.now();
            setSandboxData({
              sandboxId: savedSession.sandboxId,
              url: savedUrl,
              provider: savedSession.sandboxProvider ?? 'vercel',
              success: true,
            } as any);
            updateStatus('Sandbox active', true);
            setShowHomeScreen(false);
            sandboxCreated = true;
            console.log('[home] Session restored (sandbox alive):', sandboxIdParam);
          } else {
            if (savedUrl) console.log('[home] Saved sandbox expired — creating fresh sandbox, chat history preserved');
            sandboxCreated = true;
            const freshSandbox = await createSandbox(true);

            // Re-apply saved files to the fresh sandbox
            if (freshSandbox?.sandboxId) {
              let savedFiles: Record<string, string> | null = null;
              try {
                const raw = localStorage.getItem(`noeron_files_${sandboxIdParam}`);
                if (raw) savedFiles = JSON.parse(raw);
              } catch { /* parse error */ }
              if (!savedFiles && savedSession?.fileCache) {
                const cachedFiles = savedSession.fileCache.files ?? savedSession.fileCache;
                savedFiles = Object.fromEntries(
                  Object.entries(cachedFiles).map(([path, value]: [string, any]) => [
                    path,
                    typeof value === 'string' ? value : value?.content ?? '',
                  ]).filter(([, content]) => typeof content === 'string')
                ) as Record<string, string>;
              }

              if (savedFiles && Object.keys(savedFiles).length > 0) {
                addChatMessage('♻️ Restoring your code files...', 'system');
                try {
                  const res = await fetch('/api/restore-files', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sandboxId: freshSandbox.sandboxId, files: savedFiles }),
                  });
                  const result = await res.json();
                  if (result.success) {
                    addChatMessage(`✅ Restored ${result.written} file${result.written === 1 ? '' : 's'}.`, 'system');
                    setSandboxFiles(savedFiles);
                    // Refresh iframe to show restored files
                    setTimeout(() => {
                      if (iframeRef.current && freshSandbox.url) {
                        iframeRef.current.src = `${freshSandbox.url}?t=${Date.now()}`;
                      }
                    }, 2000);
                  }
                } catch (restoreErr) {
                  console.warn('[home] Failed to restore files:', restoreErr);
                }
              }
            }
          }
        } else if (isStartingNewGeneration || generationProgress.isGenerating) {
          console.log('[home] Generation in progress, skipping auto sandbox creation...');
          // Don't create sandbox - the generation flow will handle it
        } else {
          console.log('[home] No sandbox in URL, creating new sandbox automatically...');
          sandboxCreated = true;
          await createSandbox(true);
        }
        
      } catch (error) {
        console.error('[ai-sandbox] Failed to create or restore sandbox:', error);
        if (isMounted) {
          addChatMessage('Failed to create or restore sandbox.', 'error');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    initializePage();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  useEffect(() => {
    if (!session?.user?.id) {
      return;
    }

    fetchSites();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!activeSiteId && sites.length > 0) {
      const firstSiteId = sites[0].id;
      setActiveSiteId(firstSiteId);

      // If sandbox already exists without siteId, update session to associate it
      if (sandboxData?.sandboxId) {
        console.log('[site auto-select] Updating existing sandbox session with siteId:', firstSiteId);
        fetch('/api/generation-session', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ siteId: firstSiteId, sandboxId: sandboxData.sandboxId }),
        })
          .then(async (res) => {
            if (res.ok) {
              const data = await res.json();
              console.log('[site auto-select] Session updated:', data);
              // Update sandboxData with the custom preview URL
              if (data.session?.siteId) {
                const selectedSite = sites.find(s => s.id === data.session.siteId);
                if (selectedSite?.subdomain) {
                  const customPreviewUrl = `https://${selectedSite.subdomain}.noeron.net`;
                  console.log('[site auto-select] Updating sandboxData previewUrl:', customPreviewUrl);
                  setSandboxData(prev => prev ? {
                    ...prev,
                    previewUrl: customPreviewUrl,
                  } : prev);
                }
              }
            }
          })
          .catch(err => console.error('[site auto-select] Failed to update session:', err));
      }
    }
  }, [activeSiteId, sites, sandboxData]);
  
  useEffect(() => {
    // Handle Escape key for home screen
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showHomeScreen) {
        setHomeScreenFading(true);
        setTimeout(() => {
          setShowHomeScreen(false);
          setHomeScreenFading(false);
        }, 500);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHomeScreen]);
  
  // Start capturing screenshot if URL is provided on mount (from home screen)
  useEffect(() => {
    if (!showHomeScreen && homeUrlInput && !urlScreenshot && !isCapturingScreenshot) {
      let screenshotUrl = homeUrlInput.trim();
      if (!screenshotUrl.match(/^https?:\/\//i)) {
        screenshotUrl = 'https://' + screenshotUrl;
      }
      captureUrlScreenshot(screenshotUrl);
    }
  }, [showHomeScreen, homeUrlInput]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-start generation if flagged
  useEffect(() => {
    const autoStart = sessionStorage.getItem('autoStart');
    if (autoStart === 'true' && !showHomeScreen && homeUrlInput) {
      sessionStorage.removeItem('autoStart');
      // Small delay to ensure everything is ready
      setTimeout(() => {
        console.log('[generation] Auto-starting generation for URL:', homeUrlInput);
        startGeneration({ url: homeUrlInput, context: homeContextInput, model: aiModel });
      }, 1000);
    }
  }, [showHomeScreen, homeUrlInput]); // eslint-disable-line react-hooks/exhaustive-deps


  useEffect(() => {
    // Only check sandbox status on mount if we don't already have sandboxData
    // AND we're not auto-starting a new generation (which would create a new sandbox)
    const autoStart = sessionStorage.getItem('autoStart');
    if (!sandboxData && autoStart !== 'true') {
      checkSandboxStatus();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
    // Auto-save session whenever chat changes (debounced)
    if (sandboxData?.sandboxId) {
      debouncedSave(sandboxData, chatMessages, activeSiteId);
    }
  }, [chatMessages]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (sandboxData?.sandboxId) {
      debouncedSave(sandboxData, chatMessages, activeSiteId);
    }
  }, [sandboxFiles, generationProgress.files, conversationContext.lastGeneratedCode, homeUrlInput, homeContextInput]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-trigger generation when flag is set (from home page navigation)
  useEffect(() => {
    if (shouldAutoGenerate && homeUrlInput && !showHomeScreen) {
      // Reset the flag
      setShouldAutoGenerate(false);

      // Trigger generation after a short delay to ensure everything is set up
      const timer = setTimeout(() => {
        console.log('[generation] Auto-triggering generation from URL params');
        startGeneration({ url: homeUrlInput, context: homeContextInput, model: aiModel });
      }, 1000);

      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoGenerate, homeUrlInput, showHomeScreen]);

  // Periodic health check to detect sandbox timeout early
  useEffect(() => {
    // Only run health check if we have an active sandbox
    if (!sandboxData?.url) return;

    console.log('[health-check] Starting periodic sandbox health check');

    const initialCheckId = setTimeout(() => {
      // Skip health check if code application is in progress or generation is active
      if (!generationProgress.isGenerating && !codeApplicationInProgress.current) {
        checkSandboxStatus(true);
      } else {
        console.log('[health-check] Skipping initial health check - generation or code application in progress');
      }
    }, 750);

    // Check every 30 seconds
    const intervalId = setInterval(() => {
      // Only check if we're not currently generating code or applying code
      if (!generationProgress.isGenerating && !codeApplicationInProgress.current) {
        console.log('[health-check] Running periodic health check...');
        checkSandboxStatus(true); // autoRecreate = true
      } else {
        console.log('[health-check] Skipping health check - generation or code application in progress');
      }
    }, 30000); // 30 seconds

    return () => {
      console.log('[health-check] Stopping periodic health check');
      clearTimeout(initialCheckId);
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandboxData?.url, generationProgress.isGenerating]);

  // Keep the sandbox alive for as long as the builder page is open, even if
  // the user is idle or the tab is in the background. Each ping extends the
  // sandbox lifetime by the keep-alive interval, so the sandbox only expires
  // after the page is closed (or the Vercel plan's maximum duration is hit).
  useEffect(() => {
    if (!sandboxData?.sandboxId) return;

    const intervalMs = appConfig.vercelSandbox.keepAliveIntervalMs;
    const extendSandbox = () => {
      fetch('/api/extend-sandbox-timeout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sandboxId: sandboxData.sandboxId }),
      })
        .then(res => res.json())
        .then(data => {
          if (!data.extended) {
            console.log('[keep-alive] Sandbox lifetime not extended:', data.message || data.error);
          }
        })
        .catch(() => {
          // Best-effort; the periodic health check handles a dead sandbox
        });
    };

    extendSandbox();
    const intervalId = setInterval(extendSandbox, intervalMs);

    return () => clearInterval(intervalId);
  }, [sandboxData?.sandboxId]);

  const updateStatus = (text: string, active: boolean) => {
    setStatus({ text, active });
  };

  const getRestorableFiles = () => {
    if (Object.keys(sandboxFiles).length > 0) {
      return sandboxFiles;
    }

    const generatedFiles = filesArrayToCache(generationProgress.files);
    if (Object.keys(generatedFiles).length > 0) {
      return generatedFiles;
    }

    return null;
  };

  const restoreFilesToSandbox = async (targetSandbox: SandboxData, files: Record<string, string>) => {
    if (!targetSandbox?.sandboxId || Object.keys(files).length === 0) return false;

    const res = await fetch('/api/restore-files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sandboxId: targetSandbox.sandboxId, files }),
    });
    const result = await res.json();
    if (!res.ok || !result.success) {
      throw new Error(result.error || 'Failed to restore files');
    }

    setSandboxFiles(files);
    return true;
  };

  const recoverStoppedSandbox = async (reason = 'The preview sandbox stopped.') => {
    const filesToRestore = getRestorableFiles();

    addChatMessage(`${reason} Creating a fresh sandbox and restoring your files...`, 'system');
    setSandboxData(null);
    updateStatus('Recreating sandbox...', false);

    if (iframeRef.current) {
      iframeRef.current.src = '';
    }

    const newSandbox = await createSandbox(true);
    if (!newSandbox) return null;

    if (filesToRestore && Object.keys(filesToRestore).length > 0) {
      try {
        await restoreFilesToSandbox(newSandbox, filesToRestore);
        addChatMessage('Restored your files into the fresh sandbox.', 'system');

        // Persist the new sandbox session with restored files so refresh can restore the Code tab.
        setGenerationProgress(prev => ({
          ...prev,
          files: filesCacheToProgressFiles(filesToRestore),
        }));
        debouncedSave(newSandbox, chatMessages, activeSiteId);

        setTimeout(() => {
          if (iframeRef.current && newSandbox.url) {
            iframeRef.current.src = `${newSandbox.url}?t=${Date.now()}&restored=true`;
          }
        }, appConfig.codeApplication.defaultRefreshDelay);
      } catch (error: any) {
        addChatMessage(`Fresh sandbox created, but file restore failed: ${error.message}`, 'system');
      }
    }

    return newSandbox;
  };

  const refreshSandboxPreview = async (targetSandbox: SandboxData | null | undefined = sandboxData, reason = 'The preview sandbox stopped.') => {
    if (!targetSandbox?.url) return;

    try {
      const probe = await fetch(`/api/probe-url?url=${encodeURIComponent(targetSandbox.url)}`);
      const result = await probe.json();
      if (result.needsRecreation || result.stopped) {
        await recoverStoppedSandbox(reason);
        return;
      }
    } catch {
      // If the probe itself fails, fall back to the normal health check path.
      checkSandboxStatus(true);
      return;
    }

    if (iframeRef.current) {
      iframeRef.current.src = `${targetSandbox.url}?t=${Date.now()}&manual=true`;
    }
  };


  const log = (message: string, type: 'info' | 'error' | 'command' = 'info') => {
    setResponseArea(prev => [...prev, `[${type}] ${message}`]);
  };

  const addChatMessage = (content: string, type: ChatMessage['type'], metadata?: ChatMessage['metadata']) => {
    setChatMessages(prev => {
      // Skip duplicate consecutive system messages
      if (type === 'system' && prev.length > 0) {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage.type === 'system' && lastMessage.content === content) {
          return prev; // Skip duplicate
        }
      }
      return [...prev, { content, type, timestamp: new Date(), metadata }];
    });
  };
  
  const checkAndInstallPackages = async () => {
    // This function is only called when user explicitly requests it
    // Don't show error if no sandbox - it's likely being created
    if (!sandboxData) {
      console.log('[checkAndInstallPackages] No sandbox data available yet');
      return;
    }
    
    // Vite error checking removed - handled by template setup
    addChatMessage('Checking packages... Sandbox is ready with Vite configuration.', 'system');
  };
  
  const handleSurfaceError = (_errors: any[]) => {
    // Function kept for compatibility but Vite errors are now handled by template
    
    // Focus the input
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
      textarea.focus();
    }
  };
  
  const installPackages = async (packages: string[]) => {
    if (!sandboxData) {
      addChatMessage('No active sandbox. Create a sandbox first!', 'system');
      return;
    }
    
    try {
      const response = await fetch('/api/install-packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packages, sandboxId: sandboxData.sandboxId })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to install packages: ${response.statusText}`);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'command':
                  // Don't show npm install commands - they're handled by info messages
                  if (!data.command.includes('npm install')) {
                    addChatMessage(data.command, 'command', { commandType: 'input' });
                  }
                  break;
                case 'output':
                  addChatMessage(data.message, 'command', { commandType: 'output' });
                  break;
                case 'error':
                  if (data.message && data.message !== 'undefined') {
                    addChatMessage(data.message, 'command', { commandType: 'error' });
                  }
                  break;
                case 'warning':
                  addChatMessage(data.message, 'command', { commandType: 'output' });
                  break;
                case 'success':
                  addChatMessage(`${data.message}`, 'system');
                  break;
                case 'status':
                  addChatMessage(data.message, 'system');
                  break;
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (error: any) {
      addChatMessage(`Failed to install packages: ${error.message}`, 'system');
    }
  };

  const checkSandboxStatus = async (autoRecreate = true) => {
    if (!sandboxData?.sandboxId) {
      return;
    }

    if (sandboxCreationRef.current || codeApplicationInProgress.current || generationProgress.isGenerating || isStartingNewGeneration) {
      console.log('[checkSandboxStatus] Skipping status check while sandbox operation is in progress');
      return;
    }

    try {
      // Use checkHealth=true to get actual health status including 502 detection
      const response = await fetch(`/api/sandbox-status?checkHealth=true&sandboxId=${encodeURIComponent(sandboxData.sandboxId)}`);
      const data = await response.json();

      if (data.needsRecreation && autoRecreate) {
        // Safety check: don't recreate if code application or generation is in progress
        if (codeApplicationInProgress.current) {
          console.log('[checkSandboxStatus] Sandbox needs recreation but code application is in progress, skipping recreation');
          return;
        }
        if (generationProgress.isGenerating || isStartingNewGeneration) {
          console.log('[checkSandboxStatus] Sandbox needs recreation but generation is in progress, skipping recreation');
          return;
        }
        console.log('[checkSandboxStatus] Sandbox needs recreation, auto-recreating...');
        if (
          data.healthDetails?.statusCode !== 410 &&
          Date.now() - sandboxJustCreatedAt.current < 60_000
        ) {
          console.log('[checkSandboxStatus] Sandbox is still warming up, skipping recreation');
          return;
        }
        const reason = data.healthDetails?.statusCode === 410
          ? 'The Vercel sandbox session stopped.'
          : 'The sandbox preview is no longer responding.';
        await recoverStoppedSandbox(reason);
        return;
      }

      if (data.active && data.healthy && data.sandboxData) {
        console.log('[checkSandboxStatus] Setting sandboxData from API:', data.sandboxData);
        // Merge with existing sandboxData to preserve previewUrl
        setSandboxData(prev => ({
          ...(prev || {}),
          ...data.sandboxData,
          // Keep previewUrl if it exists in current data and API doesn't return one
          previewUrl: data.sandboxData.previewUrl || (prev?.previewUrl),
        }));
        updateStatus('Sandbox active', true);
      } else if (data.active && !data.healthy) {
        // Sandbox exists but not responding
        updateStatus('Sandbox not responding', false);
        // Keep existing sandboxData if we have it - don't clear it
      } else {
        // Only clear sandboxData if we don't already have it or if we're explicitly checking from a fresh state
        // This prevents clearing sandboxData during normal operation when it should persist
        if (!sandboxData) {
          console.log('[checkSandboxStatus] No existing sandboxData, clearing state');
          setSandboxData(null);
          updateStatus('No sandbox', false);
        } else {
          // Keep existing sandboxData and just update status
          console.log('[checkSandboxStatus] Keeping existing sandboxData, sandbox inactive but data preserved');
          updateStatus('Sandbox status unknown', false);
        }
      }
    } catch (error) {
      console.error('Failed to check sandbox status:', error);
      // Only clear on error if we don't have existing sandboxData
      if (!sandboxData) {
        setSandboxData(null);
        updateStatus('Error', false);
      } else {
        updateStatus('Status check failed', false);
      }
    }
  };

  const sandboxCreationRef = useRef<boolean>(false);
  
  const createSandbox = async (fromHomeScreen = false) => {
    // Prevent duplicate sandbox creation
    if (sandboxCreationRef.current) {
      console.log('[createSandbox] Sandbox creation already in progress, skipping...');
      return null;
    }
    
    sandboxCreationRef.current = true;
    console.log('[createSandbox] Starting sandbox creation...');
    setLoading(true);
    setShowLoadingBackground(true);
    updateStatus('Creating sandbox...', false);
    setResponseArea([]);
    setScreenshotError(null);
    
    try {
      console.log('[createSandbox] Creating sandbox with siteId:', activeSiteId);
      const response = await fetch('/api/create-ai-sandbox-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: activeSiteId })
      });
      
      const data = await response.json();
      console.log('[createSandbox] Response data:', data);
      
      if (data.success) {
        sandboxCreationRef.current = false; // Reset the ref on success
        console.log('[createSandbox] Setting sandboxData from creation:', data);
        // Merge with existing sandboxData to preserve previewUrl
        setSandboxData(prev => {
          const nextSandboxData = {
            ...data,
            // Keep previewUrl if it exists in current data and new data doesn't have one
            // or if new data's previewUrl is the same as url (not a custom domain)
            previewUrl: (data.previewUrl && data.previewUrl !== data.url)
              ? data.previewUrl
              : (prev?.sandboxId === data.sandboxId ? (prev?.previewUrl || data.previewUrl) : data.previewUrl),
          };
          sandboxDataRef.current = nextSandboxData;
          return nextSandboxData;
        });
        updateStatus('Sandbox active', true);
        log('Sandbox created successfully!');
        log(`Sandbox ID: ${data.sandboxId}`);
        log(`URL: ${data.url}`);

        // Persist session to DB so it can be resumed on any device
        debouncedSave(data, chatMessages, activeSiteId);
        
        // Update URL with sandbox ID
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set('sandbox', data.sandboxId);
        newParams.set('model', aiModel);
        router.push(`/generation?${newParams.toString()}`, { scroll: false });
        
        // Fade out loading background after sandbox loads
        setTimeout(() => {
          setShowLoadingBackground(false);
        }, 3000);
        
        if (data.structure) {
          displayStructure(data.structure);
        }
        
        // Fetch sandbox files after creation
        setTimeout(fetchSandboxFiles, 1000);
        
        // For Vercel sandboxes, Vite is already started during setupViteApp
        // No need to restart it immediately after creation
        // Only restart if there's an actual issue later
        console.log('[createSandbox] Sandbox ready with Vite server running');
        
        // Only add welcome message if not coming from home screen
        if (!fromHomeScreen) {
          addChatMessage(`Sandbox created! ID: ${data.sandboxId}. I now have context of your sandbox and can help you build your app. Just ask me to create components and I'll automatically apply them!

Tip: I automatically detect and install npm packages from your code imports (like react-router-dom, axios, etc.)`, 'system');
        }
        
        // Mark sandbox as just created so onError retries instead of triggering recreation
        sandboxJustCreatedAt.current = Date.now();

        // Poll via server-side probe (client no-cors can't see status codes like 410)
        // Wait until the sandbox URL returns HTTP 2xx/3xx before loading the iframe
        (async () => {
          const deadline = Date.now() + 60_000; // 60s max wait
          while (Date.now() < deadline) {
            try {
              const probe = await fetch(`/api/probe-url?url=${encodeURIComponent(data.url)}`);
              const result = await probe.json();
              if (result.ok) break; // HTTP 2xx/3xx — Vite is up
            } catch { /* ignore, retry */ }
            await new Promise(r => setTimeout(r, 2000));
          }
          if (iframeRef.current) {
            iframeRef.current.src = `${data.url}?t=${Date.now()}`;
          }
        })();

        // Return the sandbox data so it can be used immediately
        return data;
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error: any) {
      console.error('[createSandbox] Error:', error);
      updateStatus('Error', false);
      log(`Failed to create sandbox: ${error.message}`, 'error');
      addChatMessage(`Failed to create sandbox: ${error.message}`, 'system');
      throw error;
    } finally {
      setLoading(false);
      sandboxCreationRef.current = false; // Reset the ref
    }
  };

  const displayStructure = (structure: any) => {
    if (typeof structure === 'object') {
      setStructureContent(JSON.stringify(structure, null, 2));
    } else {
      setStructureContent(structure || 'No structure available');
    }
  };

  const applyGeneratedCode = async (code: string, isEdit: boolean = false, overrideSandboxData?: SandboxData, images?: UploadedImagePayload[]) => {
    console.log('[applyGeneratedCode] STARTED:', {
      codeLength: code?.length || 0,
      isEdit,
      hasOverrideSandboxData: !!overrideSandboxData,
      currentSandboxDataId: sandboxData?.sandboxId,
      uploadedImageCount: images?.length || 0
    });
    setLoading(true);
    codeApplicationInProgress.current = true; // Prevent health check from recreating sandbox
    log('Applying AI-generated code...');
    
    try {
      // Show progress component instead of individual messages
      setCodeApplicationState({ stage: 'analyzing' });
      
      // Get pending packages from tool calls
      const pendingPackages = ((window as any).pendingPackages || []).filter((pkg: any) => pkg && typeof pkg === 'string');
      if (pendingPackages.length > 0) {
        console.log('[applyGeneratedCode] Sending packages from tool calls:', pendingPackages);
        // Clear pending packages after use
        (window as any).pendingPackages = [];
      }
      
      // Use streaming endpoint for real-time feedback
      const effectiveSandboxData = overrideSandboxData || sandboxData;
      console.log('[applyGeneratedCode] Fetching /api/apply-ai-code-stream:', {
        hasCode: !!code,
        codeLength: code?.length,
        isEdit,
        sandboxId: effectiveSandboxData?.sandboxId,
        hasPendingPackages: pendingPackages.length > 0,
        uploadedImageCount: images?.length || 0
      });
      const response = await fetch('/api/apply-ai-code-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: code,
          isEdit: isEdit,
          packages: pendingPackages,
          sandboxId: effectiveSandboxData?.sandboxId, // Pass the sandbox ID to ensure proper connection
          uploadedImages: images && images.length > 0 ? images : undefined
        })
      });
      console.log('[applyGeneratedCode] Fetch response status:', response.status, response.ok);
      
      if (!response.ok) {
        throw new Error(`Failed to apply code: ${response.statusText}`);
      }
      
      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let finalData: any = null;
      
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              switch (data.type) {
                case 'start':
                  // Don't add as chat message, just update state
                  setCodeApplicationState({ stage: 'analyzing' });
                  break;
                  
                case 'step':
                  // Update progress state based on step
                  if (data.message.includes('Installing') && data.packages) {
                    setCodeApplicationState({ 
                      stage: 'installing', 
                      packages: data.packages 
                    });
                  } else if (data.message.includes('Creating files') || data.message.includes('Applying')) {
                    setCodeApplicationState({ 
                      stage: 'applying',
                      filesGenerated: [] // Files will be populated when complete
                    });
                  }
                  break;
                  
                case 'package-progress':
                  // Handle package installation progress
                  if (data.installedPackages) {
                    setCodeApplicationState(prev => ({ 
                      ...prev,
                      installedPackages: data.installedPackages 
                    }));
                  }
                  break;
                  
                case 'command':
                  // Don't show npm install commands - they're handled by info messages
                  if (data.command && !data.command.includes('npm install')) {
                    addChatMessage(data.command, 'command', { commandType: 'input' });
                  }
                  break;
                  
                case 'success':
                  if (data.installedPackages) {
                    setCodeApplicationState(prev => ({ 
                      ...prev,
                      installedPackages: data.installedPackages 
                    }));
                  }
                  break;
                  
                case 'file-progress':
                  // Skip file progress messages, they're noisy
                  break;
                  
                case 'file-complete':
                  // Could add individual file completion messages if desired
                  break;
                  
                case 'command-progress':
                  addChatMessage(`${data.action} command: ${data.command}`, 'command', { commandType: 'input' });
                  break;
                  
                case 'command-output':
                  addChatMessage(data.output, 'command', { 
                    commandType: data.stream === 'stderr' ? 'error' : 'output' 
                  });
                  break;
                  
                case 'command-complete':
                  if (data.success) {
                    addChatMessage(`Command completed successfully`, 'system');
                  } else {
                    addChatMessage(`Command failed with exit code ${data.exitCode}`, 'system');
                  }
                  break;
                  
                case 'complete':
                  finalData = data;
                  setCodeApplicationState({ stage: 'complete' });
                  // Clear the state after a delay
                  setTimeout(() => {
                    setCodeApplicationState({ stage: null });
                  }, 3000);
                  // Reset loading state when complete
                  setLoading(false);
                  break;
                  
                case 'error':
                  addChatMessage(`Error: ${data.message || data.error || 'Unknown error'}`, 'system');
                  // Reset loading state on error
                  setLoading(false);
                  break;
                  
                case 'warning':
                  addChatMessage(`${data.message}`, 'system');
                  break;
                  
                case 'info':
                  // Show info messages, especially for package installation
                  if (data.message) {
                    addChatMessage(data.message, 'system');
                  }
                  break;
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
      
      // Process final data
      if (finalData && finalData.type === 'complete') {
        const data: any = {
          success: finalData.success !== false,
          results: finalData.results,
          explanation: finalData.explanation,
          structure: finalData.structure,
          message: finalData.message,
          autoCompleted: finalData.autoCompleted,
          autoCompletedComponents: finalData.autoCompletedComponents,
          warning: finalData.warning,
          missingImports: finalData.missingImports,
          debug: finalData.debug
        };
        
        if (data.success) {
          const { results } = data;

          // Update sandbox data if backend sent new sandbox info (e.g., when new sandbox was created)
          if (finalData.sandbox?.sandboxId && finalData.sandbox?.url) {
            console.log('[applyGeneratedCode] Updating sandbox data from response:', finalData.sandbox);
            setSandboxData(prev => ({
              ...prev,
              sandboxId: finalData.sandbox.sandboxId,
              url: finalData.sandbox.url
            }));
          }

        // Log package installation results without duplicate messages
        if (results.packagesInstalled?.length > 0) {
          log(`Packages installed: ${results.packagesInstalled.join(', ')}`);
        }
        
        if (results.filesCreated?.length > 0) {
          log('Files created:');
          results.filesCreated.forEach((file: string) => {
            log(`  ${file}`, 'command');
          });
          
          // Verify files were actually created by refreshing the sandbox if needed
          if (sandboxData?.sandboxId && results.filesCreated.length > 0) {
            // Small delay to ensure files are written
            setTimeout(() => {
              // Force refresh the iframe to show new files
              if (iframeRef.current) {
                iframeRef.current.src = iframeRef.current.src;
              }
            }, 1000);
          }
        }
        
        if (results.filesUpdated?.length > 0) {
          log('Files updated:');
          results.filesUpdated.forEach((file: string) => {
            log(`  ${file}`, 'command');
          });
        }
        
        // Update conversation context with applied code
        setConversationContext(prev => ({
          ...prev,
          appliedCode: [...prev.appliedCode, {
            files: [...(results.filesCreated || []), ...(results.filesUpdated || [])],
            timestamp: new Date()
          }]
        }));
        
        if (results.commandsExecuted?.length > 0) {
          log('Commands executed:');
          results.commandsExecuted.forEach((cmd: string) => {
            log(`  $ ${cmd}`, 'command');
          });
        }
        
        if (results.errors?.length > 0) {
          results.errors.forEach((err: string) => {
            log(err, 'error');
          });
        }
        
        if (data.structure) {
          displayStructure(data.structure);
        }
        
        if (data.explanation) {
          log(data.explanation);
        }
        
        if (data.autoCompleted) {
          log('Auto-generating missing components...', 'command');
          
          if (data.autoCompletedComponents) {
            setTimeout(() => {
              log('Auto-generated missing components:', 'info');
              data.autoCompletedComponents.forEach((comp: string) => {
                log(`  ${comp}`, 'command');
              });
            }, 1000);
          }
        } else if (data.warning) {
          log(data.warning, 'error');
          
          if (data.missingImports && data.missingImports.length > 0) {
            const missingList = data.missingImports.join(', ');
            addChatMessage(
              `Ask me to "create the missing components: ${missingList}" to fix these import errors.`,
              'system'
            );
          }
        }
        
        log('Code applied successfully!');
        console.log('[applyGeneratedCode] Response data:', data);
        console.log('[applyGeneratedCode] Debug info:', data.debug);
        console.log('[applyGeneratedCode] Current sandboxData:', sandboxData);
        console.log('[applyGeneratedCode] Current iframe element:', iframeRef.current);
        console.log('[applyGeneratedCode] Current iframe src:', iframeRef.current?.src);
        
        // Set applying code state for edits to show loading overlay
        // Removed overlay - changes apply directly
        
        const changedFiles = [...(results.filesCreated || []), ...(results.filesUpdated || [])];

        if (changedFiles.length > 0) {
          setConversationContext(prev => ({
            ...prev,
            appliedCode: [...prev.appliedCode, {
              files: changedFiles,
              timestamp: new Date()
            }],
            uploadedImages: undefined,
            lastGeneratedImages: images && images.length > 0 ? images : prev.lastGeneratedImages
          }));
          
          // Update the chat message to show success
          // Only show file list if not in edit mode
          if (isEdit) {
            addChatMessage(`Edit applied successfully!`, 'system');
          } else {
            // Check if this is part of a generation flow (has recent AI recreation message)
            const recentMessages = chatMessages.slice(-5);
            const isPartOfGeneration = recentMessages.some(m => 
              m.content.includes('AI recreation generated') || 
              m.content.includes('Code generated')
            );
            
            // Don't show files if part of generation flow to avoid duplication
            if (isPartOfGeneration) {
              addChatMessage(`Applied ${changedFiles.length} files successfully!`, 'system');
            } else {
              addChatMessage(`Applied ${changedFiles.length} files successfully!`, 'system', {
                appliedFiles: changedFiles
              });
            }
          }
          
          // If there are failed packages, add a message about checking for errors
          if (results.packagesFailed?.length > 0) {
            addChatMessage(`⚠️ Some packages failed to install. Check the error banner above for details.`, 'system');
          }
          
          // Fetch updated file structure
          await fetchSandboxFiles();
          
          // Skip automatic package check - it's not needed here and can cause false "no sandbox" messages
          // Packages are already installed during the apply-ai-code-stream process
          
          // Test build to ensure everything compiles correctly
          // Skip build test for now - it's causing errors with undefined activeSandbox
          // The build test was trying to access global.activeSandbox from the frontend,
          // but that's only available in the backend API routes
          console.log('[build-test] Skipping build test - would need API endpoint');
          
          // Force iframe refresh after applying code
          const refreshDelay = appConfig.codeApplication.defaultRefreshDelay; // Allow Vite to process changes
          
          setTimeout(() => {
            const currentSandboxData = effectiveSandboxData;
            void refreshSandboxPreview(currentSandboxData, 'The preview sandbox stopped before it could refresh.');
          }, refreshDelay);
          
          // Vite error checking removed - handled by template setup
        }
        
          // Give Vite HMR a moment to detect changes, then ensure refresh
          const currentSandboxData = effectiveSandboxData;
          if (iframeRef.current && currentSandboxData?.url) {
            // Wait for Vite to process the file changes
            // If packages were installed, wait longer for Vite to restart
            const packagesInstalled = results?.packagesInstalled?.length > 0 || data.results?.packagesInstalled?.length > 0;
            const refreshDelay = packagesInstalled ? appConfig.codeApplication.packageInstallRefreshDelay : appConfig.codeApplication.defaultRefreshDelay;
            console.log(`[applyGeneratedCode] Packages installed: ${packagesInstalled}, refresh delay: ${refreshDelay}ms`);
            
            setTimeout(() => {
              void refreshSandboxPreview(currentSandboxData, 'The preview sandbox stopped before it could refresh.');
            }, refreshDelay); // Dynamic delay based on whether packages were installed
        }
        
        } else {
          const firstError = finalData?.results?.errors?.[0];
          throw new Error(firstError || finalData?.message || finalData?.error || 'Failed to apply code');
        }
      } else {
        // If no final data was received, still close loading
        addChatMessage('Code application may have partially succeeded. Check the preview.', 'system');
      }
    } catch (error: any) {
      log(`Failed to apply code: ${error.message}`, 'error');
    } finally {
      setLoading(false);
      codeApplicationInProgress.current = false; // Allow health check to run again
      // Clear isEdit flag after applying code
      setGenerationProgress(prev => ({
        ...prev,
        isEdit: false
      }));
    }
  };

  const fetchSandboxFiles = async () => {
    if (!sandboxData) return null;
    
    try {
      const response = await fetch(`/api/get-sandbox-files?sandboxId=${encodeURIComponent(sandboxData.sandboxId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSandboxFiles(data.files || {});
          setFileStructure(data.structure || '');
          console.log('[fetchSandboxFiles] Updated file list:', Object.keys(data.files || {}).length, 'files');
          return data.files || {};
        }
      }
    } catch (error) {
      console.error('[fetchSandboxFiles] Error fetching files:', error);
    }
    return null;
  };

  const fetchSites = async () => {
    try {
      setSitesLoading(true);
      const response = await fetch('/api/sites');
      const data = await response.json();
      if (response.ok) {
        setSites(data.sites || []);
      }
    } catch (error) {
      console.error('Failed to fetch sites:', error);
    } finally {
      setSitesLoading(false);
    }
  };

  const createSite = async () => {
    setSiteError(null);
    setSiteStatusMessage(null);

    try {
      setSiteActionLoading('create');
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
      setActiveSiteId(data.site.id);
      setSiteStatusMessage(`Created ${data.site.name}. Publish your current build when you are ready.`);
    } catch (error: any) {
      setSiteError(error.message);
    } finally {
      setSiteActionLoading(null);
    }
  };

  const publishActiveSite = async () => {
    if (!activeSiteId || !sandboxData?.sandboxId) {
      setSiteError('Create a site and generate a build before publishing.');
      return;
    }

    setSiteError(null);
    setSiteStatusMessage(null);

    try {
      setSiteActionLoading('publish');
      const response = await fetch(`/api/sites/${activeSiteId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sandboxId: sandboxData.sandboxId }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish site');
      }

      setSites((prev) => prev.map((site) => (site.id === data.site.id ? data.site : site)));
      setSiteStatusMessage(`Published ${data.site.name} at ${data.site.liveUrl}`);
    } catch (error: any) {
      setSiteError(error.message);
    } finally {
      setSiteActionLoading(null);
    }
  };

  const unpublishActiveSite = async () => {
    if (!activeSiteId) {
      return;
    }

    setSiteError(null);
    setSiteStatusMessage(null);

    try {
      setSiteActionLoading('unpublish');
      const response = await fetch(`/api/sites/${activeSiteId}/unpublish`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unpublish site');
      }

      setSites((prev) => prev.map((site) => (site.id === data.site.id ? data.site : site)));
      setSiteStatusMessage(`Unpublished ${data.site.name}. The public URL now returns 404.`);
    } catch (error: any) {
      setSiteError(error.message);
    } finally {
      setSiteActionLoading(null);
    }
  };

  const copyLiveUrl = async () => {
    if (!activeSite?.liveUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(activeSite.liveUrl);
      setSiteStatusMessage(`Copied ${activeSite.liveUrl}`);
    } catch {
      setSiteError('Failed to copy URL');
    }
  };
  
//   const restartViteServer = async () => {
//     try {
//       addChatMessage('Restarting Vite dev server...', 'system');
//       
//       const response = await fetch('/api/restart-vite', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' }
//       });
//       
//       if (response.ok) {
//         const data = await response.json();
//         if (data.success) {
//           addChatMessage('✓ Vite dev server restarted successfully!', 'system');
//           
//           // Refresh the iframe after a short delay
//           setTimeout(() => {
//             if (iframeRef.current && sandboxData?.url) {
//               iframeRef.current.src = `${sandboxData.url}?t=${Date.now()}`;
//             }
//           }, 2000);
//         } else {
//           addChatMessage(`Failed to restart Vite: ${data.error}`, 'error');
//         }
//       } else {
//         addChatMessage('Failed to restart Vite server', 'error');
//       }
//     } catch (error) {
//       console.error('[restartViteServer] Error:', error);
//       addChatMessage(`Error restarting Vite: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
//     }
//   };

//   const applyCode = async () => {
//     const code = promptInput.trim();
//     if (!code) {
//       log('Please enter some code first', 'error');
//       addChatMessage('No code to apply. Please generate code first.', 'system');
//       return;
//     }
//     
//     // Prevent double clicks
//     if (loading) {
//       console.log('[applyCode] Already loading, skipping...');
//       return;
//     }
//     
//     // Determine if this is an edit based on whether we have applied code before
//     const isEdit = conversationContext.appliedCode.length > 0;
//     await applyGeneratedCode(code, isEdit);
//   };

  const renderMainContent = () => {
    if (activeTab === 'generation' && (generationProgress.isGenerating || generationProgress.files.length > 0)) {
      return (
        /* Generation Tab Content */
        <div className="absolute inset-0 flex overflow-hidden">
          {/* File Explorer - Hide during edits */}

            {/* File Explorer - Hide during edits */}
            {!generationProgress.isEdit && (
              <div className="w-[250px] border-r border-border-muted bg-warm-025 flex flex-col flex-shrink-0">
                <div className="p-4 bg-warm-100 text-warm-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BsFolderFill style={{ width: '16px', height: '16px' }} className="text-warm-600" />
                    <span className="text-sm font-medium">Explorer</span>
                  </div>
                </div>

                {/* File Tree */}
                <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
                  <div className="text-sm">
                    {/* Root app folder */}
                    <div
                      className="flex items-center gap-2 py-0.5 px-3 hover:bg-warm-800/5 rounded cursor-pointer text-warm-600"
                      onClick={() => toggleFolder('app')}
                    >
                      {expandedFolders.has('app') ? (
                        <FiChevronDown style={{ width: '16px', height: '16px' }} className="text-warm-500" />
                      ) : (
                        <FiChevronRight style={{ width: '16px', height: '16px' }} className="text-warm-500" />
                      )}
                      {expandedFolders.has('app') ? (
                        <BsFolder2Open style={{ width: '16px', height: '16px' }} className="text-warm-600" />
                      ) : (
                        <BsFolderFill style={{ width: '16px', height: '16px' }} className="text-warm-600" />
                      )}
                      <span className="font-medium text-warm-800">app</span>
                    </div>

                    {expandedFolders.has('app') && (
                      <div className="ml-6">
                        {/* Group files by directory */}
                        {(() => {
                          const fileTree: { [key: string]: Array<{ name: string; edited?: boolean }> } = {};

                          // Process all files from generation progress
                          generationProgress.files.forEach(file => {
                            const parts = file.path.split('/');
                            const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
                            const fileName = parts[parts.length - 1];

                            if (!fileTree[dir]) fileTree[dir] = [];
                            fileTree[dir].push({
                              name: fileName,
                              edited: file.edited || false
                            });
                          });

                          return Object.entries(fileTree).map(([dir, files]) => (
                            <div key={dir} className="mb-1">
                              {dir && (
                                <div
                                  className="flex items-center gap-2 py-0.5 px-3 hover:bg-warm-800/5 rounded cursor-pointer text-warm-600"
                                  onClick={() => toggleFolder(dir)}
                                >
                                  {expandedFolders.has(dir) ? (
                                    <FiChevronDown style={{ width: '16px', height: '16px' }} className="text-warm-500" />
                                  ) : (
                                    <FiChevronRight style={{ width: '16px', height: '16px' }} className="text-warm-500" />
                                  )}
                                  {expandedFolders.has(dir) ? (
                                    <BsFolder2Open style={{ width: '16px', height: '16px' }} className="text-warm-600" />
                                  ) : (
                                    <BsFolderFill style={{ width: '16px', height: '16px' }} className="text-warm-600" />
                                  )}
                                  <span className="text-warm-600">{dir.split('/').pop()}</span>
                                </div>
                              )}
                              {(!dir || expandedFolders.has(dir)) && (
                                <div className={dir ? 'ml-8' : ''}>
                                  {files.sort((a, b) => a.name.localeCompare(b.name)).map(fileInfo => {
                                    const fullPath = dir ? `${dir}/${fileInfo.name}` : fileInfo.name;
                                    const isSelected = selectedFile === fullPath;

                                    return (
                                      <div
                                        key={fullPath}
                                        className={`flex items-center gap-2 py-0.5 px-3 rounded cursor-pointer transition-all ${
                                          isSelected
                                            ? 'bg-warm-800 text-warm-100'
                                            : 'text-warm-600 hover:bg-warm-800/5'
                                        }`}
                                        onClick={() => handleFileClick(fullPath)}
                                      >
                                        {getFileIcon(fileInfo.name)}
                                        <span className={`text-xs flex items-center gap-1 ${isSelected ? 'font-medium' : ''}`}>
                                          {fileInfo.name}
                                          {fileInfo.edited && (
                                            <span className={`text-[10px] px-1 rounded ${
                                              isSelected ? 'bg-warm-100 text-warm-800' : 'bg-brand-orange text-white'
                                            }`}>✓</span>
                                          )}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          
          {/* Code Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Thinking Mode Display - Only show during active generation */}
            {generationProgress.isGenerating && (generationProgress.isThinking || generationProgress.thinkingText) && (
              <div className="px-6 pb-6">
                <div className="flex items-center gap-2 mb-2">

                  <div className="text-brand-orange font-medium flex items-center gap-2">
                    {generationProgress.isThinking ? (
                      <>
                        <div className="w-3 h-3 bg-brand-orange rounded-full animate-pulse" />
                        AI is thinking...
                      </>
                    ) : (
                      <>
                        <span className="text-brand-orange">✓</span>
                        Thought for {generationProgress.thinkingDuration || 0} seconds
                      </>
                    )}
                  </div>
                </div>
                {generationProgress.thinkingText && (
                  <div className="bg-warm-900 border border-warm-750/20 rounded-xl p-4 max-h-48 overflow-y-auto scrollbar-hide">
                    <pre className="text-xs font-mono text-warm-200 whitespace-pre-wrap">
                      {generationProgress.thinkingText}
                    </pre>
                  </div>
                )}
              </div>
            )}
            
            {/* Live Code Display */}
            <div className="flex-1 rounded-lg p-6 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide" ref={codeDisplayRef}>
                {/* Show selected file if one is selected */}
                {selectedFile ? (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="bg-warm-900 border border-warm-750/20 rounded-xl overflow-hidden shadow-sm">
                      <div className="px-4 py-2 bg-warm-800 text-warm-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getFileIcon(selectedFile)}
                          <span className="font-mono text-sm">{selectedFile}</span>
                        </div>
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="hover:bg-warm-100/10 p-1 rounded transition-colors"
                        >
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="bg-warm-900 border border-warm-750/20 rounded-xl overflow-hidden">
                        <SyntaxHighlighter
                          language={(() => {
                            const ext = selectedFile.split('.').pop()?.toLowerCase();
                            if (ext === 'css') return 'css';
                            if (ext === 'json') return 'json';
                            if (ext === 'html') return 'html';
                            return 'jsx';
                          })()}
                          style={vscDarkPlus}
                          customStyle={{
                            margin: 0,
                            padding: '1rem',
                            fontSize: '0.875rem',
                            background: 'transparent',
                          }}
                          showLineNumbers={true}
                        >
                          {(() => {
                            // Find the file content from generated files
                            const file = generationProgress.files.find(f => f.path === selectedFile);
                            return file?.content || '// File content will appear here';
                          })()}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  </div>
                ) : /* If no files parsed yet, show loading or raw stream */
                generationProgress.files.length === 0 && !generationProgress.currentFile ? (
                  generationProgress.isThinking ? (
                    // Beautiful loading state while thinking
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="mb-8 relative">
                          <div className="w-48 h-48 mx-auto">
                            <div className="absolute inset-0 border-8 border-gray-800 rounded-full"></div>
                            <div className="absolute inset-0 border-8 border-green-500 rounded-full animate-spin border-t-transparent"></div>
                          </div>
                        </div>
                        <h3 className="text-xl font-medium text-white mb-2">AI is analyzing your request</h3>
                        <p className="text-foreground-dimmer text-sm">{generationProgress.status || 'Preparing to generate code...'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-warm-900 border border-warm-750/20 rounded-xl overflow-hidden">
                      <div className="px-4 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-16 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                          <span className="font-mono text-sm">Streaming code...</span>
                        </div>
                      </div>
                      <div className="p-4 bg-gray-900 rounded">
                        <SyntaxHighlighter
                          language="jsx"
                          style={vscDarkPlus}
                          customStyle={{
                            margin: 0,
                            padding: '1rem',
                            fontSize: '0.875rem',
                            background: 'transparent',
                          }}
                          showLineNumbers={true}
                        >
                          {generationProgress.streamedCode || 'Starting code generation...'}
                        </SyntaxHighlighter>
                        <span className="inline-block w-3 h-5 bg-orange-400 ml-1 animate-pulse" />
                      </div>
                    </div>
                  )
                ) : (
                  <div className="space-y-4">
                    {/* Show current file being generated */}
                    {generationProgress.currentFile && (
                      <div className="bg-warm-900 border border-warm-750/20 rounded-xl overflow-hidden shadow-sm">
                        <div className="px-4 py-2 bg-warm-800 text-warm-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-16 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span className="font-mono text-sm">{generationProgress.currentFile.path}</span>
                            <span className={`px-2 py-0.5 text-xs rounded ${
                              generationProgress.currentFile.type === 'css' ? 'bg-blue-600 text-white' :
                              generationProgress.currentFile.type === 'javascript' ? 'bg-yellow-600 text-white' :
                              generationProgress.currentFile.type === 'json' ? 'bg-green-600 text-white' :
                              'bg-[var(--bg-secondary)]-hover text-[var(--text-secondary)]'
                            }`}>
                              {generationProgress.currentFile.type === 'javascript' ? 'JSX' : generationProgress.currentFile.type.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="bg-gray-900 border border-gray-700 rounded">
                          <SyntaxHighlighter
                            language={
                              generationProgress.currentFile.type === 'css' ? 'css' :
                              generationProgress.currentFile.type === 'json' ? 'json' :
                              generationProgress.currentFile.type === 'html' ? 'html' :
                              'jsx'
                            }
                            style={vscDarkPlus}
                            customStyle={{
                              margin: 0,
                              padding: '1rem',
                              fontSize: '0.75rem',
                              background: 'transparent',
                            }}
                            showLineNumbers={true}
                          >
                            {generationProgress.currentFile.content}
                          </SyntaxHighlighter>
                          <span className="inline-block w-3 h-4 bg-orange-400 ml-4 mb-4 animate-pulse" />
                        </div>
                      </div>
                    )}
                    
                    {/* Show completed files */}
                    {generationProgress.files.map((file, idx) => (
                      <div key={idx} className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-lg overflow-hidden">
                        <div className="px-4 py-2 bg-warm-800 text-warm-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-green-500">✓</span>
                            <span className="font-mono text-sm">{file.path}</span>
                          </div>
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            file.type === 'css' ? 'bg-blue-600 text-white' :
                            file.type === 'javascript' ? 'bg-yellow-600 text-white' :
                            file.type === 'json' ? 'bg-green-600 text-white' :
                            'bg-[var(--bg-secondary)]-hover text-[var(--text-secondary)]'
                          }`}>
                            {file.type === 'javascript' ? 'JSX' : file.type.toUpperCase()}
                          </span>
                        </div>
                        <div className="bg-warm-900 border border-warm-750/20 rounded-xl overflow-hidden max-h-48 overflow-y-auto scrollbar-hide">
                          <SyntaxHighlighter
                            language={
                              file.type === 'css' ? 'css' :
                              file.type === 'json' ? 'json' :
                              file.type === 'html' ? 'html' :
                              'jsx'
                            }
                            style={vscDarkPlus}
                            customStyle={{
                              margin: 0,
                              padding: '1rem',
                              fontSize: '0.75rem',
                              background: 'transparent',
                            }}
                            showLineNumbers={true}
                            wrapLongLines={true}
                          >
                            {file.content}
                          </SyntaxHighlighter>
                        </div>
                      </div>
                    ))}
                    
                    {/* Show remaining raw stream if there's content after the last file */}
                    {!generationProgress.currentFile && generationProgress.streamedCode.length > 0 && (
                      <div className="bg-warm-900 border border-warm-750/20 rounded-xl overflow-hidden">
                        <div className="px-4 py-2 bg-warm-800 text-warm-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-16 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                            <span className="font-mono text-sm">Processing...</span>
                          </div>
                        </div>
                        <div className="bg-gray-900 border border-gray-700 rounded">
                          <SyntaxHighlighter
                            language="jsx"
                            style={vscDarkPlus}
                            customStyle={{
                              margin: 0,
                              padding: '1rem',
                              fontSize: '0.75rem',
                              background: 'transparent',
                            }}
                            showLineNumbers={false}
                          >
                            {(() => {
                              // Show only the tail of the stream after the last file
                              const lastFileEnd = generationProgress.files.length > 0 
                                ? generationProgress.streamedCode.lastIndexOf('</file>') + 7
                                : 0;
                              let remainingContent = generationProgress.streamedCode.slice(lastFileEnd).trim();
                              
                              // Remove explanation tags and content
                              remainingContent = remainingContent.replace(/<explanation>[\s\S]*?<\/explanation>/g, '').trim();

                              // If only whitespace or nothing left, show loading message
                              // Use "Loading sandbox..." instead of "Waiting for next file..." for better UX
                              return remainingContent || 'Loading sandbox...';
                            })()}
                          </SyntaxHighlighter>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Progress indicator */}
            {generationProgress.components.length > 0 && (
              <div className="mx-6 mb-6">
                <div className="h-2 bg-warm-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-300"
                    style={{
                      width: `${(generationProgress.currentComponent / Math.max(generationProgress.components.length, 1)) * 100}%`
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      );
    } else if (activeTab === 'preview') {
      // Show loading state for initial generation or when starting a new generation with existing sandbox
      const isInitialGeneration = !sandboxData?.url && (urlScreenshot || isCapturingScreenshot || isPreparingDesign || loadingStage);
      const isNewGenerationWithSandbox = isStartingNewGeneration && sandboxData?.url;
      const shouldShowLoadingOverlay = (isInitialGeneration || isNewGenerationWithSandbox) && 
        (loading || generationProgress.isGenerating || isPreparingDesign || loadingStage || isCapturingScreenshot || isStartingNewGeneration);
      
      if (isInitialGeneration || isNewGenerationWithSandbox) {
        return (
          <div className="relative w-full h-full bg-gray-900">
            {/* Screenshot as background when available */}
            {urlScreenshot && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img 
                src={urlScreenshot} 
                alt="Website preview" 
                className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
                style={{ 
                  opacity: isScreenshotLoaded ? 1 : 0,
                  willChange: 'opacity'
                }}
                onLoad={() => setIsScreenshotLoaded(true)}
                loading="eager"
              />
            )}
            
            {/* Loading overlay - only show when actively processing initial generation */}
            {shouldShowLoadingOverlay && (
              <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center backdrop-blur-sm">
                {/* Loading animation with skeleton */}
                <div className="text-center max-w-md">
                  {/* Animated skeleton lines */}
                  <div className="mb-6 space-y-3">
                    <div className="h-2 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded animate-pulse" 
                         style={{ animationDuration: '1.5s', animationDelay: '0s' }} />
                    <div className="h-2 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded animate-pulse w-4/5 mx-auto" 
                         style={{ animationDuration: '1.5s', animationDelay: '0.2s' }} />
                    <div className="h-2 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded animate-pulse w-3/5 mx-auto" 
                         style={{ animationDuration: '1.5s', animationDelay: '0.4s' }} />
                  </div>
                  
                  {/* Status text */}
                  <p className="text-white text-lg font-medium">
                    {isCapturingScreenshot ? 'Analyzing website...' :
                     isPreparingDesign ? 'Preparing design...' :
                     generationProgress.isGenerating ? 'Generating code...' :
                     'Loading...'}
                  </p>
                  
                  {/* Subtle progress hint */}
                  <p className="text-white/60 text-sm mt-2">
                    {isCapturingScreenshot ? 'Taking a screenshot of the site' :
                     isPreparingDesign ? 'Understanding the layout and structure' :
                     generationProgress.isGenerating ? 'Writing React components' :
                     'Please wait...'}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      }
      
      // Show sandbox iframe - keep showing during edits, only hide during initial loading
      if (sandboxData?.url) {
        return (
          <div className="relative w-full h-full">
            <iframe
              ref={iframeRef}
              src={sandboxData.url}
              className="w-full h-full border-none"
              title="Noeron Sandbox"
              allow="clipboard-write"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              onLoad={() => {
                console.log('[iframe] Loaded successfully');
              }}
              onError={() => {
                console.error('[iframe] Failed to load - sandbox may have timed out');
                // During warm-up window: retry loading instead of triggering full recreation
                if (Date.now() - sandboxJustCreatedAt.current < 60_000) {
                  console.log('[iframe] Sandbox warming up, retrying in 3s...');
                  setTimeout(() => {
                    if (iframeRef.current && sandboxData?.url) {
                      iframeRef.current.src = `${sandboxData.url}?t=${Date.now()}`;
                    }
                  }, 3000);
                  return;
                }
                checkSandboxStatus(true);
              }}
            />
            
            {/* Package installation overlay - shows when installing packages or applying code */}

            {/* Sandbox connection error overlay */}
            {(status.text === 'Sandbox not responding' || status.text === 'Status check failed') && (
              <div className="absolute inset-0 bg-background-lighter/95 backdrop-blur-sm flex items-center justify-center z-20">
                <div className="max-w-sm rounded-2xl border border-warm-750/12 bg-white p-8 text-center shadow-sm">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-1">Sandbox connection failed</h3>
                  <p className="text-sm text-foreground-dimmer mb-4">The preview sandbox could not be reached. Try reloading it.</p>
                  <button
                    onClick={() => refreshSandboxPreview(sandboxData, 'The preview sandbox stopped.')}
                    className="ol-primary-button px-4 py-2 text-sm"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
            {codeApplicationState.stage && codeApplicationState.stage !== 'complete' && (
              <div className="absolute inset-0 bg-[var(--bg-primary)]/95 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="text-center max-w-md">
                  <div className="mb-6">
                    {/* Animated icon based on stage */}
                    {codeApplicationState.stage === 'installing' ? (
                      <div className="w-16 h-16 mx-auto">
                        <svg className="w-full h-full animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                    ) : null}
                  </div>
                  
                  <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                    {codeApplicationState.stage === 'analyzing' && 'Analyzing code...'}
                    {codeApplicationState.stage === 'installing' && 'Installing packages...'}
                    {codeApplicationState.stage === 'applying' && 'Applying changes...'}
                  </h3>
                  
                  {/* Package list during installation */}
                  {codeApplicationState.stage === 'installing' && codeApplicationState.packages && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2 justify-center">
                        {codeApplicationState.packages.map((pkg, index) => (
                          <span 
                            key={index}
                            className={`px-2 py-1 text-xs rounded-full transition-all ${
                              codeApplicationState.installedPackages?.includes(pkg)
                                ? 'bg-green-100 text-green-700'
                                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]'
                            }`}
                          >
                            {pkg}
                            {codeApplicationState.installedPackages?.includes(pkg) && (
                              <span className="ml-1">✓</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Files being generated */}
                  {codeApplicationState.stage === 'applying' && codeApplicationState.filesGenerated && (
                    <div className="text-sm text-[var(--text-secondary)]">
                      Creating {codeApplicationState.filesGenerated.length} files...
                    </div>
                  )}
                  
                  <p className="text-sm text-foreground-dimmer mt-2">
                    {codeApplicationState.stage === 'analyzing' && 'Parsing generated code and detecting dependencies...'}
                    {codeApplicationState.stage === 'installing' && 'This may take a moment while npm installs the required packages...'}
                    {codeApplicationState.stage === 'applying' && 'Writing files to your sandbox environment...'}
                  </p>
                </div>
              </div>
            )}
            
            {/* Show a subtle indicator when code is being edited/generated */}
            {generationProgress.isGenerating && generationProgress.isEdit && !codeApplicationState.stage && (
              <div className="absolute top-4 right-4 inline-flex items-center gap-2 px-3 py-1.5 bg-black/80 backdrop-blur-sm rounded-lg">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-white text-xs font-medium">Generating code...</span>
              </div>
            )}
            
            {/* Refresh button */}
            <button
              onClick={() => refreshSandboxPreview(sandboxData, 'The preview sandbox stopped.')}
              className="absolute bottom-4 right-4 bg-[var(--bg-primary)]/90 hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] p-2 rounded-lg shadow-lg transition-all duration-200 hover:scale-105"
              title="Refresh sandbox"
            >
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        );
      }
      
      // Default state when no sandbox and no screenshot

      return (
        <div className="flex items-center justify-center h-full bg-background-base p-6">
          {screenshotError ? (
            <div className="max-w-sm rounded-2xl border border-warm-750/12 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">Failed to capture screenshot</h3>
              <p className="text-sm text-foreground-dimmer mb-4">{screenshotError}</p>
              <button
                onClick={() => {
                  setScreenshotError(null);
                  if (homeUrlInput) {
                    let url = homeUrlInput.trim();
                    if (!url.match(/^https?:\/\//i)) url = 'https://' + url;
                    captureUrlScreenshot(url);
                  }
                }}
                className="ol-primary-button px-4 py-2 text-sm"
              >
                Retry
              </button>
            </div>
          ) : sandboxData ? (
            <div className="text-foreground-dimmer text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warm-100 text-warm-600">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <p className="text-sm">Loading preview...</p>
            </div>
          ) : (
            <div className="max-w-sm rounded-2xl border border-warm-750/12 bg-white p-8 text-center shadow-[0_24px_60px_rgba(74,54,28,0.12)]">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warm-100 text-warm-600">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">Start building</h3>
              <p className="text-sm text-foreground-dimmer mb-5">Paste a URL or describe what you want to create.</p>
              <Link href="/" className="ol-primary-button inline-flex px-5 py-2.5 text-sm">
                New website
              </Link>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const sendChatMessage = async () => {
    const message = aiChatInput.trim();
    if (!message) return;
    
    if (!aiEnabled) {
      addChatMessage('AI is disabled. Please enable it first.', 'system');
      return;
    }
    
    addChatMessage(message, 'user');
    setAiChatInput('');

    // Clear uploaded images after sending
    const imagesToSend = chatUploadedImages;
    const imagesForGeneration = imagesToSend.length > 0 ? imagesToSend : undefined;
    setChatUploadedImages([]);

    // Store images in context for apply phase
    setConversationContext(prev => ({
      ...prev,
      uploadedImages: imagesForGeneration,
      lastGeneratedImages: imagesForGeneration ?? prev.lastGeneratedImages
    }));

    // Check for special commands
    const lowerMessage = message.toLowerCase().trim();
    if (lowerMessage === 'check packages' || lowerMessage === 'install packages' || lowerMessage === 'npm install') {
      if (!sandboxData) {
        // More helpful message - user might be trying to run this too early
        addChatMessage('The sandbox is still being set up. Please wait for the generation to complete, then try again.', 'system');
        return;
      }
      await checkAndInstallPackages();
      return;
    }
    
    // Start sandbox creation in parallel if needed
    let sandboxPromise: Promise<any> | null = null;
    let sandboxCreating = false;

    if (!sandboxData) {
      sandboxCreating = true;
      addChatMessage('Creating sandbox while I plan your app...', 'system');
      console.log('[startGeneration] Starting sandbox creation...');
      sandboxPromise = createSandbox(true).then((data) => {
        console.log('[startGeneration] Sandbox created:', data?.sandboxId);
        return data;
      }).catch((error: any) => {
        console.error('[startGeneration] Sandbox creation failed:', error);
        addChatMessage(`Failed to create sandbox: ${error.message}`, 'system');
        throw error;
      });
    } else {
      console.log('[startGeneration] Sandbox already exists:', sandboxData.sandboxId);
    }
    
    // Determine if this is an edit
    const isEdit = conversationContext.appliedCode.length > 0;
    
    try {
      // Generation tab is already active from scraping phase
      setGenerationProgress(prev => ({
        ...prev,  // Preserve all existing state
        isGenerating: true,
        status: 'Starting AI generation...',
        components: [],
        currentComponent: 0,
        streamedCode: '',
        isStreaming: false,
        isThinking: true,
        thinkingText: 'Analyzing your request...',
        thinkingDuration: undefined,
        currentFile: undefined,
        lastProcessedPosition: 0,
        // Add isEdit flag to generation progress
        isEdit: isEdit,
        // Keep existing files for edits - we'll mark edited ones differently
        files: prev.files
      }));
      
      // Backend now manages file state - no need to fetch from frontend
      console.log('[chat] Using backend file cache for context');
      
      const fullContext = {
        sandboxId: sandboxData?.sandboxId || (sandboxCreating ? 'pending' : null),
        structure: structureContent,
        recentMessages: chatMessages.slice(-20),
        conversationContext: {
          ...conversationContext,
          uploadedImages: undefined,
          lastGeneratedImages: undefined
        },
        currentCode: promptInput,
        sandboxUrl: sandboxData?.url,
        sandboxCreating: sandboxCreating
      };
      
      // Debug what we're sending
      console.log('[chat] Sending context to AI:');
      console.log('[chat] - sandboxId:', fullContext.sandboxId);
      console.log('[chat] - isEdit:', conversationContext.appliedCode.length > 0);
      
      const response = await fetch('/api/generate-ai-code-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: message,
          model: aiModel,
          context: fullContext,
          isEdit: conversationContext.appliedCode.length > 0,
          uploadedImages: imagesForGeneration,
          aiImagesEnabled
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (errorData?.limitReached) {
          router.push(errorData.upgradeUrl || '/pricing');
        }
        throw new Error(errorData?.error || `HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let generatedCode = '';
      let explanation = '';
      let buffer = ''; // Buffer for incomplete lines
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          console.log('[chat] Received chunk:', chunk.length, 'bytes');
          buffer += chunk;
          const lines = buffer.split('\n');
          
          // Keep the last line in buffer if it's incomplete
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'status') {
                  setGenerationProgress(prev => ({ ...prev, status: data.message }));
                } else if (data.type === 'thinking') {
                  setGenerationProgress(prev => ({ 
                    ...prev, 
                    isThinking: true,
                    thinkingText: (prev.thinkingText || '') + data.text
                  }));
                } else if (data.type === 'thinking_complete') {
                  setGenerationProgress(prev => ({ 
                    ...prev, 
                    isThinking: false,
                    thinkingDuration: data.duration
                  }));
                } else if (data.type === 'conversation') {
                  // Add conversational text to chat only if it's not code
                  let text = data.text || '';
                  
                  // Remove package tags from the text
                  text = text.replace(/<package>[^<]*<\/package>/g, '');
                  text = text.replace(/<packages>[^<]*<\/packages>/g, '');
                  
                  // Filter out any XML tags and file content that slipped through
                  if (!text.includes('<file') && !text.includes('import React') && 
                      !text.includes('export default') && !text.includes('className=') &&
                      text.trim().length > 0) {
                    addChatMessage(text.trim(), 'ai');
                  }
                } else if (data.type === 'stream' && data.raw) {
                  setGenerationProgress(prev => {
                    const newStreamedCode = prev.streamedCode + data.text;
                    
                    // Tab is already switched after scraping
                    
                    const updatedState = { 
                      ...prev, 
                      streamedCode: newStreamedCode,
                      isStreaming: true,
                      isThinking: false,
                      status: 'Generating code...'
                    };
                    
                    // Process complete files from the accumulated stream
                    const fileRegex = /<file path="([^"]+)">([^]*?)<\/file>/g;
                    let match;
                    const processedFiles = new Set(prev.files.map(f => f.path));
                    
                    while ((match = fileRegex.exec(newStreamedCode)) !== null) {
                      const filePath = match[1];
                      const fileContent = match[2];
                      
                      // Only add if we haven't processed this file yet
                      if (!processedFiles.has(filePath)) {
                        const fileExt = filePath.split('.').pop() || '';
                        const fileType = fileExt === 'jsx' || fileExt === 'js' ? 'javascript' :
                                        fileExt === 'css' ? 'css' :
                                        fileExt === 'json' ? 'json' :
                                        fileExt === 'html' ? 'html' : 'text';
                        
                        // Check if file already exists
                        const existingFileIndex = updatedState.files.findIndex(f => f.path === filePath);
                        
                        if (existingFileIndex >= 0) {
                          // Update existing file and mark as edited
                          updatedState.files = [
                            ...updatedState.files.slice(0, existingFileIndex),
                            {
                              ...updatedState.files[existingFileIndex],
                              content: fileContent.trim(),
                              type: fileType,
                              completed: true,
                              edited: true
                            },
                            ...updatedState.files.slice(existingFileIndex + 1)
                          ];
                        } else {
                          // Add new file
                          updatedState.files = [...updatedState.files, {
                            path: filePath,
                            content: fileContent.trim(),
                            type: fileType,
                            completed: true,
                            edited: false
                          }];
                        }
                        
                        // Only show file status if not in edit mode
                        if (!prev.isEdit) {
                          updatedState.status = `Completed ${filePath}`;
                        }
                        processedFiles.add(filePath);
                      }
                    }
                    
                    // Check for current file being generated (incomplete file at the end)
                    const lastFileMatch = newStreamedCode.match(/<file path="([^"]+)">([^]*?)$/);
                    if (lastFileMatch && !lastFileMatch[0].includes('</file>')) {
                      const filePath = lastFileMatch[1];
                      const partialContent = lastFileMatch[2];
                      
                      if (!processedFiles.has(filePath)) {
                        const fileExt = filePath.split('.').pop() || '';
                        const fileType = fileExt === 'jsx' || fileExt === 'js' ? 'javascript' :
                                        fileExt === 'css' ? 'css' :
                                        fileExt === 'json' ? 'json' :
                                        fileExt === 'html' ? 'html' : 'text';
                        
                        updatedState.currentFile = { 
                          path: filePath, 
                          content: partialContent, 
                          type: fileType 
                        };
                        // Only show file status if not in edit mode
                        if (!prev.isEdit) {
                          updatedState.status = `Generating ${filePath}`;
                        }
                      }
                    } else {
                      updatedState.currentFile = undefined;
                    }
                    
                    return updatedState;
                  });
                } else if (data.type === 'app') {
                  setGenerationProgress(prev => ({ 
                    ...prev, 
                    status: 'Generated App.jsx structure'
                  }));
                } else if (data.type === 'component') {
                  setGenerationProgress(prev => ({
                    ...prev,
                    status: `Generated ${data.name}`,
                    components: [...prev.components, { 
                      name: data.name, 
                      path: data.path, 
                      completed: true 
                    }],
                    currentComponent: data.index
                  }));
                } else if (data.type === 'package') {
                  // Handle package installation from tool calls
                  setGenerationProgress(prev => ({
                    ...prev,
                    status: data.message || `Installing ${data.name}`
                  }));
                } else if (data.type === 'complete') {
                  generatedCode = data.generatedCode;
                  explanation = data.explanation;
                  
                  // Save the last generated code
                  setConversationContext(prev => ({
                    ...prev,
                    lastGeneratedCode: generatedCode,
                    lastGeneratedImages: imagesForGeneration ?? prev.lastGeneratedImages
                  }));
                  
                  // Clear thinking state when generation completes
                  setGenerationProgress(prev => ({
                    ...prev,
                    isThinking: false,
                    thinkingText: undefined,
                    thinkingDuration: undefined
                  }));
                  
                  // Store packages to install from tool calls
                  if (data.packagesToInstall && data.packagesToInstall.length > 0) {
                    console.log('[generate-code] Packages to install from tools:', data.packagesToInstall);
                    // Store packages globally for later installation
                    (window as any).pendingPackages = data.packagesToInstall;
                  }
                  
                  // Parse all files from the completed code if not already done
                  const fileRegex = /<file path="([^"]+)">([^]*?)<\/file>/g;
                  const parsedFiles: Array<{path: string; content: string; type: string; completed: boolean}> = [];
                  let fileMatch;
                  
                  while ((fileMatch = fileRegex.exec(data.generatedCode)) !== null) {
                    const filePath = fileMatch[1];
                    const fileContent = fileMatch[2];
                    const fileExt = filePath.split('.').pop() || '';
                    const fileType = fileExt === 'jsx' || fileExt === 'js' ? 'javascript' :
                                    fileExt === 'css' ? 'css' :
                                    fileExt === 'json' ? 'json' :
                                    fileExt === 'html' ? 'html' : 'text';
                    
                    parsedFiles.push({
                      path: filePath,
                      content: fileContent.trim(),
                      type: fileType,
                      completed: true
                    });
                  }
                  
                  setGenerationProgress(prev => ({
                    ...prev,
                    status: `Generated ${parsedFiles.length > 0 ? parsedFiles.length : prev.files.length} file${(parsedFiles.length > 0 ? parsedFiles.length : prev.files.length) !== 1 ? 's' : ''}!`,
                    isGenerating: false,
                    isStreaming: false,
                    isEdit: prev.isEdit,
                    // Keep the files that were already parsed during streaming
                    files: prev.files.length > 0 ? prev.files : parsedFiles
                  }));
                } else if (data.type === 'usage') {
                  console.log('[chat] Token usage:', data);
                } else if (data.type === 'error') {
                  if (data.limitReached) {
                    router.push(data.upgradeUrl || '/pricing');
                  }
                  throw new Error(data.error);
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        }
      }

      // Process any remaining data in the buffer after stream ends
      if (buffer.trim()) {
        console.log('[chat] Processing remaining buffer:', buffer.length, 'bytes');
        const lines = buffer.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'complete') {
                console.log('[chat] Processing late complete event from buffer');
                generatedCode = data.generatedCode;
                explanation = data.explanation;

                // Save the last generated code
                setConversationContext(prev => ({
                  ...prev,
                  lastGeneratedCode: generatedCode,
                  lastGeneratedImages: imagesForGeneration ?? prev.lastGeneratedImages
                }));

                // Clear thinking state when generation completes
                setGenerationProgress(prev => ({
                  ...prev,
                  isThinking: false,
                  thinkingText: undefined,
                  thinkingDuration: undefined
                }));

                // Store packages to install from tool calls
                if (data.packagesToInstall && data.packagesToInstall.length > 0) {
                  console.log('[generate-code] Packages to install from tools:', data.packagesToInstall);
                  (window as any).pendingPackages = data.packagesToInstall;
                }
              } else if (data.type === 'error') {
                console.error('[chat] Late error event from buffer:', data.error);
                // Don't throw here, just log it - the main processing already handled errors
              }
            } catch (e) {
              console.error('Failed to parse remaining SSE data:', e);
            }
          }
        }
      }

      if (generatedCode) {
        // Parse files from generated code for metadata
        const fileRegex = /<file path="([^"]+)">([^]*?)<\/file>/g;
        const generatedFiles = [];
        let match;
        while ((match = fileRegex.exec(generatedCode)) !== null) {
          generatedFiles.push(match[1]);
        }
        
        // Show appropriate message based on edit mode
        if (isEdit && generatedFiles.length > 0) {
          // For edits, show which file(s) were edited
          const editedFileNames = generatedFiles.map(f => f.split('/').pop()).join(', ');
          addChatMessage(
            explanation || `Updated ${editedFileNames}`,
            'ai',
            {
              appliedFiles: [generatedFiles[0]] // Only show the first edited file
            }
          );
        } else {
          // For new generation, show all files
          addChatMessage(explanation || 'Code generated!', 'ai', {
            appliedFiles: generatedFiles
          });
        }
        
        setPromptInput(generatedCode);
        // Don't show the Generated Code panel by default
        // setLeftPanelVisible(true);
        
        // Wait for sandbox creation if it's still in progress
        let activeSandboxData = sandboxDataRef.current ?? sandboxData;
        console.log('[startGeneration] Initial sandboxData:', { sandboxData: !!sandboxData, sandboxPromise: !!sandboxPromise });

        if (sandboxPromise) {
          addChatMessage('Waiting for sandbox to be ready...', 'system');
          try {
            console.log('[startGeneration] Awaiting sandboxPromise...');
            const newSandboxData = await sandboxPromise;
            console.log('[startGeneration] sandboxPromise resolved:', { newSandboxData: !!newSandboxData, hasSandboxId: !!newSandboxData?.sandboxId });
            if (newSandboxData != null && newSandboxData.sandboxId) {
              activeSandboxData = newSandboxData;
              // Also update the state for future use
              sandboxDataRef.current = newSandboxData;
              setSandboxData(newSandboxData);
              console.log('[startGeneration] Using new sandbox data:', newSandboxData.sandboxId);
            } else {
              console.warn('[startGeneration] sandboxPromise resolved but no valid data, waiting for sandboxData state...');
              // If promise returned null but sandboxData might be set via state update soon, wait for it
              // Poll sandboxData for up to 10 seconds
              const startTime = Date.now();
              while (!activeSandboxData && Date.now() - startTime < 10000) {
                await new Promise(resolve => setTimeout(resolve, 100));
                activeSandboxData = sandboxDataRef.current;
                if (activeSandboxData) {
                  console.log('[startGeneration] sandboxData became available after waiting:', activeSandboxData.sandboxId);
                  break;
                }
              }
              if (!activeSandboxData) {
                console.error('[startGeneration] sandboxData did not become available after 10s');
              }
            }
            // Remove the waiting message
            setChatMessages(prev => prev.filter(msg => msg.content !== 'Waiting for sandbox to be ready...'));
          } catch (error) {
            console.error('[startGeneration] Sandbox creation failed:', error);
            addChatMessage('Sandbox creation failed. Cannot apply code.', 'system');
            return;
          }
        } else if (!activeSandboxData) {
          console.error('[startGeneration] No sandboxPromise and no sandboxData - sandbox was never created!');
          addChatMessage('Sandbox not available. Please refresh and try again.', 'system');
          return;
        }
        
        console.log('[startGeneration] Checking conditions for applyGeneratedCode:', {
          hasActiveSandboxData: !!activeSandboxData,
          hasGeneratedCode: !!generatedCode,
          generatedCodeLength: generatedCode?.length || 0,
          sandboxCreating,
          activeSandboxDataId: activeSandboxData?.sandboxId
        });

        if (activeSandboxData && generatedCode) {
          // For new sandbox creations (especially Vercel), add a delay to ensure Vite is ready
          if (sandboxCreating) {
            console.log('[startGeneration] New sandbox created, waiting for services to be ready...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }

          // Use isEdit flag that was determined at the start
          // Pass the sandbox data from the promise if it's different from the state
          console.log('[startGeneration] Calling applyGeneratedCode with:', {
            generatedCodeLength: generatedCode.length,
            isEdit,
            sandboxId: activeSandboxData.sandboxId,
            uploadedImageCount: imagesForGeneration?.length || 0
          });
          let codeToApply = generatedCode;
          if (aiImagesEnabled) {
            addChatMessage('Generating AI images for the website...', 'system');
            codeToApply = await processGeneratedCodeForImages(generatedCode, (done, total) => {
              addChatMessage(`Generating image ${done} of ${total}...`, 'system');
            });
          }
          const imagesForApply = getImagesForGeneratedCode(
            codeToApply,
            imagesForGeneration,
            conversationContext.lastGeneratedImages
          );
          await applyGeneratedCode(codeToApply, isEdit, activeSandboxData, imagesForApply);
        } else {
          console.error('[startGeneration] NOT calling applyGeneratedCode - missing:', {
            activeSandboxData: !!activeSandboxData,
            generatedCode: !!generatedCode
          });
        }
      }
      
      // Show completion status briefly then switch to preview
      setGenerationProgress(prev => ({
        ...prev,
        isGenerating: false,
        isStreaming: false,
        status: 'Generation complete!',
        isEdit: prev.isEdit,
        // Clear thinking state on completion
        isThinking: false,
        thinkingText: undefined,
        thinkingDuration: undefined
      }));
      
      setTimeout(() => {
        // Switch to preview but keep files for display
        setActiveTab('preview');
      }, 1000); // Reduced from 3000ms to 1000ms
    } catch (error: any) {
      setChatMessages(prev => prev.filter(msg => msg.content !== 'Thinking...'));
      addChatMessage(`Error: ${error.message}`, 'system');
      // Reset generation progress and switch back to preview on error
      setGenerationProgress({
        isGenerating: false,
        status: '',
        components: [],
        currentComponent: 0,
        streamedCode: '',
        isStreaming: false,
        isThinking: false,
        thinkingText: undefined,
        thinkingDuration: undefined,
        files: [],
        currentFile: undefined,
        lastProcessedPosition: 0
      });
      setActiveTab('preview');
    }
  };


  const downloadZip = async () => {
    if (!sandboxData) {
      addChatMessage('Please wait for the sandbox to be created before downloading.', 'system');
      return;
    }

    let files: Array<[string, string]> = Object.entries(sandboxFiles);
    if (files.length === 0) {
      addChatMessage('Preparing files from the active sandbox...', 'system');
      const refreshedFiles = await fetchSandboxFiles();
      files = Object.entries(refreshedFiles || filesArrayToCache(generationProgress.files)) as Array<[string, string]>;
      if (files.length === 0) {
        addChatMessage('No files to download yet. Generate some code first.', 'system');
        return;
      }
    }

    addChatMessage('Creating ZIP file...', 'system');
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      for (const [path, content] of files) {
        zip.file(path, content);
      }
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'noeron-project.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addChatMessage(
        'Downloaded! To run locally:\n1. Unzip\n2. npm install\n3. npm run dev',
        'system'
      );
    } catch (error: any) {
      addChatMessage(`Failed to create ZIP: ${error.message}`, 'system');
    }
  };

  const reapplyLastGeneration = async () => {
    if (!conversationContext.lastGeneratedCode) {
      addChatMessage('No previous generation to re-apply', 'system');
      return;
    }
    
    if (!sandboxData) {
      addChatMessage('Please create a sandbox first', 'system');
      return;
    }
    
    addChatMessage('Re-applying last generation...', 'system');
    const isEdit = conversationContext.appliedCode.length > 0;
    const imagesForReapply = getImagesForGeneratedCode(
      conversationContext.lastGeneratedCode,
      conversationContext.uploadedImages,
      conversationContext.lastGeneratedImages
    );
    await applyGeneratedCode(conversationContext.lastGeneratedCode, isEdit, undefined, imagesForReapply);
  };

  // Auto-scroll code display to bottom when streaming
  useEffect(() => {
    if (codeDisplayRef.current && generationProgress.isStreaming) {
      codeDisplayRef.current.scrollTop = codeDisplayRef.current.scrollHeight;
    }
  }, [generationProgress.streamedCode, generationProgress.isStreaming]);

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFileClick = async (filePath: string) => {
    setSelectedFile(filePath);
    // TODO: Add file content fetching logic here
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    if (ext === 'jsx' || ext === 'js') {
      return <SiJavascript style={{ width: '16px', height: '16px' }} className="text-yellow-500" />;
    } else if (ext === 'tsx' || ext === 'ts') {
      return <SiReact style={{ width: '16px', height: '16px' }} className="text-blue-500" />;
    } else if (ext === 'css') {
      return <SiCss3 style={{ width: '16px', height: '16px' }} className="text-blue-500" />;
    } else if (ext === 'json') {
      return <SiJson style={{ width: '16px', height: '16px' }} className="text-[var(--text-secondary)]" />;
    } else {
      return <FiFile style={{ width: '16px', height: '16px' }} className="text-[var(--text-secondary)]" />;
    }
  };

//   const clearChatHistory = () => {
//     setChatMessages([{
//       content: 'Chat history cleared. How can I help you?',
//       type: 'system',
//       timestamp: new Date()
//     }]);
//   };
// 

//   const cloneWebsite = async () => {
//     let url = urlInput.trim();
//     if (!url) {
//       setUrlStatus(prev => [...prev, 'Please enter a URL']);
//       return;
//     }
//     
//     if (!url.match(/^https?:\/\//i)) {
//       url = 'https://' + url;
//     }
//     
//     setUrlStatus([`Using: ${url}`, 'Starting to scrape...']);
//     
//     setUrlOverlayVisible(false);
//     
//     // Remove protocol for cleaner display
//     const cleanUrl = url.replace(/^https?:\/\//i, '');
//     addChatMessage(`Starting to clone ${cleanUrl}...`, 'system');
//     
//     // Capture screenshot immediately and switch to preview tab
//     captureUrlScreenshot(url);
//     
//     try {
//       addChatMessage('Scraping website content...', 'system');
//       const scrapeResponse = await fetch('/api/scrape-url-enhanced', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ url })
//       });
//       
//       if (!scrapeResponse.ok) {
//         throw new Error(`Scraping failed: ${scrapeResponse.status}`);
//       }
//       
//       const scrapeData = await scrapeResponse.json();
//       
//       if (!scrapeData.success) {
//         throw new Error(scrapeData.error || 'Failed to scrape website');
//       }
//       
//       addChatMessage(`Scraped ${scrapeData.content.length} characters from ${url}`, 'system');
//       
//       // Clear preparing design state and switch to generation tab
//       setIsPreparingDesign(false);
//       setActiveTab('generation');
//       
//       setConversationContext(prev => ({
//         ...prev,
//         scrapedWebsites: [...prev.scrapedWebsites, {
//           url,
//           content: scrapeData,
//           timestamp: new Date()
//         }],
//         currentProject: `Clone of ${url}`
//       }));
//       
//       // Start sandbox creation in parallel with code generation
//       let sandboxPromise: Promise<any> | null = null;
//       if (!sandboxData) {
//         addChatMessage('Creating sandbox while generating your React app...', 'system');
//         sandboxPromise = createSandbox(true);
//       }
//       
//       addChatMessage('Analyzing and generating React recreation...', 'system');
//       
//       const recreatePrompt = `I scraped this website and want you to recreate it as a modern React application.
// 
// URL: ${url}
// 
// SCRAPED CONTENT:
// ${scrapeData.content}
// 
// ${homeContextInput ? `ADDITIONAL CONTEXT/REQUIREMENTS FROM USER:
// ${homeContextInput}
// 
// Please incorporate these requirements into the design and implementation.` : ''}
// 
// REQUIREMENTS:
// 1. Create a COMPLETE React application with App.jsx as the main component
// 2. App.jsx MUST import and render all other components
// 3. Recreate the main sections and layout from the scraped content
// 4. ${homeContextInput ? `Apply the user's context/theme: "${homeContextInput}"` : `Use a modern dark theme with excellent contrast:
//    - Background: #0a0a0a
//    - Text: #ffffff
//    - Links: #60a5fa
//    - Accent: #3b82f6`}
// 5. Make it fully responsive
// 6. Include hover effects and smooth transitions
// 7. Create separate components for major sections (Header, Hero, Features, etc.)
// 8. Use semantic HTML5 elements
// 
// IMPORTANT CONSTRAINTS:
// - DO NOT use React Router or any routing libraries
// - Use regular <a> tags with href="#section" for navigation, NOT Link or NavLink components
// - This is a single-page application, no routing needed
// - ALWAYS create src/App.jsx that imports ALL components
// - Each component should be in src/components/
// - Use Tailwind CSS for ALL styling (no custom CSS files)
// - Make sure the app actually renders visible content
// - Create ALL components that you reference in imports
// 
// IMAGE HANDLING RULES:
// - When the scraped content includes images, USE THE ORIGINAL IMAGE URLS whenever appropriate
// - Keep existing images from the scraped site (logos, product images, hero images, icons, etc.)
// - Use the actual image URLs provided in the scraped content, not placeholders
// - Only use placeholder images or generic services when no real images are available
// - For company logos and brand images, ALWAYS use the original URLs to maintain brand identity
// - If scraped data contains image URLs, include them in your img tags
// - Example: If you see "https://example.com/logo.png" in the scraped content, use that exact URL
// 
// Focus on the key sections and content, making it clean and modern while preserving visual assets.`;
//       
//       setGenerationProgress(prev => ({
//         isGenerating: true,
//         status: 'Initializing AI...',
//         components: [],
//         currentComponent: 0,
//         streamedCode: '',
//         isStreaming: true,
//         isThinking: false,
//         thinkingText: undefined,
//         thinkingDuration: undefined,
//         // Keep previous files until new ones are generated
//         files: prev.files || [],
//         currentFile: undefined,
//         lastProcessedPosition: 0
//       }));
//       
//       // Switch to generation tab when starting
//       setActiveTab('generation');
//       
//       const aiResponse = await fetch('/api/generate-ai-code-stream', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           prompt: recreatePrompt,
//           model: aiModel,
//           context: {
//             sandboxId: sandboxData?.id,
//             structure: structureContent,
//             conversationContext: conversationContext
//           }
//         })
//       });
//       
//       if (!aiResponse.ok) {
//         throw new Error(`AI generation failed: ${aiResponse.status}`);
//       }
//       
//       const reader = aiResponse.body?.getReader();
//       const decoder = new TextDecoder();
//       let generatedCode = '';
//       let explanation = '';
//       
//       if (reader) {
//         while (true) {
//           const { done, value } = await reader.read();
//           if (done) break;
//           
//           const chunk = decoder.decode(value);
//           const lines = chunk.split('\n');
//           
//           for (const line of lines) {
//             if (line.startsWith('data: ')) {
//               try {
//                 const data = JSON.parse(line.slice(6));
//                 
//                 if (data.type === 'status') {
//                   setGenerationProgress(prev => ({ ...prev, status: data.message }));
//                 } else if (data.type === 'thinking') {
//                   setGenerationProgress(prev => ({ 
//                     ...prev, 
//                     isThinking: true,
//                     thinkingText: (prev.thinkingText || '') + data.text
//                   }));
//                 } else if (data.type === 'thinking_complete') {
//                   setGenerationProgress(prev => ({ 
//                     ...prev, 
//                     isThinking: false,
//                     thinkingDuration: data.duration
//                   }));
//                 } else if (data.type === 'conversation') {
//                   // Add conversational text to chat only if it's not code
//                   let text = data.text || '';
//                   
//                   // Remove package tags from the text
//                   text = text.replace(/<package>[^<]*<\/package>/g, '');
//                   text = text.replace(/<packages>[^<]*<\/packages>/g, '');
//                   
//                   // Filter out any XML tags and file content that slipped through
//                   if (!text.includes('<file') && !text.includes('import React') && 
//                       !text.includes('export default') && !text.includes('className=') &&
//                       text.trim().length > 0) {
//                     addChatMessage(text.trim(), 'ai');
//                   }
//                 } else if (data.type === 'stream' && data.raw) {
//                   setGenerationProgress(prev => ({ 
//                     ...prev, 
//                     streamedCode: prev.streamedCode + data.text,
//                     lastProcessedPosition: prev.lastProcessedPosition || 0
//                   }));
//                 } else if (data.type === 'component') {
//                   setGenerationProgress(prev => ({
//                     ...prev,
//                     status: `Generated ${data.name}`,
//                     components: [...prev.components, { 
//                       name: data.name,
//                       path: data.path,
//                       completed: true
//                     }],
//                     currentComponent: prev.currentComponent + 1
//                   }));
//                 } else if (data.type === 'complete') {
//                   generatedCode = data.generatedCode;
//                   explanation = data.explanation;
//                   
//                   // Save the last generated code
//                   setConversationContext(prev => ({
//                     ...prev,
//                     lastGeneratedCode: generatedCode
//                   }));
//                 }
//               } catch (e) {
//                 console.error('Error parsing streaming data:', e);
//               }
//             }
//           }
//         }
//       }
//       
//       setGenerationProgress(prev => ({
//         ...prev,
//         isGenerating: false,
//         isStreaming: false,
//         status: 'Generation complete!',
//         isEdit: prev.isEdit
//       }));
//       
//       if (generatedCode) {
//         addChatMessage('AI recreation generated!', 'system');
//         
//         // Add the explanation to chat if available
//         if (explanation && explanation.trim()) {
//           addChatMessage(explanation, 'ai');
//         }
//         
//         setPromptInput(generatedCode);
//         // Don't show the Generated Code panel by default
//         // setLeftPanelVisible(true);
//         
//         // Wait for sandbox creation if it's still in progress
//         let activeSandboxData = sandboxData;
//         if (sandboxPromise) {
//           addChatMessage('Waiting for sandbox to be ready...', 'system');
//           try {
//             const newSandboxData = await sandboxPromise;
//             if (newSandboxData) {
//               activeSandboxData = newSandboxData;
//             }
//             // Remove the waiting message
//             setChatMessages(prev => prev.filter(msg => msg.content !== 'Waiting for sandbox to be ready...'));
//           } catch (error: any) {
//             addChatMessage('Sandbox creation failed. Cannot apply code.', 'system');
//             throw error;
//           }
//         }
//         
//         // Only apply code if we have sandbox data
//         if (activeSandboxData) {
//           // First application for cloned site should not be in edit mode
//           await applyGeneratedCode(generatedCode, false);
//         }
//         
//         addChatMessage(
//           `Successfully recreated ${url} as a modern React app${homeContextInput ? ` with your requested context: "${homeContextInput}"` : ''}! The scraped content is now in my context, so you can ask me to modify specific sections or add features based on the original site.`, 
//           'ai',
//           {
//             scrapedUrl: url,
//             scrapedContent: scrapeData,
//             generatedCode: generatedCode
//           }
//         );
//         
//         setUrlInput('');
//         setUrlStatus([]);
//         setHomeContextInput('');
//         
//         // Clear generation progress and all screenshot/design states
//         setGenerationProgress(prev => ({
//           ...prev,
//           isGenerating: false,
//           isStreaming: false,
//           status: 'Generation complete!'
//         }));
//         
//         // Clear screenshot and preparing design states to prevent them from showing on next run
//         setUrlScreenshot(null);
//         setIsPreparingDesign(false);
//         setTargetUrl('');
//         setScreenshotError(null);
//         setLoadingStage(null); // Clear loading stage
//         setShowLoadingBackground(false); // Clear loading background
//         
//         setTimeout(() => {
//           // Switch back to preview tab but keep files
//           setActiveTab('preview');
//         }, 1000); // Show completion briefly then switch
//       } else {
//         throw new Error('Failed to generate recreation');
//       }
//       
//     } catch (error: any) {
//       addChatMessage(`Failed to clone website: ${error.message}`, 'system');
//       setUrlStatus([]);
//       setIsPreparingDesign(false);
//       // Clear all states on error
//       setUrlScreenshot(null);
//       setTargetUrl('');
//       setScreenshotError(null);
//       setLoadingStage(null);
//       setGenerationProgress(prev => ({
//         ...prev,
//         isGenerating: false,
//         isStreaming: false,
//         status: '',
//         // Keep files to display in sidebar
//         files: prev.files
//       }));
//       setActiveTab('preview');
//     }
//   };

  const captureUrlScreenshot = async (url: string) => {
    setIsCapturingScreenshot(true);
    setScreenshotError(null);
    try {
      const response = await fetch('/api/scrape-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      const data = await response.json();
      if (data.success && data.screenshot) {
        setIsScreenshotLoaded(false); // Reset loaded state for new screenshot
        setUrlScreenshot(data.screenshot);
        // Set preparing design state
        setIsPreparingDesign(true);
        // Store the clean URL for display
        const cleanUrl = url.replace(/^https?:\/\//i, '');
        setTargetUrl(cleanUrl);
        // Switch to preview tab to show the screenshot
        if (activeTab !== 'preview') {
          setActiveTab('preview');
        }
      } else {
        setScreenshotError(data.error || 'Failed to capture screenshot');
      }
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      setScreenshotError('Network error while capturing screenshot');
    } finally {
      setIsCapturingScreenshot(false);
    }
  };

  const handleHomeScreenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await startGeneration({ url: homeUrlInput, context: homeContextInput, model: aiModel });
  };

  const startGeneration = async (options: { url?: string; context?: string; model?: string } = {}) => {
    const submittedUrl = options.url ?? homeUrlInput;
    const submittedContext = options.context ?? homeContextInput;
    const generationModel = options.model ?? aiModel;

    sessionStorage.removeItem('autoStart');
    sessionStorage.removeItem('targetUrl');
    sessionStorage.removeItem('selectedStyle');
    sessionStorage.removeItem('selectedModel');
    sessionStorage.removeItem('additionalInstructions');

    if (options.url !== undefined) setHomeUrlInput(options.url);
    if (options.context !== undefined) setHomeContextInput(options.context);
    if (options.model !== undefined) setAiModel(options.model);

    // Allow generation from URL or uploaded images
    if (!submittedUrl.trim() && uploadedImages.length === 0) return;
    
    setHomeScreenFading(true);
    
    // Set immediate loading state for better UX
    setIsStartingNewGeneration(true);
    setLoadingStage('gathering');
    
    // Immediately switch to preview tab to show loading
    setActiveTab('preview');
    
    // Set loading background to ensure proper visual feedback
    setShowLoadingBackground(true);
    
    // Clear messages and immediately show the initial message
    setChatMessages([]);
    let displayUrl = submittedUrl.trim();
    if (!displayUrl.match(/^https?:\/\//i)) {
      displayUrl = 'https://' + displayUrl;
    }
    // Remove protocol for cleaner display
    const cleanUrl = displayUrl.replace(/^https?:\/\//i, '');

    // Check if we're in brand extension mode
    const brandExtensionMode = sessionStorage.getItem('brandExtensionMode') === 'true';

    addChatMessage(
      brandExtensionMode
        ? `Analyzing brand from ${cleanUrl}...`
        : `Starting to clone ${cleanUrl}...`,
      'system'
    );
    
    // Start creating sandbox and capturing screenshot immediately in parallel
    const sandboxPromise = !sandboxData ? createSandbox(true) : Promise.resolve(null);
    
    // Set loading stage immediately before hiding home screen
    setLoadingStage('gathering');
    // Also ensure we're on preview tab to show the loading overlay
    setActiveTab('preview');
    
    // Always capture screenshot for new URLs, even if sandbox exists
    // This ensures the loading screen shows properly
    captureUrlScreenshot(displayUrl);
    
    setTimeout(async () => {
      setShowHomeScreen(false);
      setHomeScreenFading(false);
      
      // Clear the starting flag after transition
      setTimeout(() => {
        setIsStartingNewGeneration(false);
      }, 1000);
      
      // Wait for sandbox to be ready (if it's still creating)
      const createdSandbox = await sandboxPromise;
      
      // Now start the clone process which will stream the generation
      setUrlInput(submittedUrl);
      setUrlOverlayVisible(false); // Make sure overlay is closed
      setUrlStatus(['Scraping website content...']);
      
      try {
        // Scrape the website
        let url = submittedUrl.trim();
        if (!url.match(/^https?:\/\//i)) {
          url = 'https://' + url;
        }

        // Check if we're in brand extension mode
        const brandExtensionMode = sessionStorage.getItem('brandExtensionMode') === 'true';
        const brandExtensionPrompt = sessionStorage.getItem('brandExtensionPrompt') || '';

        // Screenshot is already being captured in parallel above

        let scrapeData: ScrapeData | undefined;
        let brandGuidelines: any;

        if (brandExtensionMode) {
          // === BRAND EXTENSION MODE ===
          addChatMessage('Extracting brand styles from the website...', 'system');

          // Call the brand extraction endpoint
          const extractResponse = await fetch('/api/extract-brand-styles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url,
              prompt: brandExtensionPrompt
            })
          });

          if (!extractResponse.ok) {
            throw new Error('Failed to extract brand styles');
          }

          brandGuidelines = await extractResponse.json();

          if (!brandGuidelines.success) {
            throw new Error(brandGuidelines.error || 'Failed to extract brand styles');
          }

          // Display branding summary with visual UI
          addChatMessage(`Acquired branding format from ${cleanUrl}`, 'system', {
            brandingData: brandGuidelines.guidelines,
            sourceUrl: cleanUrl
          });
          addChatMessage(`Building your custom component using these brand guidelines...`, 'system');

          // Clear the flags after use
          sessionStorage.removeItem('brandExtensionMode');
          sessionStorage.removeItem('brandExtensionPrompt');

        } else {
          // === NORMAL CLONE MODE ===
          // Check if we have pre-scraped markdown content from search results
          const storedMarkdown = sessionStorage.getItem('siteMarkdown');
        if (storedMarkdown) {
          // Use the pre-scraped content
          scrapeData = {
            success: true,
            content: storedMarkdown,
            title: new URL(url).hostname,
            source: 'search-result'
          };
          sessionStorage.removeItem('siteMarkdown'); // Clear after use
          addChatMessage('Using cached content from search results...', 'system');
        } else {
          // Perform fresh scraping
          const scrapeResponse = await fetch('/api/scrape-url-enhanced', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
          });
          
          if (!scrapeResponse.ok) {
            throw new Error('Failed to scrape website');
          }
          
          scrapeData = await scrapeResponse.json() as ScrapeData;
          
          if (!scrapeData.success) {
            throw new Error(scrapeData.error || 'Failed to scrape website');
          }
        }
        }

        setUrlStatus(brandExtensionMode ? ['Brand styles extracted!', 'Building your component...'] : ['Website scraped successfully!', 'Generating React app...']);

        // Clear preparing design state and switch to generation tab
        setIsPreparingDesign(false);
        setIsScreenshotLoaded(false); // Reset loaded state
        setUrlScreenshot(null); // Clear screenshot when starting generation
        setTargetUrl(''); // Clear target URL

        // Update loading stage to planning
        setLoadingStage('planning');

        // Brief pause before switching to generation tab
        setTimeout(() => {
          setLoadingStage('generating');
          setActiveTab('generation');
        }, 1500);

        // Build the appropriate prompt based on mode
        let prompt;

        if (brandExtensionMode && brandGuidelines) {
          // === BRAND EXTENSION PROMPT ===
          // Store brand guidelines in conversation context
          setConversationContext(prev => ({
            ...prev,
            scrapedWebsites: [...prev.scrapedWebsites, {
              url: url,
              content: { brandGuidelines },
              timestamp: new Date()
            }],
            currentProject: `Custom build using ${url} brand`
          }));

          // Extract comprehensive brand data
          const branding = brandGuidelines.guidelines;

          // Build detailed brand instruction string
          const brandInstructions = `
BRAND GUIDELINES FROM ${url}:

COLOR SYSTEM:
- Color Scheme: ${branding.colorScheme || 'light'} mode
- Primary Color: ${branding.colors?.primary || 'not specified'}
- Accent Color: ${branding.colors?.accent || 'not specified'}
- Background: ${branding.colors?.background || 'not specified'}
- Text Primary: ${branding.colors?.textPrimary || 'not specified'}
- Link Color: ${branding.colors?.link || 'not specified'}

TYPOGRAPHY:
- Primary Font: ${branding.typography?.fontFamilies?.primary || 'system default'}
- Heading Font: ${branding.typography?.fontFamilies?.heading || 'system default'}
- Font Stack (Body): ${branding.typography?.fontStacks?.body?.join(', ') || 'system-ui, sans-serif'}
- Font Stack (Heading): ${branding.typography?.fontStacks?.heading?.join(', ') || 'system-ui, sans-serif'}
- H1 Size: ${branding.typography?.fontSizes?.h1 || '36px'}
- H2 Size: ${branding.typography?.fontSizes?.h2 || '30px'}
- Body Size: ${branding.typography?.fontSizes?.body || '16px'}

SPACING & LAYOUT:
- Base Spacing Unit: ${branding.spacing?.baseUnit || '4'}px
- Border Radius: ${branding.spacing?.borderRadius || '6px'}

BUTTON STYLES:
Primary Button:
  - Background: ${branding.components?.buttonPrimary?.background || branding.colors?.primary}
  - Text Color: ${branding.components?.buttonPrimary?.textColor || '#FFFFFF'}
  - Border Radius: ${branding.components?.buttonPrimary?.borderRadius || branding.spacing?.borderRadius || '8px'}
  - Shadow: ${branding.components?.buttonPrimary?.shadow || 'none'}

Secondary Button:
  - Background: ${branding.components?.buttonSecondary?.background || '#F9F9F9'}
  - Text Color: ${branding.components?.buttonSecondary?.textColor || branding.colors?.textPrimary}
  - Border Radius: ${branding.components?.buttonSecondary?.borderRadius || branding.spacing?.borderRadius || '8px'}
  - Shadow: ${branding.components?.buttonSecondary?.shadow || 'none'}

INPUT FIELDS:
- Border Color: ${branding.components?.input?.borderColor || '#CCCCCC'}
- Border Radius: ${branding.components?.input?.borderRadius || branding.spacing?.borderRadius || '6px'}

BRAND PERSONALITY:
- Tone: ${branding.personality?.tone || 'professional'}
- Energy: ${branding.personality?.energy || 'medium'}
- Target Audience: ${branding.personality?.targetAudience || 'general'}

DESIGN SYSTEM:
- Framework: ${branding.designSystem?.framework || 'tailwind'}
- Component Library: ${branding.designSystem?.componentLibrary || 'custom'}

ASSETS:
${branding.images?.logo ? `- Logo Available: Yes (use carefully if needed)` : '- Logo: Not available'}
${branding.images?.favicon ? `- Favicon: ${branding.images.favicon}` : ''}`;

          prompt = `I want you to build a NEW React component/application based on these brand guidelines and the user's requirements.

<branding-format source="${url}">
${brandInstructions}

RAW BRAND DATA (for reference):
${JSON.stringify(branding, null, 2)}
</branding-format>

USER'S REQUEST:
${brandExtensionPrompt || 'Build a modern web component using these brand guidelines'}

IMPORTANT: The content above in the <branding-format> tags contains the extracted brand guidelines from ${url}.
Use these guidelines (colors, fonts, spacing, design patterns) to build what the user requested.

CRITICAL REQUIREMENTS:
- DO NOT recreate the original website at ${url}
- DO create a COMPLETELY NEW component that fulfills the user's request
- The user wants: "${brandExtensionPrompt}"
- Build ONLY what the user requested - nothing more
- App.jsx should render ONLY the requested component - no extra Header/Footer/Hero unless specifically requested
- Make it a minimal, focused implementation of the user's request

STYLING REQUIREMENTS:
- Apply the EXACT colors from the brand palette (primary, accent, background, text colors)
- Use the EXACT typography (font families, font sizes for h1, h2, body)
- Apply the spacing system (base unit: ${branding.spacing?.baseUnit || '4'}px)
- Use the specified border radius (${branding.spacing?.borderRadius || '6px'}) consistently
- Implement button styles EXACTLY as specified (colors, shadows, border radius)
- Style input fields with the exact border color and border radius
- Match the brand's ${branding.colorScheme || 'light'} color scheme
- Apply the brand personality: ${branding.personality?.tone || 'professional'} tone with ${branding.personality?.energy || 'medium'} energy
- Use Tailwind CSS with inline color values matching the brand palette EXACTLY
- If fonts need to be imported, add @import or @font-face rules to index.css
- Create custom CSS classes in index.css for complex shadows/effects that can't be done with Tailwind

FONT SETUP:
${branding.typography?.fontFamilies?.primary ? `
- Add font family "${branding.typography.fontFamilies.primary}" to your CSS
- Use font stack: ${branding.typography?.fontStacks?.body?.join(', ') || 'system-ui, sans-serif'}
- Set body font size to ${branding.typography?.fontSizes?.body || '16px'}` : '- Use system fonts'}

COMPONENT STRUCTURE:
- src/index.css - Include brand fonts, custom shadows/effects, and base styling
- src/App.jsx - Should ONLY render the requested component (e.g., just <PricingPage /> if user wants pricing)
- src/components/[RequestedComponent].jsx - The actual component fulfilling the user's request

TECHNICAL REQUIREMENTS:
- Create a WORKING, self-contained application
- DO NOT import components that don't exist
- Make sure the app renders immediately with visible content
- All colors must match the brand palette EXACTLY
- All spacing must use the ${branding.spacing?.baseUnit || '4'}px base unit
- Buttons must have the exact styling specified in the guidelines

Focus on building something NEW, minimal, and functional that perfectly matches the ${brandGuidelines.styleName || 'brand'} aesthetic and design system.`;

        } else {
          // === NORMAL CLONE MODE PROMPT ===
          // Store scraped data in conversation context
          if (!scrapeData) {
            throw new Error('Scrape data is missing');
          }
          setConversationContext(prev => ({
            ...prev,
            scrapedWebsites: [...prev.scrapedWebsites, {
              url: url,
              content: scrapeData,
              timestamp: new Date()
            }],
            currentProject: `${url} Clone`
          }));

          // Filter out style-related context when using screenshot/URL-based generation
          // Only keep user's explicit instructions, not inherited styles
          let filteredContext = submittedContext;
          if (submittedUrl && submittedContext) {
            // Check if the context contains default style names that shouldn't be inherited
            const stylePatterns = [
              'Glassmorphism style design',
              'Neumorphism style design',
              'Brutalism style design',
              'Minimalist style design',
              'Dark Mode style design',
              'Gradient Rich style design',
              '3D Depth style design',
              'Retro Wave style design',
              'Modern clean and minimalist style design',
              'Fun colorful and playful style design',
              'Corporate professional and sleek style design',
              'Creative artistic and unique style design'
            ];

            // If the context exactly matches or starts with a style pattern, filter it out
            const startsWithStyle = stylePatterns.some(pattern =>
              submittedContext.trim().startsWith(pattern)
            );

            if (startsWithStyle) {
              // Extract only the additional instructions part after the style
              const additionalMatch = submittedContext.match(/\. (.+)$/);
              filteredContext = additionalMatch ? additionalMatch[1] : '';
            }
          }

          prompt = `I want to recreate the ${url} website as a complete React application based on the scraped content below.

${JSON.stringify(scrapeData, null, 2)}

${filteredContext ? `ADDITIONAL CONTEXT/REQUIREMENTS FROM USER:
${filteredContext}

Please incorporate these requirements into the design and implementation.` : ''}

IMPORTANT INSTRUCTIONS:
- Create a COMPLETE, working React application
- Implement ALL sections and features from the original site
- Use Tailwind CSS for all styling (no custom CSS files)
- Make it responsive and modern
- Ensure all text content matches the original
- Create proper component structure
- Make sure the app actually renders visible content
- Create ALL components that you reference in imports
${filteredContext ? '- Apply the user\'s context/theme requirements throughout the application' : ''}

Focus on the key sections and content, making it clean and modern.`;
        }

        setGenerationProgress(prev => ({
          isGenerating: true,
          status: 'Initializing AI...',
          components: [],
          currentComponent: 0,
          streamedCode: '',
          isStreaming: true,
          isThinking: false,
          thinkingText: undefined,
          thinkingDuration: undefined,
          // Keep previous files until new ones are generated
          files: prev.files || [],
          currentFile: undefined,
          lastProcessedPosition: 0
        }));
        
        const aiResponse = await fetch('/api/generate-ai-code-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            model: generationModel,
            context: {
              sandboxId: sandboxData?.sandboxId,
              structure: structureContent,
              conversationContext: conversationContext
            },
            uploadedImages: uploadedImages.length > 0 ? uploadedImages : undefined,
            aiImagesEnabled
          })
        });
        
        if (!aiResponse.ok || !aiResponse.body) {
          const errorData = await aiResponse.json().catch(() => null);
          if (errorData?.limitReached) {
            router.push(errorData.upgradeUrl || '/pricing');
          }
          throw new Error(errorData?.error || 'Failed to generate code');
        }
        
        const reader = aiResponse.body.getReader();
        const decoder = new TextDecoder();
        let generatedCode = '';
        let explanation = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'status') {
                  setGenerationProgress(prev => ({ ...prev, status: data.message }));
                } else if (data.type === 'thinking') {
                  setGenerationProgress(prev => ({ 
                    ...prev, 
                    isThinking: true,
                    thinkingText: (prev.thinkingText || '') + data.text
                  }));
                } else if (data.type === 'thinking_complete') {
                  setGenerationProgress(prev => ({ 
                    ...prev, 
                    isThinking: false,
                    thinkingDuration: data.duration
                  }));
                } else if (data.type === 'conversation') {
                  // Add conversational text to chat only if it's not code
                  let text = data.text || '';
                  
                  // Remove package tags from the text
                  text = text.replace(/<package>[^<]*<\/package>/g, '');
                  text = text.replace(/<packages>[^<]*<\/packages>/g, '');
                  
                  // Filter out any XML tags and file content that slipped through
                  if (!text.includes('<file') && !text.includes('import React') && 
                      !text.includes('export default') && !text.includes('className=') &&
                      text.trim().length > 0) {
                    addChatMessage(text.trim(), 'ai');
                  }
                } else if (data.type === 'stream' && data.raw) {
                  setGenerationProgress(prev => {
                    const newStreamedCode = prev.streamedCode + data.text;
                    
                    // Tab is already switched after scraping
                    
                    const updatedState = { 
                      ...prev, 
                      streamedCode: newStreamedCode,
                      isStreaming: true,
                      isThinking: false,
                      status: 'Generating code...'
                    };
                    
                    // Process complete files from the accumulated stream
                    const fileRegex = /<file path="([^"]+)">([^]*?)<\/file>/g;
                    let match;
                    const processedFiles = new Set(prev.files.map(f => f.path));
                    
                    while ((match = fileRegex.exec(newStreamedCode)) !== null) {
                      const filePath = match[1];
                      const fileContent = match[2];
                      
                      // Only add if we haven't processed this file yet
                      if (!processedFiles.has(filePath)) {
                        const fileExt = filePath.split('.').pop() || '';
                        const fileType = fileExt === 'jsx' || fileExt === 'js' ? 'javascript' :
                                        fileExt === 'css' ? 'css' :
                                        fileExt === 'json' ? 'json' :
                                        fileExt === 'html' ? 'html' : 'text';
                        
                        // Check if file already exists
                        const existingFileIndex = updatedState.files.findIndex(f => f.path === filePath);
                        
                        if (existingFileIndex >= 0) {
                          // Update existing file and mark as edited
                          updatedState.files = [
                            ...updatedState.files.slice(0, existingFileIndex),
                            {
                              ...updatedState.files[existingFileIndex],
                              content: fileContent.trim(),
                              type: fileType,
                              completed: true,
                              edited: true
                            },
                            ...updatedState.files.slice(existingFileIndex + 1)
                          ];
                        } else {
                          // Add new file
                          updatedState.files = [...updatedState.files, {
                            path: filePath,
                            content: fileContent.trim(),
                            type: fileType,
                            completed: true,
                            edited: false
                          }];
                        }
                        
                        // Only show file status if not in edit mode
                        if (!prev.isEdit) {
                          updatedState.status = `Completed ${filePath}`;
                        }
                        processedFiles.add(filePath);
                      }
                    }
                    
                    // Check for current file being generated (incomplete file at the end)
                    const lastFileMatch = newStreamedCode.match(/<file path="([^"]+)">([^]*?)$/);
                    if (lastFileMatch && !lastFileMatch[0].includes('</file>')) {
                      const filePath = lastFileMatch[1];
                      const partialContent = lastFileMatch[2];
                      
                      if (!processedFiles.has(filePath)) {
                        const fileExt = filePath.split('.').pop() || '';
                        const fileType = fileExt === 'jsx' || fileExt === 'js' ? 'javascript' :
                                        fileExt === 'css' ? 'css' :
                                        fileExt === 'json' ? 'json' :
                                        fileExt === 'html' ? 'html' : 'text';
                        
                        updatedState.currentFile = { 
                          path: filePath, 
                          content: partialContent, 
                          type: fileType 
                        };
                        // Only show file status if not in edit mode
                        if (!prev.isEdit) {
                          updatedState.status = `Generating ${filePath}`;
                        }
                      }
                    } else {
                      updatedState.currentFile = undefined;
                    }
                    
                    return updatedState;
                  });
                } else if (data.type === 'complete') {
                  generatedCode = data.generatedCode;
                  explanation = data.explanation;
                  
                  // Save the last generated code
                  setConversationContext(prev => ({
                    ...prev,
                    lastGeneratedCode: generatedCode,
                    lastGeneratedImages: uploadedImages.length > 0 ? uploadedImages : prev.lastGeneratedImages
                  }));
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        }
        
        setGenerationProgress(prev => ({
          ...prev,
          isGenerating: false,
          isStreaming: false,
          status: 'Generation complete!'
        }));
        
        if (generatedCode) {
          addChatMessage('AI recreation generated!', 'system');

          const generatedFileMatches = Array.from(generatedCode.matchAll(/<file path="([^"]+)">([^]*?)<\/file>/g));
          const generatedFiles = generatedFileMatches.map(match => ({
            path: match[1],
            content: match[2].trim(),
            type: fileTypeFromPath(match[1]),
            completed: true,
          }));
          const generatedFileCache = filesArrayToCache(generatedFiles);
          if (Object.keys(generatedFileCache).length > 0) {
            setSandboxFiles(generatedFileCache);
            setGenerationProgress(prev => ({
              ...prev,
              files: generatedFiles,
            }));
          }
          
          // Add the explanation to chat if available
          if (explanation && explanation.trim()) {
            addChatMessage(explanation, 'ai');
          }
          
          setPromptInput(generatedCode);

          // Apply the code (first time is not edit mode)
          await applyGeneratedCode(generatedCode, false, undefined, uploadedImages);

          addChatMessage(
            brandExtensionMode
              ? `Successfully built your custom component using ${cleanUrl}'s brand guidelines! You can now ask me to modify it or add more features.`
              : `Successfully recreated ${url} as a modern React app${submittedContext ? ` with your requested context: "${submittedContext}"` : ''}! The scraped content is now in my context, so you can ask me to modify specific sections or add features based on the original site.`,
            'ai',
            {
              scrapedUrl: url,
              scrapedContent: brandExtensionMode ? { brandGuidelines } : scrapeData,
              generatedCode: generatedCode
            }
          );
          
          setConversationContext(prev => ({
            ...prev,
            generatedComponents: [],
            appliedCode: [...prev.appliedCode, {
              files: [],
              timestamp: new Date()
            }]
          }));

          if (sites.length === 0 && !activeSiteId) {
            const suggestion = suggestSiteDetailsFromUrl(cleanUrl);
            setNewSiteName(suggestion.name);
            setNewSiteSlug(suggestion.slug);
            setSiteStatusMessage('Your build is ready. Create a site record to attach it to a live tenant URL.');
          }
        } else {
          throw new Error('Failed to generate recreation');
        }
        
        setUrlInput('');
        setUrlStatus([]);
        setHomeContextInput('');
        
        // Clear generation progress and all screenshot/design states
        setGenerationProgress(prev => ({
          ...prev,
          isGenerating: false,
          isStreaming: false,
          status: 'Generation complete!'
        }));
        
        // Clear screenshot and preparing design states to prevent them from showing on next run
        setIsScreenshotLoaded(false); // Reset loaded state
        setUrlScreenshot(null);
        setIsPreparingDesign(false);
        setTargetUrl('');
        setScreenshotError(null);
        setLoadingStage(null); // Clear loading stage
        setIsStartingNewGeneration(false); // Clear new generation flag
        setShowLoadingBackground(false); // Clear loading background
        
        setTimeout(() => {
          // Switch back to preview tab but keep files
          setActiveTab('preview');
        }, 1000); // Show completion briefly then switch
      } catch (error: any) {
        addChatMessage(`Failed to clone website: ${error.message}`, 'system');
        setUrlStatus([]);
        setIsPreparingDesign(false);
        setIsStartingNewGeneration(false); // Clear new generation flag on error
        setLoadingStage(null);
        // Also clear generation progress on error
        setGenerationProgress(prev => ({
          ...prev,
          isGenerating: false,
          isStreaming: false,
          status: '',
          // Keep files to display in sidebar
          files: prev.files
        }));
      }
    }, 500);
  };


  const ToolbarButton = ({ icon, label, onClick, disabled, href }: { icon: ReactNode; label: string; onClick?: () => void; disabled?: boolean; href?: string }) => {
    const classes = 'inline-flex items-center gap-2 rounded-xl border border-warm-750/12 bg-warm-025 px-2.5 py-2 text-warm-600 transition-colors hover:bg-warm-800/5 hover:text-warm-800 disabled:cursor-not-allowed disabled:opacity-50';
    const content = (
      <>
        <span className='flex items-center justify-center'>{icon}</span>
        <span className='hidden sm:inline text-sm'>{label}</span>
      </>
    );
    if (href) {
      return <Link href={href} className={classes} title={label}>{content}</Link>;
    }
    return <button onClick={onClick} disabled={disabled} className={classes} title={label} type='button'>{content}</button>;
  };
  return (
      <div className="font-sans bg-[var(--bg-primary)] text-foreground h-screen flex flex-col">


      <div className="bg-background-lighter/90 backdrop-blur-xl px-4 py-2 border-b border-border-muted flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 px-2 text-foreground transition-colors hover:text-brand-orange">
            <NoeronLogo iconClassName="h-[28px] w-[28px]" textClassName="text-foreground" />
          </Link>
          <div className="hidden sm:block w-[190px]">
            <BrandSelect
              value={aiModel}
              onChange={(newModel) => {
                setAiModel(newModel);
                const params = new URLSearchParams(searchParams);
                params.set('model', newModel);
                if (sandboxData?.sandboxId) {
                  params.set('sandbox', sandboxData.sandboxId);
                }
                router.push(`/generation?${params.toString()}`);
              }}
              options={appConfig.ai.availableModels.map(model => ({
                value: model,
                label: appConfig.ai.modelDisplayNames?.[model] || model,
              }))}
              className="w-full"
            />
          </div>
          <span className={`hidden sm:inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.active ? 'bg-warm-100 text-warm-800' : 'bg-warm-200 text-warm-600'}`}>
            {status.text}
          </span>
          <div className="hidden sm:block">
            <AiImagesToggle
              enabled={aiImagesEnabled}
              onChange={setAiImagesEnabled}
              canUse={canUseAiImages}
              disabled={loading || generationProgress.isGenerating}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ToolbarButton
            icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>}
            label="New sandbox"
            onClick={() => createSandbox()}
            disabled={loading}
          />
          <ToolbarButton
            icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
            label="Re-apply"
            onClick={reapplyLastGeneration}
            disabled={!conversationContext.lastGeneratedCode || !sandboxData}
          />
          <ToolbarButton
            icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>}
            label="Download ZIP"
            onClick={downloadZip}
            disabled={!sandboxData}
          />
          <ToolbarButton
            icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="My Websites"
            href="/sites"
          />
          <ToolbarButton
            icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            label="Settings"
            href="/settings"
          />
          <ToolbarButton
            icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>}
            label="Sign out"
            onClick={() => signOut({ callbackUrl: '/' })}
          />
        </div>
      </div>

      <div className="border-b border-border-muted bg-warm-025 px-4 py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <BrandSelect
              value={activeSiteId}
              onChange={(siteId) => {
                setActiveSiteId(siteId);
                debouncedSave(sandboxData, chatMessages, siteId);
              }}
              placeholder={sitesLoading ? 'Loading sites...' : sites.length > 0 ? 'Select a site' : 'No sites yet'}
              options={[
                ...(sites.length > 0 ? [{ value: '', label: 'Select a site' }] : []),
                ...sites.map((site) => ({ value: site.id, label: `${site.name} (${site.slug})` })),
              ]}
              className="min-w-[240px]"
              disabled={sitesLoading || sites.length === 0}
            />

            {activeSite ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className={`rounded-full px-2.5 py-1 font-medium ${activeSite.published ? 'bg-warm-100 text-warm-800' : 'bg-warm-200 text-warm-800'}`}>
                  {activeSite.published ? 'Published' : 'Draft'}
                </span>
                <button
                  onClick={copyLiveUrl}
                  className="rounded-full border border-warm-750/12 px-3 py-1.5 text-warm-500 transition-colors hover:bg-warm-800/5 hover:text-warm-800"
                >
                  Copy URL
                </button>
                <Link
                  href={`/site-preview/${activeSite.slug}`}
                  target="_blank"
                  className="rounded-full border border-warm-750/12 px-3 py-1.5 text-warm-500 transition-colors hover:bg-warm-800/5 hover:text-warm-800"
                >
                  Preview Snapshot
                </Link>
              </div>
            ) : (
              <div className="text-sm text-warm-500">
                Create a site record to attach this build to a live tenant URL.
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeSite ? (
              <>
                <button
                  onClick={publishActiveSite}
                  disabled={siteActionLoading !== null || !sandboxData}
                  className="ol-primary-button px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {siteActionLoading === 'publish' ? 'Publishing...' : 'Publish current build'}
                </button>
                <button
                  onClick={unpublishActiveSite}
                  disabled={siteActionLoading !== null || !activeSite.published}
                  className="rounded-full border border-warm-750/12 px-4 py-2 text-sm text-warm-500 transition-colors hover:bg-warm-800/5 hover:text-warm-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {siteActionLoading === 'unpublish' ? 'Unpublishing...' : 'Unpublish'}
                </button>
              </>
            ) : (
              <>
                <input
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  placeholder="Site name"
                  className="rounded-xl border border-warm-750/12 bg-white px-3 py-2 text-sm text-warm-800 placeholder:text-warm-500 transition-colors focus:border-brand-orange focus:outline-none"
                />
                <input
                  value={newSiteSlug}
                  onChange={(e) => setNewSiteSlug(e.target.value.toLowerCase())}
                  placeholder="site-slug"
                  className="rounded-xl border border-warm-750/12 bg-white px-3 py-2 text-sm text-warm-800 placeholder:text-warm-500 transition-colors focus:border-brand-orange focus:outline-none"
                />
                <button
                  onClick={createSite}
                  disabled={siteActionLoading !== null || !newSiteName.trim() || !newSiteSlug.trim()}
                  className="ol-primary-button px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {siteActionLoading === 'create' ? 'Creating...' : 'Create site'}
                </button>
              </>
            )}
          </div>
        </div>

        {activeSite && (
          <p className="mt-2 text-xs text-warm-500">
            Default URL: {activeSite.liveUrl}
            {activeSite.customDomain ? ` • Custom domain: ${activeSite.customDomain}` : ''}
          </p>
        )}
        {!activeSite && newSiteSlug && (
          <p className="mt-2 text-xs text-warm-500">
            Default URL: https://{newSiteSlug}.{process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'mydomain.com'}
          </p>
        )}
        {siteStatusMessage && <p className="mt-2 text-sm text-brand-orange-dark">{siteStatusMessage}</p>}
        {siteError && <p className="mt-2 text-sm text-red-600">{siteError}</p>}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Center Panel - AI Chat (1/3 of remaining width) */}
        <div className="flex-1 max-w-[400px] flex flex-col border-r border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden h-full">
          {/* Scrollable Header Section - constrained height */}
          <div className="flex-shrink-0 overflow-y-auto max-h-[35%] border-b border-[var(--border-default)] scrollbar-thin">
            {/* Sidebar Input Component */}
            {!hasInitialSubmission ? (
              <div className="p-4 border-b border-[var(--border-default)]">
                <SidebarInput
                  onSubmit={(url, style, model, instructions) => {
                    // Mark that we've had an initial submission
                    setHasInitialSubmission(true);

                    // Store the configuration in sessionStorage (same as home page)
                    // Start generation using the existing logic
                    setHomeUrlInput(url);
                    setHomeContextInput(instructions || '');
                    setAiModel(model);
                    setSelectedStyle(style);
                    startGeneration({ url, context: instructions || '', model });
                  }}
                  disabled={loading || generationProgress.isGenerating}
                />
              </div>
            ) : null}

            {conversationContext.scrapedWebsites.length > 0 && (
              <div className="p-4 bg-[var(--bg-secondary)]">
                <div className="flex flex-col gap-4">
                  {conversationContext.scrapedWebsites.map((site, idx) => {
                    // Extract favicon and site info from the scraped data
                    const metadata = site.content?.metadata || {};
                    const sourceURL = metadata.sourceURL || site.url;
                    const favicon = metadata.favicon || `https://www.google.com/s2/favicons?domain=${new URL(sourceURL).hostname}&sz=128`;
                    const siteName = metadata.ogSiteName || metadata.title || new URL(sourceURL).hostname;
                    const screenshot = site.content?.screenshot || sessionStorage.getItem('websiteScreenshot');

                    return (
                      <div key={idx} className="flex flex-col gap-3">
                        {/* Site info with favicon */}
                        <div className="flex items-center gap-3 text-sm">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={favicon}
                            alt={siteName}
                            className="w-10 h-10 rounded"
                            onError={(e) => {
                              e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${new URL(sourceURL).hostname}&sz=128`;
                            }}
                          />
                          <a
                            href={sourceURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-black hover:text-[var(--text-secondary)] truncate max-w-[200px] font-medium text-xs"
                            title={sourceURL}
                          >
                            {siteName}
                          </a>
                        </div>

                        {/* Pinned screenshot - compact */}
                        {screenshot && (
                          <div className="w-full">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-medium text-[var(--text-secondary)]">Screenshot</span>
                              <button
                                onClick={() => setScreenshotCollapsed(!screenshotCollapsed)}
                                className="text-foreground-dimmer hover:text-[var(--text-secondary)] transition-colors p-0.5"
                                aria-label={screenshotCollapsed ? 'Expand screenshot' : 'Collapse screenshot'}
                              >
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 16 16"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                  className={`transition-transform duration-300 ${screenshotCollapsed ? 'rotate-180' : ''}`}
                                >
                                  <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            </div>
                            <div
                              className="w-full rounded overflow-hidden border border-[var(--border-default)] transition-all duration-300"
                              style={{
                                opacity: screenshotCollapsed ? 0 : 1,
                                transform: screenshotCollapsed ? 'translateY(-10px)' : 'translateY(0)',
                                pointerEvents: screenshotCollapsed ? 'none' : 'auto',
                                maxHeight: screenshotCollapsed ? '0' : '120px'
                              }}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={screenshot}
                                alt={`${siteName} preview`}
                                className="w-full h-auto object-cover"
                                style={{ maxHeight: '120px' }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Chat Messages - takes remaining space */}
          <div
            className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 scrollbar-hide min-h-0"
            ref={chatMessagesRef}>
            {chatMessages.map((msg, idx) => {
              // Check if this message is from a successful generation
              const isGenerationComplete = msg.content.includes('Successfully recreated') || 
                                         msg.content.includes('AI recreation generated!') ||
                                         msg.content.includes('Code generated!');
              
              // Get the files from metadata if this is a completion message
              // const completedFiles = msg.metadata?.appliedFiles || [];
              
              return (
                <div key={idx} className="block">
                  <div className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className="block">

                      <div className={`block rounded-xl px-4 py-3 ${
                        msg.type === 'user' ? 'bg-warm-800 text-warm-100 ml-auto max-w-[80%]' :
                        msg.type === 'ai' ? 'bg-white border border-border-muted text-foreground mr-auto max-w-[80%]' :
                        msg.type === 'system' ? 'bg-white border border-border-muted text-foreground text-sm' :
                        msg.type === 'command' ? 'bg-white border border-border-muted text-foreground font-mono text-sm' :
                        msg.type === 'error' ? 'bg-red-50 text-red-800 text-sm border border-red-200' :
                        'bg-white border border-border-muted text-foreground text-sm'
                      }`}>
                    {msg.type === 'command' ? (
                      <div className="flex items-start gap-2">

                        <span className={`text-xs ${
                          msg.metadata?.commandType === 'input' ? 'text-brand-orange' :
                          msg.metadata?.commandType === 'error' ? 'text-red-500' :
                          msg.metadata?.commandType === 'success' ? 'text-green-600' :
                          'text-foreground-dimmer'
                        }`}>
                          {msg.metadata?.commandType === 'input' ? '$' : '>'}
                        </span>
                        <span className="flex-1 whitespace-pre-wrap text-foreground">{msg.content}</span>
                      </div>
                    ) : msg.type === 'error' ? (

                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold mb-1 text-foreground">Build Errors Detected</div>
                          <div className="whitespace-pre-wrap text-sm text-foreground-dimmer">{msg.content}</div>
                          <div className="mt-2 text-xs text-foreground-dimmer">Press 'F' or click the Fix button above to resolve</div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm">{msg.content}</span>
                    )}
                      </div>
                  
                      {/* Show branding data if this is a brand extraction message */}
                      {msg.metadata?.brandingData && (
                        <div className="mt-3 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-primary)] border-2 border-[var(--border-default)] rounded-xl overflow-hidden max-w-[500px] shadow-sm">
                          <div className="bg-warm-800 px-16 py-12">
                            <div className="flex items-center gap-8">
                              <Image
                                src={`https://www.google.com/s2/favicons?domain=${msg.metadata.sourceUrl}&sz=32`}
                                alt=""
                                width={64}
                                height={64}
                                className="w-16 h-16"
                              />
                              <div className="text-sm font-semibold text-warm-100">
                                Brand Guidelines
                              </div>
                            </div>
                          </div>

                          <div className="p-16">
                            {/* Color Scheme Mode */}
                            {msg.metadata.brandingData.colorScheme && (
                              <div className="mb-16">
                                <div className="text-sm">
                                  <span className="text-[var(--text-secondary)] font-medium">Mode:</span>{' '}
                                  <span className="font-semibold text-[var(--text-primary)] capitalize">{msg.metadata.brandingData.colorScheme}</span>
                                </div>
                              </div>
                            )}

                            {/* Colors */}
                            {msg.metadata.brandingData.colors && (
                              <div className="mb-16">
                                <div className="text-sm font-semibold text-[var(--text-primary)] mb-8">Colors</div>
                                <div className="flex flex-wrap gap-12">
                                  {msg.metadata.brandingData.colors.primary && (
                                    <div className="flex items-center gap-8">
                                      <div className="w-32 h-32 rounded border border-[var(--border-default)]" style={{ backgroundColor: msg.metadata.brandingData.colors.primary }} />
                                      <div className="text-sm">
                                        <div className="font-semibold text-[var(--text-primary)]">Primary</div>
                                        <div className="text-[var(--text-secondary)] font-mono text-xs">{msg.metadata.brandingData.colors.primary}</div>
                                      </div>
                                    </div>
                                  )}
                                  {msg.metadata.brandingData.colors.accent && (
                                    <div className="flex items-center gap-8">
                                      <div className="w-32 h-32 rounded border border-[var(--border-default)]" style={{ backgroundColor: msg.metadata.brandingData.colors.accent }} />
                                      <div className="text-sm">
                                        <div className="font-semibold text-[var(--text-primary)]">Accent</div>
                                        <div className="text-[var(--text-secondary)] font-mono text-xs">{msg.metadata.brandingData.colors.accent}</div>
                                      </div>
                                    </div>
                                  )}
                                  {msg.metadata.brandingData.colors.background && (
                                    <div className="flex items-center gap-8">
                                      <div className="w-32 h-32 rounded border border-[var(--border-default)]" style={{ backgroundColor: msg.metadata.brandingData.colors.background }} />
                                      <div className="text-sm">
                                        <div className="font-semibold text-[var(--text-primary)]">Background</div>
                                        <div className="text-[var(--text-secondary)] font-mono text-xs">{msg.metadata.brandingData.colors.background}</div>
                                      </div>
                                    </div>
                                  )}
                                  {msg.metadata.brandingData.colors.textPrimary && (
                                    <div className="flex items-center gap-8">
                                      <div className="w-32 h-32 rounded border border-[var(--border-default)]" style={{ backgroundColor: msg.metadata.brandingData.colors.textPrimary }} />
                                      <div className="text-sm">
                                        <div className="font-semibold text-[var(--text-primary)]">Text</div>
                                        <div className="text-[var(--text-secondary)] font-mono text-xs">{msg.metadata.brandingData.colors.textPrimary}</div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Typography */}
                            {msg.metadata.brandingData.typography && (
                              <div className="mb-16">
                                <div className="text-sm font-semibold text-[var(--text-primary)] mb-8">Typography</div>
                                <div className="grid grid-cols-2 gap-12 text-sm">
                                  {msg.metadata.brandingData.typography.fontFamilies?.primary && (
                                    <div>
                                      <span className="text-[var(--text-secondary)] font-medium">Primary:</span>{' '}
                                      <span className="font-semibold text-[var(--text-primary)]">{msg.metadata.brandingData.typography.fontFamilies.primary}</span>
                                    </div>
                                  )}
                                  {msg.metadata.brandingData.typography.fontFamilies?.heading && (
                                    <div>
                                      <span className="text-[var(--text-secondary)] font-medium">Heading:</span>{' '}
                                      <span className="font-semibold text-[var(--text-primary)]">{msg.metadata.brandingData.typography.fontFamilies.heading}</span>
                                    </div>
                                  )}
                                  {msg.metadata.brandingData.typography.fontSizes?.h1 && (
                                    <div>
                                      <span className="text-[var(--text-secondary)] font-medium">H1 Size:</span>{' '}
                                      <span className="font-semibold text-[var(--text-primary)]">{msg.metadata.brandingData.typography.fontSizes.h1}</span>
                                    </div>
                                  )}
                                  {msg.metadata.brandingData.typography.fontSizes?.h2 && (
                                    <div>
                                      <span className="text-[var(--text-secondary)] font-medium">H2 Size:</span>{' '}
                                      <span className="font-semibold text-[var(--text-primary)]">{msg.metadata.brandingData.typography.fontSizes.h2}</span>
                                    </div>
                                  )}
                                  {msg.metadata.brandingData.typography.fontSizes?.body && (
                                    <div>
                                      <span className="text-[var(--text-secondary)] font-medium">Body Size:</span>{' '}
                                      <span className="font-semibold text-[var(--text-primary)]">{msg.metadata.brandingData.typography.fontSizes.body}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Spacing */}
                            {msg.metadata.brandingData.spacing && (
                              <div className="mb-16">
                                <div className="text-sm font-semibold text-[var(--text-primary)] mb-8">Spacing</div>
                                <div className="flex flex-wrap gap-16 text-sm">
                                  {msg.metadata.brandingData.spacing.baseUnit && (
                                    <div>
                                      <span className="text-[var(--text-secondary)] font-medium">Base Unit:</span>{' '}
                                      <span className="font-semibold text-[var(--text-primary)]">{msg.metadata.brandingData.spacing.baseUnit}px</span>
                                    </div>
                                  )}
                                  {msg.metadata.brandingData.spacing.borderRadius && (
                                    <div>
                                      <span className="text-[var(--text-secondary)] font-medium">Border Radius:</span>{' '}
                                      <span className="font-semibold text-[var(--text-primary)]">{msg.metadata.brandingData.spacing.borderRadius}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Button Styles */}
                            {msg.metadata.brandingData.components?.buttonPrimary && (
                              <div className="mb-16">
                                <div className="text-sm font-semibold text-[var(--text-primary)] mb-8">Button Styles</div>
                                <div className="flex flex-wrap gap-12">
                                  <div>
                                    <div className="text-xs text-[var(--text-secondary)] mb-6 font-medium">Primary Button</div>
                                    <button
                                      className="px-16 py-8 text-sm font-medium"
                                      style={{
                                        backgroundColor: msg.metadata.brandingData.components.buttonPrimary.background,
                                        color: msg.metadata.brandingData.components.buttonPrimary.textColor,
                                        borderRadius: msg.metadata.brandingData.components.buttonPrimary.borderRadius,
                                        boxShadow: msg.metadata.brandingData.components.buttonPrimary.shadow
                                      }}
                                    >
                                      Sample Button
                                    </button>
                                  </div>
                                  {msg.metadata.brandingData.components?.buttonSecondary && (
                                    <div>
                                      <div className="text-xs text-[var(--text-secondary)] mb-6 font-medium">Secondary Button</div>
                                      <button
                                        className="px-16 py-8 text-sm font-medium"
                                        style={{
                                          backgroundColor: msg.metadata.brandingData.components.buttonSecondary.background,
                                          color: msg.metadata.brandingData.components.buttonSecondary.textColor,
                                          borderRadius: msg.metadata.brandingData.components.buttonSecondary.borderRadius,
                                          boxShadow: msg.metadata.brandingData.components.buttonSecondary.shadow
                                        }}
                                      >
                                        Sample Button
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Personality */}
                            {msg.metadata.brandingData.personality && (
                              <div className="text-sm">
                                <span className="text-[var(--text-secondary)] font-medium">Personality:</span>{' '}
                                <span className="font-semibold text-[var(--text-primary)] capitalize">
                                  {msg.metadata.brandingData.personality.tone} tone, {msg.metadata.brandingData.personality.energy} energy
                                </span>
                              </div>
                            )}

                            {/* Target Audience */}
                            {msg.metadata.brandingData.personality?.targetAudience && (
                              <div className="text-sm mt-8">
                                <span className="text-[var(--text-secondary)] font-medium">Target:</span>{' '}
                                <span className="text-[var(--text-primary)]">{msg.metadata.brandingData.personality.targetAudience}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Show applied files if this is an apply success message */}
                      {msg.metadata?.appliedFiles && msg.metadata.appliedFiles.length > 0 && (
                    <div className="mt-3 inline-block bg-[var(--bg-secondary)] rounded-[10px] p-5">
                      <div className="text-sm font-medium mb-3 text-[var(--text-secondary)]">
                        {msg.content.includes('Applied') ? 'Files Updated:' : 'Generated Files:'}
                      </div>
                      <div className="flex flex-wrap items-start gap-2">
                        {msg.metadata.appliedFiles.map((filePath, fileIdx) => {
                          const fileName = filePath.split('/').pop() || filePath;
                          const fileExt = fileName.split('.').pop() || '';
                          const fileType = fileExt === 'jsx' || fileExt === 'js' ? 'javascript' :
                                          fileExt === 'css' ? 'css' :
                                          fileExt === 'json' ? 'json' : 'text';

                          return (
                            <div
                              key={`applied-${fileIdx}`}
                              className="inline-flex items-center gap-1.5 px-6 py-1.5 bg-warm-800 text-warm-100 rounded-[10px] text-sm animate-fade-in-up"
                              style={{ animationDelay: `${fileIdx * 30}ms` }}
                            >
                              <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                                fileType === 'css' ? 'bg-blue-400' :
                                fileType === 'javascript' ? 'bg-yellow-400' :
                                fileType === 'json' ? 'bg-green-400' :
                                'bg-gray-400'
                              }`} />
                              {fileName}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                      {/* Show generated files for completion messages - but only if no appliedFiles already shown */}
                      {isGenerationComplete && generationProgress.files.length > 0 && idx === chatMessages.length - 1 && !msg.metadata?.appliedFiles && !chatMessages.some(m => m.metadata?.appliedFiles) && (
                    <div className="mt-2 inline-block bg-[var(--bg-secondary)] rounded-[10px] p-3">
                      <div className="text-xs font-medium mb-1 text-[var(--text-secondary)]">Generated Files:</div>
                      <div className="flex flex-wrap items-start gap-1">
                        {generationProgress.files.map((file, fileIdx) => (
                          <div
                            key={`complete-${fileIdx}`}
                            className="inline-flex items-center gap-1.5 px-6 py-1.5 bg-warm-800 text-warm-100 rounded-[10px] text-xs animate-fade-in-up"
                            style={{ animationDelay: `${fileIdx * 30}ms` }}
                          >
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                              file.type === 'css' ? 'bg-blue-400' :
                              file.type === 'javascript' ? 'bg-yellow-400' :
                              file.type === 'json' ? 'bg-green-400' :
                              'bg-gray-400'
                            }`} />
                            {file.path.split('/').pop()}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                    </div>
                    </div>
                  </div>
              );
            })}
            
            {/* Code application progress */}
            {codeApplicationState.stage && (
              <CodeApplicationProgress state={codeApplicationState} />
            )}
            
            {/* File generation progress - inline display (during generation) */}
            {generationProgress.isGenerating && (
              <div className="inline-block bg-[var(--bg-secondary)] rounded-lg p-3">
                <div className="text-sm font-medium mb-2 text-[var(--text-secondary)]">
                  {generationProgress.status}
                </div>
                <div className="flex flex-wrap items-start gap-1">
                  {/* Show completed files */}
                  {generationProgress.files.map((file, idx) => (
                    <div
                      key={`file-${idx}`}
                      className="inline-flex items-center gap-1.5 px-6 py-1.5 bg-warm-800 text-warm-100 rounded-[10px] text-xs animate-fade-in-up"
                      style={{ animationDelay: `${idx * 30}ms` }}
                    >
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                      {file.path.split('/').pop()}
                    </div>
                  ))}
                  
                  {/* Show current file being generated */}
                  {generationProgress.currentFile && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-warm-800/70 text-warm-100 rounded-[10px] text-sm animate-pulse"
                      style={{ animationDelay: `${generationProgress.files.length * 30}ms` }}>
                      <div className="w-16 h-16 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {generationProgress.currentFile.path.split('/').pop()}
                    </div>
                  )}
                </div>
                
                {/* Live streaming response display */}
                {generationProgress.streamedCode && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-3 border-t border-[var(--border-default)] pt-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-xs font-medium text-[var(--text-secondary)]">AI Response Stream</span>
                      </div>
                      <div className="flex-1 h-px bg-gradient-to-r from-gray-300 to-transparent" />
                    </div>
                    <div className="bg-warm-900 border border-warm-750/20 rounded-xl overflow-hidden max-h-128 overflow-y-auto scrollbar-hide">
                      <SyntaxHighlighter
                        language="jsx"
                        style={vscDarkPlus}
                        customStyle={{
                          margin: 0,
                          padding: '0.75rem',
                          fontSize: '11px',
                          lineHeight: '1.5',
                          background: 'transparent',
                          maxHeight: '8rem',
                          overflow: 'hidden'
                        }}
                      >
                        {(() => {
                          const lastContent = generationProgress.streamedCode.slice(-1000);
                          // Show the last part of the stream, starting from a complete tag if possible
                          const startIndex = lastContent.indexOf('<');
                          return startIndex !== -1 ? lastContent.slice(startIndex) : lastContent;
                        })()}
                      </SyntaxHighlighter>
                      <span className="inline-block w-3 h-4 bg-orange-400 ml-3 mb-3 animate-pulse" />
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          {/* Input Area - fixed at bottom */}
          <div className="flex-shrink-0 p-4 border-t border-[var(--border-default)] bg-[var(--bg-primary)] max-h-[40%] overflow-y-auto">
            <HeroInput
              value={aiChatInput}
              onChange={setAiChatInput}
              onSubmit={sendChatMessage}
              placeholder="Describe what you want to build..."
              showSearchFeatures={false}
              onImageUpload={(images) => setChatUploadedImages(images || [])}
              maxImages={MAX_CHAT_UPLOAD_IMAGES}
            />
          </div>
        </div>

        {/* Right Panel - Preview or Generation (2/3 of remaining width) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-3 pt-4 pb-4 bg-[var(--bg-primary)] border-b border-[var(--border-default)] flex justify-between items-center">
            <div className="flex items-center gap-2">
              {/* Toggle-style Code/View switcher */}

              <div className="inline-flex bg-warm-100 border border-warm-750/12 rounded-xl p-1">
                <button
                  onClick={() => setActiveTab('generation')}
                  className={`px-3 py-1.5 rounded-lg transition-all text-xs font-medium ${
                    activeTab === 'generation'
                      ? 'bg-white text-warm-800 shadow-sm'
                      : 'text-warm-500 hover:text-warm-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <span>Code</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-3 py-1.5 rounded-lg transition-all text-xs font-medium ${
                    activeTab === 'preview'
                      ? 'bg-white text-warm-800 shadow-sm'
                      : 'text-warm-500 hover:text-warm-800'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>View</span>
                  </div>
                </button>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              {/* Files generated count */}
              {activeTab === 'generation' && !generationProgress.isEdit && generationProgress.files.length > 0 && (
                <div className="text-foreground-dimmer text-xs font-medium">
                  {generationProgress.files.length} files generated
                </div>
              )}
              
              {/* Live Code Generation Status */}
              {activeTab === 'generation' && generationProgress.isGenerating && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-md text-xs font-medium text-[var(--text-secondary)]">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  {generationProgress.isEdit ? 'Editing code' : 'Live generation'}
                </div>
              )}
              
              {/* Sandbox Status Indicator */}
              {sandboxData && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-md text-xs font-medium text-[var(--text-secondary)]">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Sandbox active
                </div>
              )}
              
              {/* Open in new tab button */}
              {sandboxData && (
                <a
                  href={sandboxData.previewUrl || sandboxData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open in new tab"
                  className="p-1.5 rounded-md transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          </div>
          <div className="flex-1 relative overflow-hidden">
            {renderMainContent()}
          </div>
        </div>
      </div>




    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <AISandboxPage />
    </Suspense>
  );
}
