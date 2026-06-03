import axios, { type AxiosRequestConfig } from 'axios';
import i18n from '@/i18n';
import { useAppStore } from '@/store/app-store';
import { notifyError, notifyWarning } from '@/lib/notify';
import type { ApiResult } from '@/types';

type MailRequestConfig = AxiosRequestConfig & {
  noMsg?: boolean;
};

const http = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL,
}) as any;

http.interceptors.request.use((config) => {
  const { lang } = useAppStore.getState();
  config.headers.Authorization = `${localStorage.getItem('token') || ''}`;
  config.headers['accept-language'] = lang;
  return config;
});

http.interceptors.response.use(
  (res: any) => {
    const config = res.config as MailRequestConfig;
    const data = res.data as ApiResult;

    if (config.noMsg) {
      return data.code === 200 ? data.data : Promise.reject(data);
    }

    if (data.code === 401) {
      notifyError(data.message);
      localStorage.removeItem('token');
      useAppStore.getState().resetSession();
      window.history.replaceState(null, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
      return Promise.reject(data);
    }

    if (data.code === 403) {
      notifyWarning(data.message);
      return Promise.reject(data);
    }

    if (data.code !== 200) {
      notifyError(data.message);
      return Promise.reject(data);
    }

    return data.data;
  },
  (error: any) => {
    const config = (error.config || {}) as MailRequestConfig;

    if (error.status === 403) {
      location.reload();
      return Promise.reject(error);
    }

    if (!config.noMsg) {
      if (error.message?.includes('Network Error')) {
        notifyError(i18n.t('networkErrorMsg'));
      } else if (error.code === 'ECONNABORTED') {
        notifyError(i18n.t('timeoutErrorMsg'));
      } else if (error.response) {
        notifyError(i18n.t('serverBusyErrorMsg'));
      } else {
        notifyError(i18n.t('reqFailErrorMsg'));
      }
    }

    return Promise.reject(error);
  },
);

export default http;
