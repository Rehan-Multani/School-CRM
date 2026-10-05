import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ErrorBoundary } from './shared/components/ErrorBoundary.jsx'
import { installFatalErrorHandlers } from './shared/utils/fatalErrorScreen.js'
import { fetchPlatformConfig, applyPlatformFavicon } from './shared/platformBrand'
import { getSharedTheme } from './shared/theme/themeSync'

installFatalErrorHandlers()

// Apply active theme immediately before React renders to prevent flash
if (getSharedTheme()) {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

// Swap the tab favicon to the Super Admin–set platform logo, if any.
fetchPlatformConfig().then((c) => c?.logoUrl && applyPlatformFavicon(c.logoUrl))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
