import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/lib/i18n/en.json';
import fil from '@/lib/i18n/fil.json';

/** English first, Filipino second. */
export const resources = {
  en: { translation: en },
  fil: { translation: fil },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export { i18n };
