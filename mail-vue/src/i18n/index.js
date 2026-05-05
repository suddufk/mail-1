import { createI18n } from 'vue-i18n';
import en from './en.js'
import zh from './zh.js'

const i18n = createI18n({
    legacy: false,
    locale: 'zh',          // <--- 添加这一行，强制默认使用中文
    fallbackLocale: 'en',  // <--- 建议添加这一行，如果中文包里没翻译，就找英文补位
    messages: {
        zh,
        en
    },
});

export default i18n;
