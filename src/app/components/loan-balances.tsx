import { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import Highcharts from 'highcharts/highcharts-gantt';
import HighchartsReact from 'highcharts-react-official';
import { Skeleton } from './ui/skeleton';
import { MapPin, RefreshCw } from 'lucide-react';
import { dashboardService, GanttLoanData } from '../services/dashboardService';
import { authService } from '../services/authService';
import { usePartnerContext } from '../contexts/PartnerContext';

export function LoanBalances() {
  const intl = useIntl();
  const { selectedPartner } = usePartnerContext();
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const currentUser = authService.getCurrentUser();

  const fetchData = async () => {
    if (!currentUser?.id) return;
    try {
      setLoading(true);
      const data = await dashboardService.getDetailedLoans(currentUser.id, selectedPartner?.id);
      setChartData(data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser?.id, selectedPartner?.id]);

  useEffect(() => {
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [currentUser?.id, selectedPartner?.id]);

  const options: Highcharts.Options = {
    title: { text: undefined },
    chart: {
      type: 'bar',
      backgroundColor: 'transparent',
      height: 400
    },
    xAxis: {
      categories: chartData.map(item => item.name),
      labels: {
        style: { fontSize: '10px', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase' }
      }
    },
    yAxis: {
      title: {
        text: intl.formatMessage({ id: 'loans.wait_time' }),
        style: { fontSize: '10px', fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase' }
      },
      gridLineColor: '#f1f5f9'
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        maxPointWidth: 40,
        colorByPoint: false,
        minPointLength: 5,
        dataLabels: {
          enabled: true,
          inside: true,
          align: 'right',
          format: '{point.customLabel}',
          style: { fontSize: '10px', fontWeight: '900', color: '#ffffff', textOutline: 'none' }
        }
      }
    },
    tooltip: {
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0',
      borderRadius: 12,
      shadow: true,
      useHTML: true,
      headerFormat: '',
      pointFormat: `
        <div style="min-width: 180px; padding: 4px;">
          <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px;">${intl.formatMessage({ id: 'loans.order_intel' })}</div>
          <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-bottom: 8px;">{point.name}</div>
          <div style="padding-top: 8px; border-top: 1px dashed #e2e8f0;">
             <div style="margin-bottom: 4px; display: flex; justify-content: space-between;">
                <span style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">${intl.formatMessage({ id: 'loans.status_label' })}</span>
                <span style="font-size: 10px; font-weight: 900; color: {point.color};">{point.customStatus}</span>
             </div>
             <div style="display: flex; justify-content: space-between;">
                <span style="font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase;">${intl.formatMessage({ id: 'loans.wait_time' })}</span>
                <span style="font-size: 10px; font-weight: 900; color: #1e293b;">{point.customLabel}</span>
             </div>
          </div>
        </div>
      `
    },
    series: [{
      name: intl.formatMessage({ id: 'dashboard.time_elapsed' }),
      type: 'bar',
      data: chartData.map(item => ({
        y: Math.max(0.1, item.custom.elapsedHours || 0), // Precise height
        color: item.color,
        customLabel: item.custom.region,
        customStatus: item.custom.status,
        customPartner: item.custom.feedback
      })),
      showInLegend: false
    }],
    credits: { enabled: false },
    accessibility: { enabled: false }
  };

  return (
    <div className="premium-chart-card rounded-md p-8 flex flex-col h-full">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-1 h-6 bg-[#0b680c]"></div>
          <div>
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">
              {intl.formatMessage({ id: 'loans.request_tracking' })}
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 italic">
              {chartData.some(d => d.custom.status.includes('HISTORY')) 
                ? intl.formatMessage({ id: 'loans.recent_history' }) 
                : intl.formatMessage({ id: 'loans.live_aging' })}
            </p>
          </div>
        </div>
        <button onClick={() => fetchData()} className="p-2 border border-slate-100 rounded-sm hover:bg-slate-50">
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="flex-1 w-full min-h-[400px]">
        {loading ? (
          <div className="space-y-6 pt-4 opacity-20">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : chartData.length > 0 ? (
          <HighchartsReact highcharts={Highcharts} options={options} containerProps={{ style: { height: '100%', width: '100%' } }} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-10 opacity-40">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
              {intl.formatMessage({ id: 'loans.no_active_queue' })}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-6">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#fbbf24]"></div>
          <span className="text-[9px] font-black text-slate-500 uppercase">
            {intl.formatMessage({ id: 'sidebar.pending_requests' })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#f43f5e]"></div>
          <span className="text-[9px] font-black text-slate-500 uppercase">
             {intl.formatMessage({ id: 'sidebar.denied_requests' })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#64748b]"></div>
          <span className="text-[9px] font-black text-slate-500 uppercase">
             {intl.formatMessage({ id: 'loans.resolved' })}
          </span>
        </div>
      </div>
    </div>
  );
}