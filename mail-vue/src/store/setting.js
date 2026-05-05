import { defineStore } from 'pinia'
import {getInitialLanguage, normalizeLanguage, saveStoredLanguage} from "@/i18n/language.js";

export const useSettingStore = defineStore('setting', {
    state: () => ({
        domainList: [],
        settings: {
            r2Domain: '',
            loginOpacity: 1.00,
        },
        lang: getInitialLanguage(),
    }),
    actions: {
        setLang(lang) {
            const normalizedLang = normalizeLanguage(lang) || getInitialLanguage()
            this.lang = normalizedLang
            saveStoredLanguage(normalizedLang)
        }
    }
})
