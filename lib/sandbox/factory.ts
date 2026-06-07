import { SandboxProvider, SandboxProviderConfig } from './types';

export class SandboxFactory {
  static async create(provider?: string, config?: SandboxProviderConfig): Promise<SandboxProvider> {
    // Use environment variable if provider not specified
    const selectedProvider = provider || process.env.SANDBOX_PROVIDER || 'vercel';

    switch (selectedProvider.toLowerCase()) {
      case 'e2b': {
        const { E2BProvider } = await import('./providers/e2b-provider');
        return new E2BProvider(config || {});
      }

      case 'vercel': {
        const { VercelProvider } = await import('./providers/vercel-provider');
        return new VercelProvider(config || {});
      }

      default:
        throw new Error(`Unknown sandbox provider: ${selectedProvider}. Supported providers: e2b, vercel`);
    }
  }
  
  static getAvailableProviders(): string[] {
    return ['e2b', 'vercel'];
  }
  
  static isProviderAvailable(provider: string): boolean {
    switch (provider.toLowerCase()) {
      case 'e2b':
        return !!process.env.E2B_API_KEY;
      
      case 'vercel':
        // Vercel can use OIDC (automatic) or PAT
        return hasUsableVercelOidcToken() ||
               (!!process.env.VERCEL_TOKEN && !!process.env.VERCEL_TEAM_ID && !!process.env.VERCEL_PROJECT_ID);
      
      default:
        return false;
    }
  }
}

function hasUsableVercelOidcToken(): boolean {
  const token = process.env.VERCEL_OIDC_TOKEN;
  return !!token && token !== 'auto_generated_by_vercel_env_pull';
}
