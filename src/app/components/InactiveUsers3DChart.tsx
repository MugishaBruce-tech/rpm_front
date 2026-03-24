import { useRef, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Highcharts 12 ESM: the 3D module self-registers when imported — no factory call needed
import 'highcharts/esm/highcharts-3d';

interface InactiveUser {
  business_partner_name?: string;
  user_ad?: string;
  last_login_at?: string | null;
  region?: string;
}

interface Props {
  users: InactiveUser[];
}

function getColorAndLabel(hrs: number): { color: string; label: string; bg: string } {
  if (hrs > 998000) return { color: '#ef4444', label: 'Never logged in', bg: 'rgba(239,68,68,0.06)' };
  if (hrs > 720)    return { color: '#f97316', label: `${Math.round(hrs / 24)}d ago`,  bg: 'rgba(249,115,22,0.06)' };
  if (hrs > 24)     return { color: '#f59e0b', label: `${hrs}h ago`,                   bg: 'rgba(245,158,11,0.06)' };
  return               { color: '#10b981', label: `${hrs}h ago`,                   bg: 'rgba(16,185,129,0.06)' };
}

const PAGE_SIZE = 5;

export function InactiveUsers3DChart({ users }: Props) {
  const chartRef = useRef<HighchartsReact.RefObject>(null);
  const [page, setPage] = useState(0);

  // All users enriched — ONLY show inactive ones (>= 24h)
  const allUsers = users.map((user) => {
    const lastLogin = user.last_login_at ? new Date(user.last_login_at) : null;
    const hrs = lastLogin
      ? Math.floor((Date.now() - lastLogin.getTime()) / (1000 * 60 * 60))
      : 999999;
    const { color, label, bg } = getColorAndLabel(hrs);
    const fullName = user.business_partner_name || user.user_ad || '?';
    const name = fullName.split(' ').slice(0, 2).join(' ');
    return { name, hrs, color, label, bg, region: user.region || '' };
  }).filter(u => u.hrs >= 24).sort((a, b) => b.hrs - a.hrs);

  const totalPages = Math.ceil(allUsers.length / PAGE_SIZE);
  const pageUsers = allUsers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Chart uses top 8 sorted by inactivity
  const chartData = allUsers.slice(0, 8).map((u) => ({
    name: u.name.split(' ').slice(0, 2).join(' '),
    y: u.hrs > 998000 ? 750 : Math.min(u.hrs, 750),
    color: u.color,
    label: u.label,
    actualHours: u.hrs,
    region: u.region,
  }));

  const options: Highcharts.Options = {
    chart: {
      type: 'column',
      options3d: {
        enabled: true,
        alpha: 15,
        beta: 15,
        depth: 60,
        viewDistance: 25,
      },
      backgroundColor: 'transparent',
      style: { fontFamily: 'Inter, sans-serif' },
      animation: { duration: 900 },
      margin: [20, 20, 80, 50],
    },
    title: { text: undefined },
    credits: { enabled: false },
    accessibility: { enabled: false },
    legend: { enabled: false },
    xAxis: {
      categories: chartData.map((d) => d.name),
      labels: {
        style: { fontSize: '10px', fontWeight: '700', color: '#475569' },
        rotation: -30,
      },
      lineColor: '#e2e8f0',
      tickColor: '#e2e8f0',
    },
    yAxis: {
      title: { text: undefined },
      labels: {
        style: { fontSize: '9px', color: '#94a3b8' },
        formatter() {
          const v = this.value as number;
          if (v >= 720) return `${Math.round(v / 24)}d`;
          return `${v}h`;
        },
      },
      gridLineColor: '#f1f5f9',
    },
    plotOptions: {
      column: {
        depth: 20,
        pointWidth: 30,
        borderRadius: 3,
        borderWidth: 0,
        dataLabels: {
          enabled: true,
          style: { fontSize: '9px', fontWeight: '700', textOutline: 'none' },
          formatter() {
            const pt = (this as any).point;
            return `<span style="color:${pt.color}">${pt.label}</span>`;
          },
          useHTML: true,
        },
        states: { hover: { brightness: 0.1 } },
      },
    },
    tooltip: {
      backgroundColor: '#1e293b',
      borderWidth: 0,
      borderRadius: 8,
      style: { color: '#f8fafc', fontSize: '11px' },
      formatter() {
        const pt = (this as any).point;
        const hrs = pt.actualHours;
        let time = 'Never logged in';
        if (hrs <= 998000) {
          time = hrs > 720 ? `${Math.round(hrs / 24)} days inactive` : `${hrs}h inactive`;
        }
        return `<b>${pt.name}</b><br/><span style="color:${pt.color}">${time}</span><br/><span style="color:#94a3b8;font-size:9px">${pt.region}</span>`;
      },
      useHTML: true,
    },
    series: [
      {
        type: 'column',
        name: 'Inactivity',
        colorByPoint: true,
        data: chartData.map((d) => ({
          name: d.name,
          y: d.y,
          color: d.color,
          label: d.label,
          actualHours: d.actualHours,
          region: d.region,
        })),
      } as Highcharts.SeriesColumnOptions,
    ],
  };

  return (
    <div className="flex gap-4 w-full">

      {/* ── Left: paginated user list ── */}
      <div
        className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white overflow-hidden"
        style={{ minWidth: 180, maxWidth: 200 }}
      >
        {/* Rows */}
        <div className="flex flex-col divide-y divide-slate-100 flex-1">
          {pageUsers.map((u, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 px-3 py-2.5 bg-white hover:bg-slate-50 transition-colors"
            >
              {/* Left accent */}
              <span
                className="w-1 self-stretch rounded-full flex-shrink-0"
                style={{ background: u.color }}
              />
              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-800 truncate leading-tight">{u.name}</p>
                <p
                  className="text-[8px] font-black uppercase tracking-wide leading-none mt-0.5"
                  style={{ color: u.color }}
                >
                  {u.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-100 bg-slate-50">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="text-slate-400 disabled:opacity-20 hover:text-slate-600 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-[9px] font-bold text-slate-400">
            {page + 1} / {totalPages || 1}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="text-slate-400 disabled:opacity-20 hover:text-slate-600 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Right: 3D chart ── */}
      <div className="flex-1 min-w-0">
        <HighchartsReact highcharts={Highcharts} options={options} ref={chartRef} />
      </div>

    </div>
  );
}
