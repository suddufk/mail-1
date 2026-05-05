<template>
  <div class="header" :class="!hasPerm('email:send') ? 'not-send' : ''">
    <div class="header-btn">
      <hanburger @click="changeAside"></hanburger>
      <span class="breadcrumb-item">{{$t(route.meta.title)}}</span>
    </div>
    <div v-perm="'email:send'" class="writer-box" @click="openSend">
      <div class="writer">
        <Icon icon="material-symbols:edit-outline-sharp" width="22" height="22" />
      </div>
    </div>
    <div class="toolbar">
      <div v-if="uiStore.dark" class="sun-icon icon-item" @click="openDark($event)">
        <Icon icon="mingcute:sun-fill" />
      </div>
      <div v-else class="dark-icon icon-item" @click="openDark($event)">
        <Icon icon="solar:moon-linear" />
      </div>

      <el-dropdown @command="handleLanguageSwitch" trigger="click">
        <div class="icon-item" style="cursor: pointer; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 14px; font-weight: bold;">
            {{ locale === 'zh' ? '中' : 'En' }}
          </span>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="zh">简体中文</el-dropdown-item>
            <el-dropdown-item command="en">English</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <div class="notice icon-item" @click="openNotice">
        <Icon icon="streamline-plump:announcement-megaphone" />
      </div>

      <el-dropdown ref="userinfoRef" @visible-change="e => userInfoShow = e" :teleported="false" popper-class="detail-dropdown">
        <div class="avatar" @click="userInfoHide">
          <div class="avatar-text">
            <div>{{formatName(userStore.user.email)}}</div>
          </div>
          <Icon class="setting-icon" icon="mingcute:down-small-fill" width="24" height="24" />
        </div>
        <template #dropdown>
          <div class="user-details">
            <div class="details-avatar">
              {{formatName(userStore.user.email)}}
            </div>
            <div class="user-name">
              {{ userStore.user.name }}
            </div>
            <div class="detail-email" @click="copyEmail(userStore.user.email)">
              {{ userStore.user.email }}
            </div>
            <div class="detail-user-type">
              <el-tag>{{ userStore.user.role.name }}</el-tag>
            </div>
            <div class="action-info">
              <div>
                <span style="margin-right: 10px">{{$t('sendCount')}}</span>
                <span style="margin-right: 10px">{{$t('accountCount')}}</span>
              </div>
              <div>
                <div>
                  <span v-if="sendCount" style="margin-right: 5px">{{ sendCount }}</span>
                  <el-tag v-if="!hasPerm('email:send')">{{ sendType }}</el-tag>
                  <el-tag v-else>{{ sendType }}</el-tag>
                </div>
                <div>
                  <el-tag v-if="settingStore.settings.manyEmail || settingStore.settings.addEmail">{{$t('disabled')}}</el-tag>
                  <span v-else-if="accountCount && hasPerm('account:add')" style="margin-right: 5px">{{$t('totalUserAccount', {msg: accountCount})}}</span>
                  <el-tag v-else-if="!accountCount && hasPerm('account:add')">{{$t('unlimited')}}</el-tag>
                  <el-tag v-else-if="!hasPerm('account:add')">{{$t('unauthorized')}}</el-tag>
                </div>
              </div>
            </div>
            <div class="logout">
              <el-button type="primary" :loading="logoutLoading" @click="clickLogout">{{$t('logOut')}}</el-button>
            </div>
          </div>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup>
import router from "@/router";
import hanburger from '@/components/hamburger/index.vue'
import {logout} from "@/request/login.js";
import {Icon} from "@iconify/vue";
import {useUiStore} from "@/store/ui.js";
import {useUserStore} from "@/store/user.js";
import {useRoute} from "vue-router";
import {computed, ref, onMounted} from "vue";
import {useSettingStore} from "@/store/setting.js";
import {useI18n} from 'vue-i18n'; // 引入 i18n
import { ElMessage } from 'element-plus'

const { locale } = useI18n();
const uiStore = useUiStore();
const userStore = useUserStore();
const settingStore = useSettingStore();
const route = useRoute();
const userinfoRef = ref(null);
const userInfoShow = ref(false);
const logoutLoading = ref(false);

const hasPerm = (perm) => {
  return userStore.user.role.permissions.some(p => p.identification === perm);
}

const sendCount = computed(() => {
  return userStore.user.sendCount;
})

const sendType = computed(() => {
  return userStore.user.role.identification === 'admin' ? '无限制' : '今日剩余'
})

const accountCount = computed(() => {
  return userStore.user.accountCount;
})

const changeAside = () => {
  uiStore.changeAside();
}

const openDark = (event) => {
  uiStore.openDark(event);
}

const openSend = () => {
  router.push('/send')
}

const openNotice = () => {
  ElMessage.info('暂无新通知')
}

// 核心：处理语言切换
const handleLanguageSwitch = (lang) => {
  locale.value = lang;
  localStorage.setItem('cloud_mail_lang', lang);
  window.location.reload(); // 强制刷新确保全局生效
}

const userInfoHide = () => {
  userinfoRef.value.handleClose();
}

const clickLogout = () => {
  logoutLoading.value = true;
  logout().then(res => {
    userStore.logout();
    router.push('/login');
  }).finally(() => {
    logoutLoading.value = false;
  })
}

const formatName = (email) => {
  if (!email) return 'U'
  return email.substring(0, 1).toUpperCase();
}

const copyEmail = (email) => {
  navigator.clipboard.writeText(email).then(() => {
    ElMessage.success('复制成功')
  })
}
</script>

<style scoped lang="scss">
.header {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  
  .header-btn {
    display: flex;
    align-items: center;
    .breadcrumb-item {
      margin-left: 10px;
      font-size: 14px;
      color: var(--el-text-color-regular);
    }
  }

  .writer-box {
    cursor: pointer;
    .writer {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: var(--el-color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 5px;

    .icon-item {
      width: 35px;
      height: 35px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      cursor: pointer;
      border-radius: 8px;
      color: var(--el-text-color-regular);
      
      &:hover {
        background-color: var(--el-fill-color-light);
      }
    }

    .avatar {
      display: flex;
      align-items: center;
      cursor: pointer;
      margin-left: 10px;
      
      .avatar-text {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: var(--el-color-primary-light-8);
        color: var(--el-color-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
      }
      
      .setting-icon {
        margin-left: 5px;
        color: var(--el-text-color-placeholder);
      }
    }
  }
}

.user-details {
  padding: 20px;
  width: 280px;
  text-align: center;
  
  .details-avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background-color: var(--el-color-primary-light-8);
    color: var(--el-color-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: bold;
    margin: 0 auto 10px;
  }
  
  .user-name {
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 5px;
  }
  
  .detail-email {
    font-size: 13px;
    color: var(--el-text-color-secondary);
    margin-bottom: 10px;
    cursor: pointer;
    &:hover {
      color: var(--el-color-primary);
    }
  }
  
  .detail-user-type {
    margin-bottom: 20px;
  }
  
  .action-info {
    background-color: var(--el-fill-color-lighter);
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    font-size: 13px;
    
    & > div {
      display: flex;
      justify-content: space-between;
    }
  }
  
  .logout {
    border-top: 1px solid var(--el-border-color-light);
    padding-top: 15px;
    .el-button {
      width: 100%;
    }
  }
}
</style>
