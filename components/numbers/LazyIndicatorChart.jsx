'use client';
import dynamic from 'next/dynamic';

// The dynamic import must live in a client component: App Router bundles every
// client component a server page imports, so next/dynamic in the page itself
// still shipped Recharts (~110 KiB) to indicators that draw no chart.
// The value, table and sources are server-rendered, so the chart is enhancement.
const Chart = dynamic(() => import('@/components/IndicatorChart'), {
  ssr: false,
  loading: () => <p className="ed-chart-loading" role="status" style={{minHeight: 360}}>جارٍ تجهيز الرسم…</p>,
});

export default function LazyIndicatorChart(props) { return <Chart {...props}/>; }
