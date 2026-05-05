import {useUserStore} from "@/store/user.js";
import {useSettingStore} from "@/store/setting.js";
import {useAccountStore} from "@/store/account.js";
import {loginUserInfo} from "@/request/my.js";
import {permsToRouter} from "@/perm/perm.js";
import router from "@/router";
import {websiteConfig} from "@/request/setting.js";
import i18n from "@/i18n/index.js";
import {getInitialLanguage, normalizeLanguage} from "@/i18n/language.js";
import {setExtend} from "@/utils/day.js";

export async function init() {
    document.title = '\u200B'

    const settingStore = useSettingStore();
    const userStore = useUserStore();
    const accountStore = useAccountStore();

    const token = localStorage.getItem('token');
    const lang = normalizeLanguage(settingStore.lang) || getInitialLanguage()
    settingStore.lang = lang
    i18n.global.locale.value = lang
    setExtend(lang)
    document.documentElement.lang = lang

    let setting = null;

    if (token) {
        const userPromise = loginUserInfo().catch(e => {
            console.error(e);
            return null;
        });

        const [s, user] = await Promise.all([websiteConfig(), userPromise]);
        setting = s;
        settingStore.settings = setting;
        settingStore.domainList = setting.domainList;
        document.title = setting.title;

        if (user) {
            accountStore.currentAccountId = user.account.accountId;
            accountStore.currentAccount = user.account;
            userStore.user = user;

            const routers = permsToRouter(user.permKeys);
            routers.forEach(routerData => {
                router.addRoute('layout', routerData);
            });
        }

    } else {
        setting = await websiteConfig();
        settingStore.settings = setting;
        settingStore.domainList = setting.domainList;
        document.title = setting.title;
    }

    removeLoading();
}

function removeLoading() {
    if (window.innerWidth < 1025) {
        document.documentElement.style.setProperty('--loading-hide-transition', 'none')
    }
    const doc = document.getElementById('loading-first');
    doc.classList.add('loading-hide')
    setTimeout(() => {
        doc.remove()
    },1000)
}

