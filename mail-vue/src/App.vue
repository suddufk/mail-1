<template>
  <el-config-provider :locale="elementLocale">
    <router-view />
  </el-config-provider>
</template>
<script setup>
import { useI18n } from "vue-i18n";
import { computed, watch } from "vue";
import {useSettingStore} from "@/store/setting.js";
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import en from 'element-plus/es/locale/lang/en';
import {setExtend} from "@/utils/day.js";

const settingStore = useSettingStore()
const { locale } = useI18n()

const elementLocale = computed(() => settingStore.lang === 'zh-cn' ? zhCn : en)

watch(() => settingStore.lang, (lang) => {
  locale.value = lang
  setExtend(lang)
  document.documentElement.lang = lang
}, { immediate: true })

import('@/icons/index.js')
</script>
