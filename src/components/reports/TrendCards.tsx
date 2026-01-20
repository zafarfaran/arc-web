import { ArrowUpRight, ArrowDownRight, Zap, Clock, CheckCircle } from 'lucide-react';
import './TrendCards.css';

interface TrendItem {
    label: string;
    value: number;
    change: number;
    unit: string;
}

const TREND_ICONS: Record<string, any> = {
    'Sessions': Zap,
    'Focus Time': Clock,
    'Tasks': CheckCircle,
};

export default function TrendCards({ trends, history }: { trends: TrendItem[], history: any[] }) {
    return (
        <div className="trends-grid">
            {trends.map((trend, index) => {
                const Icon = TREND_ICONS[trend.label] || Zap;
                return (
                    <div key={index} className="trend-card">
                        <div className="trend-header">
                            <div className="trend-title-row">
                                <Icon size={14} className="trend-icon" />
                                <span className="trend-label">{trend.label.toUpperCase()}</span>
                            </div>
                            <div className={`trend-badge ${trend.change >= 0 ? 'up' : 'down'}`}>
                                {trend.change >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                <span>{Math.abs(trend.change)}%</span>
                            </div>
                        </div>

                        <div className="trend-body">
                            <div className="trend-value-group">
                                <span className="trend-value">{trend.value}</span>
                                <span className="trend-unit">{trend.unit}</span>
                            </div>
                        </div>

                        {index === 0 && history.length > 0 && (
                            <div className="trend-sparkline">
                                <div className="sparkline-bars">
                                    {history.map((h, i) => {
                                        const max = Math.max(...history.map(item => item.value)) || 1;
                                        const height = (h.value / max) * 100;
                                        const isLast = i === history.length - 1;
                                        return (
                                            <div
                                                key={i}
                                                className={`spark-bar ${isLast ? 'current' : ''}`}
                                                style={{ height: `${Math.max(height, 4)}%` }}
                                                title={`${h.label}: ${h.value}`}
                                            />
                                        );
                                    })}
                                </div>
                                <span className="sparkline-label">6 week trend</span>
                            </div>
                        )}

                        <div className="trend-footer">
                            <span className="trend-compare">vs last week</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
