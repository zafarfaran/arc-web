import { useMemo } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import type { XPEvent } from '../../types';
import './XPTrendsChart.css';

interface DayData {
    date: string;
    label: string;
    xp: number;
}

export default function XPTrendsChart() {
    const { state } = useApp();
    const xpHistory = state.user?.xp?.xpHistory || [];

    const chartData = useMemo(() => {
        const days: DayData[] = [];
        const today = new Date();

        // Get last 7 days for cleaner look
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' });

            // Sum XP for this day
            const dayXp = xpHistory
                .filter((event: XPEvent) => {
                    const eventDate = new Date(event.timestamp).toISOString().split('T')[0];
                    return eventDate === dateStr && event.amount > 0;
                })
                .reduce((sum: number, event: XPEvent) => sum + event.amount, 0);

            days.push({ date: dateStr, label: dayLabel, xp: dayXp });
        }

        return days;
    }, [xpHistory]);

    const totalXpPeriod = chartData.reduce((sum, day) => sum + day.xp, 0);
    const avgXpPerDay = Math.round(totalXpPeriod / chartData.length);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="xp-chart-tooltip">
                    <p className="tooltip-date">{label}</p>
                    <p className="tooltip-xp">+{payload[0].value} XP</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="xp-trends-container">
            <div className="xp-trends-header">
                <div className="xp-trends-title-row">
                    <TrendingUp size={14} className="xp-trends-icon" />
                    <h3 className="xp-trends-title">XP ACTIVITY</h3>
                </div>
                <div className="xp-trends-stats">
                    <span className="xp-stat-value">{totalXpPeriod}</span>
                    <span className="xp-stat-label">XP this week</span>
                </div>
            </div>

            <div className="xp-trends-chart">
                <ResponsiveContainer width="100%" height={100}>
                    <AreaChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                        <defs>
                            <linearGradient id="xpGradientSmooth" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="label"
                            tick={{ fontSize: 9, fill: 'var(--text-muted)', fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--primary)', strokeOpacity: 0.2 }} />
                        <Area
                            type="monotone"
                            dataKey="xp"
                            stroke="var(--primary)"
                            strokeWidth={2}
                            fill="url(#xpGradientSmooth)"
                            animationDuration={600}
                            dot={false}
                            activeDot={{ r: 4, fill: 'var(--primary)', strokeWidth: 0 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="xp-trends-footer">
                <span className="xp-avg-label">~{avgXpPerDay} XP/day avg</span>
            </div>
        </div>
    );
}
