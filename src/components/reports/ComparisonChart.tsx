import { useMemo } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { GitCompare } from 'lucide-react';
import './ComparisonChart.css';

interface ComparisonChartProps {
    data: {
        day: string;
        thisWeek: number;
        lastWeek: number;
    }[];
}

export default function ComparisonChart({ data }: ComparisonChartProps) {
    const thisWeekTotal = useMemo(() => data.reduce((sum, d) => sum + d.thisWeek, 0), [data]);
    const lastWeekTotal = useMemo(() => data.reduce((sum, d) => sum + d.lastWeek, 0), [data]);
    const change = lastWeekTotal > 0 ? Math.round(((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100) : 0;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="comparison-tooltip">
                    <p className="tooltip-day">{label}</p>
                    <div className="tooltip-rows">
                        <div className="tooltip-row">
                            <span className="tooltip-dot this"></span>
                            <span className="tooltip-label">This week</span>
                            <span className="tooltip-value">{payload[0]?.value}m</span>
                        </div>
                        <div className="tooltip-row">
                            <span className="tooltip-dot last"></span>
                            <span className="tooltip-label">Last week</span>
                            <span className="tooltip-value">{payload[1]?.value}m</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="comparison-chart-container">
            <div className="comparison-header">
                <div className="comparison-title-row">
                    <GitCompare size={14} className="comparison-icon" />
                    <h3 className="comparison-title">WEEK OVER WEEK</h3>
                </div>
                <div className="comparison-stats">
                    <span className={`comparison-change ${change >= 0 ? 'up' : 'down'}`}>
                        {change >= 0 ? '+' : ''}{change}%
                    </span>
                    <span className="comparison-change-label">vs last week</span>
                </div>
            </div>

            <div className="comparison-legend">
                <div className="legend-item">
                    <span className="legend-dot this"></span>
                    <span>This Week</span>
                </div>
                <div className="legend-item">
                    <span className="legend-dot last"></span>
                    <span>Last Week</span>
                </div>
            </div>

            <div className="comparison-chart">
                <ResponsiveContainer width="100%" height={120}>
                    <AreaChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                        <defs>
                            <linearGradient id="thisWeekGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="lastWeekGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--text-muted)" stopOpacity={0.15} />
                                <stop offset="100%" stopColor="var(--text-muted)" stopOpacity={0.02} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="day"
                            tick={{ fontSize: 9, fill: 'var(--text-muted)', fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--primary)', strokeOpacity: 0.2 }} />
                        <Area
                            type="monotone"
                            dataKey="thisWeek"
                            stroke="var(--primary)"
                            strokeWidth={2}
                            fill="url(#thisWeekGradient)"
                            dot={false}
                            activeDot={{ r: 4, fill: 'var(--primary)', strokeWidth: 0 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="lastWeek"
                            stroke="var(--text-muted)"
                            strokeWidth={1.5}
                            strokeDasharray="4 4"
                            fill="url(#lastWeekGradient)"
                            dot={false}
                            activeDot={{ r: 3, fill: 'var(--text-muted)', strokeWidth: 0 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="comparison-footer">
                <span className="comparison-total">{thisWeekTotal} mins this week</span>
            </div>
        </div>
    );
}
