import type { VpsFileWrite } from './types';

export function getViteTemplate(): VpsFileWrite[] {
  const packageJson = {
    name: 'sandbox-app',
    version: '1.0.0',
    type: 'module',
    scripts: {
      dev: 'vite --host 0.0.0.0 --port 3000',
      build: 'vite build',
      preview: 'vite preview'
    },
    dependencies: {
      react: '^18.2.0',
      'react-dom': '^18.2.0'
    },
    devDependencies: {
      '@vitejs/plugin-react': '^4.0.0',
      vite: '^4.3.9'
    }
  };

  const files: VpsFileWrite[] = [
    {
      path: 'package.json',
      content: Buffer.from(JSON.stringify(packageJson, null, 2)).toString('base64'),
      encoding: 'base64'
    },
    {
      path: 'vite.config.js',
      content: Buffer.from(`import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    allowedHosts: ['.localhost', '127.0.0.1', '0.0.0.0', '::1']
  }
})`).toString('base64'),
      encoding: 'base64'
    },
    {
      path: 'index.html',
      content: Buffer.from(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Sandbox App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`).toString('base64'),
      encoding: 'base64'
    },
    {
      path: 'src/main.jsx',
      content: Buffer.from(`import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`).toString('base64'),
      encoding: 'base64'
    },
    {
      path: 'src/App.jsx',
      content: Buffer.from(`function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111827', color: '#fff' }}>
      <div style={{ textAlign: 'center' }}>
        <h1>Sandbox Ready</h1>
        <p>Start building your React app with Vite.</p>
      </div>
    </div>
  )
}

export default App`).toString('base64'),
      encoding: 'base64'
    },
    {
      path: 'src/index.css',
      content: Buffer.from(`body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  background-color: rgb(17 24 39);
  color: #fff;
}`).toString('base64'),
      encoding: 'base64'
    }
  ];

  return files;
}
