import { useMemo, useState } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { Clock } from 'lucide-react';
import './ProductivityTimeChart.css';

interface HourlyData {
    hour: number;
    count: number;
    label: string;
}

interface WeeklyData {
    subject: string;
    minutes?: number;
    value?: number;
    fullMark?: number;
}

interface ProductivityTimeChartProps {
    data: HourlyData[];
    weeklyData?: WeeklyData[];
}

export default function ProductivityTimeChart({ data, weeklyData }: ProductivityTimeChartProps) {
    const [view, setView] = useState<'hourly' | 'weekly'>('hourly');

    // Use current view data
    const chartData = useMemo(() => {
        if (view === 'weekly' && weeklyData) {
            return weeklyData.map(d => ({
                label: d.subject,
                count: d.minutes || d.value || 0
            }));
        }
        return data;
    }, [view, data, weeklyData]);

    const peak = useMemo(() => {
        const sorted = [...chartData].sort((a, b) => b.count - a.count);
        return sorted[0] && sorted[0].count > 0 ? sorted[0] : null;
    }, [chartData]);

    const totalSessions = chartData.reduce((sum, d) => sum + d.count, 0);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="productivity-tooltip">
                    <p className="tooltip-time">{label}</p>
                    <p className="tooltip-count">{payload[0].value} {view === 'hourly' ? 'sessions' : 'mins'}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="productivity-chart-container">
            <div className="productivity-header">
                <div className="productivity-title-row">
                    <Clock size={14} className="productivity-icon" />
                    <h3 className="productivity-title">
                        {view === 'hourly' ? 'PEAK HOURS' : 'WEEKLY RHYTHM'}
                    </h3>
                </div>
                <div className="productivity-stats">
                    {peak && (
                        <>
                            <span className="productivity-peak">{peak.label}</span>
                            <span className="productivity-peak-label">peak time</span>
                        </>
                    )}
                </div>
            </div>

            {weeklyData && (
                <div className="productivity-toggle">
                    <button
                        className={`toggle-pill ${view === 'hourly' ? 'active' : ''}`}
                        onClick={() => setView('hourly')}
                    >
                        By Hour
                    </button>
                    <button
                        className={`toggle-pill ${view === 'weekly' ? 'active' : ''}`}
                        onClick={() => setView('weekly')}
                    >
                        By Day
                    </button>
                </div>
            )}

            <div className="productivity-chart">
                <ResponsiveContainer width="100%" height={120}>
                    <AreaChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                        <defs>
                            <linearGradient id="productivityGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
                                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="label"
                            tick={{ fontSize: 9, fill: 'var(--text-muted)', fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                            interval={view === 'hourly' ? 5 : 0}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--primary)', strokeOpacity: 0.2 }} />
                        <Area
                            type="monotone"
                            dataKey="count"
                            stroke="var(--primary)"
                            strokeWidth={2}
                            fill="url(#productivityGradient)"
                            animationDuration={600}
                            dot={false}
                            activeDot={{ r: 4, fill: 'var(--primary)', strokeWidth: 0 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="productivity-footer">
                <span className="productivity-total">{totalSessions} total {view === 'hourly' ? 'sessions' : 'focus mins'}</span>
            </div>
        </div>
    );
}
