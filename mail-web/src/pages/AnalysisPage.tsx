import { Button, Spinner } from '@heroui/react';
import * as echarts from 'echarts';
import { RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { analysisEcharts } from '@/api/analysis';
import WorkspaceLayout from '@/components/WorkspaceLayout';

function Chart({ title, option }: { title: string; option: any }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chart.setOption(option);
    const resize = () => chart.resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      chart.dispose();
    };
  }, [option]);

  return (
    <section className="surface-card w-full rounded-2xl p-4">
      <h2 className="mb-3 font-semibold">{title}</h2>
      <div className="h-80 w-full" ref={ref} />
    </section>
  );
}

export default function AnalysisPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  async function refresh() {
    setLoading(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setData(await analysisEcharts(tz));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const charts = useMemo(() => {
    if (!data) return [];
    const entries = Object.entries(data).filter(([, value]) => Array.isArray(value));
    return entries.slice(0, 4).map(([key, value]: any) => {
      const labels = value.map((item: any, index: number) => item.date || item.name || item.email || String(index + 1));
      const numbers = value.map((item: any) => item.total || item.count || item.value || item.received || item.sent || 0);
      return {
        title: key,
        option: {
          tooltip: {},
          grid: { left: 40, right: 20, top: 30, bottom: 40 },
          xAxis: { type: 'category', data: labels },
          yAxis: { type: 'value' },
          series: [{ type: 'bar', data: numbers, itemStyle: { borderRadius: [6, 6, 0, 0] } }],
        },
      };
    });
  }, [data]);

  return (
    <WorkspaceLayout
      actions={
        <Button variant="secondary" onPress={refresh}>
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </Button>
      }
      title={t('analytics')}
    >
      {loading ? (
        <div className="flex h-80 items-center justify-center">
          <Spinner />
        </div>
      ) : charts.length ? (
        <div className="grid w-full gap-5">
          {charts.map((chart) => (
            <Chart key={chart.title} option={chart.option} title={chart.title} />
          ))}
        </div>
      ) : (
        <pre className="surface-card overflow-auto rounded-2xl p-4 text-sm">{JSON.stringify(data, null, 2)}</pre>
      )}
    </WorkspaceLayout>
  );
}
