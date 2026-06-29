// Global types for sandbox file management

export interface SandboxFile {
  content: string;
  lastModified: number;
}

export interface SandboxFileCache {
  files: Record<string, SandboxFile>;
  lastSync: number;
  sandboxId: string;
  manifest?: any; // FileManifest type from file-manifest.ts
}

export interface SandboxState {
  fileCache: SandboxFileCache | null;
  sandbox: any; // E2B sandbox instance
  sandboxData: {
    sandboxId: string;
    url: string;
  } | null;
}

// Map-based global state for multi-sandbox support
interface SandboxStateMap {
  sandboxes: Map<string, SandboxState>;
  activeSandboxIds: Map<string, string>; // userId -> active sandboxId
}

// Declare global types - legacy singletons for backward compat
declare global {
  var activeSandbox: any;
  var sandboxState: SandboxState;
  var existingFiles: Set<string>;
  // New multi-sandbox aware state
  var sandboxStateMap: Map<string, SandboxState>; // sandboxId -> state
  var activeSandboxMap: Map<string, any>; // sandboxId -> provider
}

export {};