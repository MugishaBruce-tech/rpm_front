import { createRoot } from "react-dom/client";
import { IntlProvider } from "react-intl";
import App from "./app/App.tsx";
import { LocaleProvider, useLocaleContext, messages } from "./app/contexts/LocaleContext.tsx";
import "./styles/index.css";
import { registerSW } from 'virtual:pwa-register';
import { initSync } from './app/services/syncQueue';
import { apiRequest } from './app/services/api';

// Initialize sync listener
initSync(apiRequest);

// Register the service worker
const updateSW = registerSW({
  onNeedRefresh() {
    // Optionally prompt the user to refresh
    if (confirm('New content available. Reload?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  },
});

// Wrapper component that accesses the locale context
function AppWithIntl() {
  const { locale, currentMessages } = useLocaleContext();
  
  return (
    <IntlProvider 
      key={locale}
      messages={currentMessages} 
      locale={locale} 
      defaultLocale="fr"
    >
      <App />
    </IntlProvider>
  );
}

const root = createRoot(document.getElementById("root")!);

root.render(
  <LocaleProvider>
    <AppWithIntl />
  </LocaleProvider>
);
