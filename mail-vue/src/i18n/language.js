export const LANGUAGE_STORAGE_KEY = 'cloud_mail_lang'

export const SUPPORT_LANGUAGES = ['zh-cn', 'en']

export function normalizeLanguage(lang) {
    if (!lang || typeof lang !== 'string') return ''

    const value = lang.toLowerCase().replace('_', '-')

    if (value === 'zh' || value.startsWith('zh-')) {
        return 'zh-cn'
    }

    if (value === 'en' || value.startsWith('en-')) {
        return 'en'
    }

    return ''
}

export function getStoredLanguage() {
    try {
        return normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY))
    } catch {
        return ''
    }
}

export function saveStoredLanguage(lang) {
    const normalizedLang = normalizeLanguage(lang)

    if (!normalizedLang) return ''

    try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizedLang)
    } catch {
        return ''
    }

    return normalizedLang
}

export function getSystemLanguage() {
    if (typeof navigator === 'undefined') return 'en'

    const languages = navigator.languages?.length ? navigator.languages : [navigator.language]

    for (const lang of languages) {
        const normalizedLang = normalizeLanguage(lang)
        if (normalizedLang) return normalizedLang
    }

    return 'en'
}

export function getInitialLanguage() {
    return getStoredLanguage() || getSystemLanguage()
}
