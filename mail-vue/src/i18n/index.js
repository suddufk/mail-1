import { createI18n } from 'vue-i18n';
import en from './en.js'
import zh from './zh.js'
import {getInitialLanguage} from "@/i18n/language.js";

const i18n = createI18n({
    legacy: false,
    locale: getInitialLanguage(),
    fallbackLocale: 'en',
    messages: {
        'zh-cn': zh,
        'en': en
    },
});

export default i18n;
