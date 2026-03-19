import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Import translations
import enMessages from '../lang/en.json';
import frMessages from '../lang/fr.json';
import kirMessages from '../lang/kir.json';

export const messages = {
  en: enMessages,
  fr: frMessages,
  kir: kirMessages
};

type LocaleContextType = {
  locale: string;
  setLocale: (lang: string) => void;
  currentMessages: Record<string, string>;
};

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<string>(() => {
    const stored = localStorage.getItem('app-locale');
    return (stored && stored in messages) ? stored : 'fr';
  });

  const setLocale = (lang: string) => {
    if (lang in messages) {
      setLocaleState(lang);
      localStorage.setItem('app-locale', lang);
    }
  };

  const currentMessages = (messages as any)[locale] || messages.fr;

  return (
    <LocaleContext.Provider value={{ locale, setLocale, currentMessages }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocaleContext() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocaleContext must be used within a LocaleProvider');
  }
  return context;
}
