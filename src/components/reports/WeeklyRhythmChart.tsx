import { useMemo, useState } from 'react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip
} from 'recharts';
import { Activity } from 'lucide-react';
import './WeeklyRhythmChart.css';

interface RhythmData {
    subject: string;
    A?: number;
    minutes?: number;
    value?: number;
    fullMark: number;
}

interface HourlyData {
    hour: number;
    count: number;
    label: string;
}

interface WeeklyRhythmChartProps {
    data: RhythmData[];
    dailyData?: HourlyData[];
}

export default function WeeklyRhythmChart({ data, dailyData }: WeeklyRhythmChartProps) {
    const [view, setView] = useState<'weekly' | 'daily'>('weekly');

    const chartData = useMemo(() => {
        if (view === 'daily' && dailyData) {
            const maxVal = Math.max(...dailyData.map(d => d.count), 1);
            return dailyData.map(d => ({
                subject: d.hour % 6 === 0 ? d.label : '',
                rawSubject: d.label,
                A: d.count,
                fullMark: maxVal
            }));
        }
        const maxVal = Math.max(...data.map(d => d.minutes || d.value || 0), 1);
        return data.map(d => ({
            subject: d.subject,
            A: d.minutes || d.value || 0,
            fullMark: maxVal
        }));
    }, [view, data, dailyData]);

    const totalSessions = chartData.reduce((sum, d) => sum + (d.A || 0), 0);
    const bestDay = useMemo(() => {
        const sorted = [...chartData].sort((a, b) => (b.A || 0) - (a.A || 0));
        return sorted[0]?.subject || '-';
    }, [chartData]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="rhythm-tooltip">
                    <p className="tooltip-label">{label || payload[0]?.payload?.rawSubject}</p>
                    <p className="tooltip-value">{Math.round(payload[0].value)} {view === 'weekly' ? 'mins' : 'sessions'}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="rhythm-chart-container">
            <div className="rhythm-header">
                <div className="rhythm-title-row">
                    <Activity size={14} className="rhythm-icon" />
                    <h3 className="rhythm-title">{view === 'weekly' ? 'WEEKLY' : 'DAILY'} RHYTHM</h3>
                </div>
                <div className="rhythm-stats">
                    <span className="rhythm-best">{bestDay}</span>
                    <span className="rhythm-best-label">most active</span>
                </div>
            </div>

            {dailyData && (
                <div className="rhythm-toggle">
                    <button
                        className={`toggle-pill ${view === 'weekly' ? 'active' : ''}`}
                        onClick={() => setView('weekly')}
                    >
                        Week
                    </button>
                    <button
                        className={`toggle-pill ${view === 'daily' ? 'active' : ''}`}
                        onClick={() => setView('daily')}
                    >
                        Day
                    </button>
                </div>
            )}

            <div className="rhythm-chart">
                <ResponsiveContainer width="100%" height={180}>
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
                        <PolarGrid
                            gridType="circle"
                            stroke="rgba(255, 255, 255, 0.08)"
                            strokeWidth={1}
                        />
                        <PolarAngleAxis
                            dataKey="subject"
                            tick={{ fill: 'var(--text-muted)', fontSize: 9, fontWeight: 600 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <PolarRadiusAxis
                            angle={30}
                            domain={[0, 'auto']}
                            tick={false}
                            axisLine={false}
                        />
                        <Radar
                            name="Focus"
                            dataKey="A"
                            stroke="var(--primary)"
                            strokeWidth={2}
                            fill="var(--primary)"
                            fillOpacity={0.25}
                            isAnimationActive={true}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={false} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>

            <div className="rhythm-footer">
                <span className="rhythm-total">{Math.round(totalSessions)} total {view === 'weekly' ? 'mins' : 'sessions'}</span>
            </div>
        </div>
    );
}
