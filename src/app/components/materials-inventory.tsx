import { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import highcharts3d from 'highcharts/highcharts-3d';
import { dashboardService } from '../services/dashboardService';
import { Skeleton } from './ui/skeleton';
import { Layers, Cuboid as Cube } from 'lucide-react';
import { usePartnerContext } from '../contexts/PartnerContext';

// Initialize 3D module
if (typeof highcharts3d === 'function') {
  (highcharts3d as any)(Highcharts);
}

export function MaterialsInventory() {
  const intl = useIntl();
  const { selectedPartner } = usePartnerContext();
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await dashboardService.getLoanBalances({ partnerKey: selectedPartner?.id });
        setChartData(data.slice(0, 6)); // Limit to 6 for clarity in 3D
      } catch (error) {
        console.error('Failed to fetch chart data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedPartner]);

  const options: Highcharts.Options = {
    chart: {
      type: 'bar',
      backgroundColor: 'transparent',
      height: 450,
      style: { fontFamily: "'Inter', sans-serif" },
      marginTop: 30
    },
    title: { text: undefined },
    xAxis: {
      categories: chartData.map(d => d.name),
      labels: {
        style: { fontSize: '10px', fontWeight: '800', color: '#1e293b', fontFamily: "'Outfit', sans-serif" }
      },
      lineColor: '#e2e8f0',
      tickWidth: 0
    },
    yAxis: {
      allowDecimals: false,
      min: 0,
      title: {
        text: intl.formatMessage({ id: 'opco.crates_base_uom' }),
        style: { fontSize: '10px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', fontFamily: "'Outfit', sans-serif" }
      },
      gridLineColor: '#f8fafc',
      labels: {
        style: { color: '#94a3b8', fontSize: '10px', fontWeight: '600' }
      }
    },
    tooltip: {
      backgroundColor: '#ffffff',
      borderColor: '#e2e8f0',
      borderRadius: 12,
      shadow: true,
      shared: true,
      useHTML: true,
      headerFormat: '<div style="margin-bottom: 8px; font-weight: 800; font-size: 10px; color: #94a3b8; text-transform: uppercase;">{point.key}</div>',
      pointFormat: '<div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 4px;">' +
        '<span style="color: {series.color}; font-weight: 700;">{series.name}</span>' +
        '<span style="font-weight: 800;">{point.y}</span>' +
        '</div>'
    },
    plotOptions: {
      bar: {
        dataLabels: {
          enabled: true,
          align: 'left',
          x: 5,
          color: '#64748b',
          style: { textOutline: 'none', fontSize: '10px', fontWeight: '800' }
        },
        borderWidth: 0,
        borderRadius: 4,
        groupPadding: 0.1,
        pointPadding: 0.05
      }
    },
    legend: {
      align: 'right',
      verticalAlign: 'top',
      layout: 'horizontal',
      itemStyle: { color: '#64748b', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' },
      symbolRadius: 4,
      symbolHeight: 8,
      symbolWidth: 8,
      floating: true,
      y: -30
    },
    series: [
      {
        type: 'bar',
        name: intl.formatMessage({ id: 'inventory.on_hand_label' }),
        data: chartData.map(d => d.physical),
        color: '#216730'
      },
      {
        type: 'bar',
        name: intl.formatMessage({ id: 'inventory.lent_out' }),
        data: chartData.map(d => d.loaned),
        color: '#3b82f6'
      },
      {
        type: 'bar',
        name: intl.formatMessage({ id: 'inventory.borrowed' }),
        data: chartData.map(d => d.borrowed),
        color: '#f59e0b'
      }
    ],
    credits: { enabled: false }
  };

  return (
    <div className="premium-chart-card rounded-md p-6 flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-5 bg-[#0b680c]"></div>
        <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-wider font-display">
          {intl.formatMessage({ id: 'inventory.liquidity' })}
        </h2>
      </div>

      <div className="flex-1 w-full min-h-[400px]">
        {loading ? (
          <div className="space-y-4 pt-4 opacity-20">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <HighchartsReact
            highcharts={Highcharts}
            options={options}
            containerProps={{ style: { height: '100%', width: '100%' } }}
          />
        )}
      </div>
    </div>
  );
}