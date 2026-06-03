import http from '@/lib/http';

export function analysisEcharts(timeZone: string) {
  return http.get('/analysis/echarts', { params: { timeZone } });
}
