import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';

i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'ja',
    debug: true,
    interpolation: {
      escapeValue: false,
    },
    resources: {
      ja: {
        translation: {
          "history": "履歴",
          "user": "ユーザー",
          "assistant": "アシスタント",
          "send": "送信",
          "close": "閉じる"
        }
      },
      en: {
        translation: {
          "history": "History",
          "user": "User",
          "assistant": "Assistant",
          "send": "Send",
          "close": "Close"
        }
      }
    }
  });

export default i18n;