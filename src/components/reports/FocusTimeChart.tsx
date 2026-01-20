import { useMemo } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { Timer } from 'lucide-react';
import './FocusTimeChart.css';

interface FocusTimeChartProps {
    data: {
        date: string;
        minutes: number;
        isToday: boolean;
    }[];
}

export default function FocusTimeChart({ data }: FocusTimeChartProps) {
    const totalMinutes = useMemo(() => data.reduce((sum, d) => sum + d.minutes, 0), [data]);
    const todayMinutes = useMemo(() => data.find(d => d.isToday)?.minutes || 0, [data]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="focus-tooltip">
                    <p className="tooltip-day">{label}</p>
                    <p className="tooltip-mins">{payload[0].value} mins</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="focus-chart-container">
            <div className="focus-header">
                <div className="focus-title-row">
                    <Timer size={14} className="focus-icon" />
                    <h3 className="focus-title">WEEKLY FOCUS</h3>
                </div>
                <div className="focus-stats">
                    <span className="focus-total">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</span>
                    <span className="focus-total-label">this week</span>
                </div>
            </div>

            <div className="focus-chart">
                <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 9, fill: 'var(--text-muted)', fontWeight: 600 }}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(249, 115, 22, 0.08)' }} />
                        <Bar dataKey="minutes" radius={[4, 4, 0, 0]} barSize={20}>
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={entry.isToday ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)'}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="focus-footer">
                <span className="focus-today">{todayMinutes} mins today</span>
            </div>
        </div>
    );
}
