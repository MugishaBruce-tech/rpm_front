import { createRoot } from "react-dom/client";
import { IntlProvider } from "react-intl";
import App from "./app/App.tsx";
import "./styles/index.css";

// Import translations
import en from "./app/lang/en.json";
import fr from "./app/lang/fr.json";
import kir from "./app/lang/kir.json";

const messages = {
  en,
  fr,
  kir
};

// Detect language
const locale = localStorage.getItem('app-locale') || navigator.language.split(/[-_]/)[0] || 'fr';
const validLocale = (locale in messages) ? locale : 'fr';

createRoot(document.getElementById("root")!).render(
  <IntlProvider messages={(messages as any)[validLocale]} locale={validLocale} defaultLocale="fr">
    <App />
  </IntlProvider>
);
