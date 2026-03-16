import { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { usePrimaryColor } from '../hooks/usePrimaryColor';
import { dashboardService } from '../services/dashboardService';
import { Skeleton } from './ui/skeleton';

export function ActivityTrend() {
  const intl = useIntl();
  const primaryColor = usePrimaryColor();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const activityData = await dashboardService.getActivityTrend();
        setData(activityData);
      } catch (error) {
        console.error('Failed to load activity trend:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start justify-between mb-6 gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">{intl.formatMessage({ id: 'dashboard.activity_trend' })}</h2>
          <p className="text-sm text-slate-500">{intl.formatMessage({ id: 'dashboard.activity_trend_desc' })}</p>
        </div>
      </div>

      {loading ? (
        <div className="h-[300px] sm:h-[380px] relative">
          <Skeleton className="w-full h-full" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex gap-1 items-end h-[60%] w-[80%]">
              {[...Array(14)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="flex-1"
                  style={{ height: `${20 + Math.random() * 60}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      ) : data.length > 0 ? (
        <div className="h-[300px] sm:h-[380px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={primaryColor} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="0" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  padding: '12px',
                  fontSize: '13px'
                }}
                labelStyle={{ color: '#0f172a', fontWeight: 500, marginBottom: '4px' }}
                cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
                iconType="rect"
                iconSize={10}
              />
              <Area
                type="monotone"
                dataKey="transactions"
                stroke={primaryColor}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
                name={intl.formatMessage({ id: 'dashboard.transactions' })}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex items-center justify-center h-[380px]">
          <p className="text-slate-500">{intl.formatMessage({ id: 'dashboard.no_activity_data' })}</p>
        </div>
      )}
    </div>
  );
}