/**
 * Vite App Templates
 * Shared templates for setting up Vite React applications in sandboxes
 */

import { appConfig } from '@/config/app.config';

export interface ViteAppFiles {
  'package.json': string;
  'vite.config.js': string;
  'tailwind.config.js': string;
  'postcss.config.js': string;
  'index.html': string;
  'src/main.tsx': string;
  'src/App.tsx': string;
  'src/index.css': string;
}

/**
 * Get the port based on provider
 */
export function getVitePort(provider: 'vercel' | 'e2b'): number {
  return provider === 'vercel'
    ? appConfig.vercelSandbox.devPort
    : appConfig.e2b.vitePort;
}

/**
 * Get file templates for Vite React app setup
 */
export function getViteAppTemplates(provider: 'vercel' | 'e2b'): ViteAppFiles {
  const port = getVitePort(provider);
  const isVercel = provider === 'vercel';

  const packageJson = {
    name: "sandbox-app",
    version: "1.0.0",
    type: "module",
    scripts: {
      dev: isVercel
        ? `vite --host --port ${port}`
        : "vite --host",
      build: "vite build",
      preview: "vite preview"
    },
    dependencies: {
      react: "^18.2.0",
      "react-dom": "^18.2.0",
      "lucide-react": "^0.400.0"
    },
    devDependencies: {
      "@vitejs/plugin-react": "^4.0.0",
      vite: "^4.3.9",
      tailwindcss: "^3.3.0",
      postcss: "^8.4.31",
      autoprefixer: "^10.4.16"
    }
  };

  const viteConfig = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: ${port},
    strictPort: true,
    allowedHosts: [
      '.vercel.run',
      '.e2b.dev',
      '.e2b.app',
      'localhost',
      '127.0.0.1'
    ],
    ${isVercel ? `hmr: {
      clientPort: 443,
      protocol: 'wss'
    },` : 'hmr: false,'}
  }
})`;

  const tailwindConfig = `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`;

  const postcssConfig = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;

  const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sandbox App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

  const mainTsx = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`;

  const appTsx = `function App(): JSX.Element {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="text-center max-w-2xl">
        <p className="text-lg text-gray-400">
          Sandbox Ready<br/>
          Start building your React app with Vite and Tailwind CSS!
        </p>
      </div>
    </div>
  )
}

export default App`;

  const indexCss = `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background-color: rgb(17 24 39);
}`;

  return {
    'package.json': JSON.stringify(packageJson, null, 2),
    'vite.config.js': viteConfig,
    'tailwind.config.js': tailwindConfig,
    'postcss.config.js': postcssConfig,
    'index.html': indexHtml,
    'src/main.tsx': mainTsx,
    'src/App.tsx': appTsx,
    'src/index.css': indexCss,
  };
}

/**
 * Get list of initial file paths for tracking
 */
export function getInitialFilePaths(): string[] {
  return [
    'src/App.tsx',
    'src/main.tsx',
    'src/index.css',
    'index.html',
    'package.json',
    'vite.config.js',
    'tailwind.config.js',
    'postcss.config.js',
  ];
}
