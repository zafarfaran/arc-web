import { useState, useMemo } from 'react';
import { Tag, BarChart2, PieChart as PieIcon } from 'lucide-react';
import './TagAnalytics.css';

interface TagData {
    id: string;
    name: string;
    color: string;
    minutes: number;
    count: number;
}

interface TagAnalyticsProps {
    data: TagData[];
}

export default function TagAnalytics({ data }: TagAnalyticsProps) {
    const [view, setView] = useState<'bar' | 'pie'>('bar');

    const totalMinutes = data.reduce((acc, curr) => acc + curr.minutes, 0);
    const topTag = useMemo(() => {
        if (data.length === 0) return null;
        return [...data].sort((a, b) => b.minutes - a.minutes)[0];
    }, [data]);

    return (
        <div className="tag-analytics-container">
            <div className="tag-header">
                <div className="tag-title-row">
                    <Tag size={14} className="tag-icon" />
                    <h3 className="tag-title">WORK BY TAG</h3>
                </div>
                <div className="tag-stats">
                    {topTag && (
                        <>
                            <span className="tag-top" style={{ color: topTag.color }}>{topTag.name}</span>
                            <span className="tag-top-label">most focused</span>
                        </>
                    )}
                </div>
            </div>

            <div className="tag-toggle">
                <button
                    className={`toggle-pill ${view === 'bar' ? 'active' : ''}`}
                    onClick={() => setView('bar')}
                >
                    <BarChart2 size={12} />
                </button>
                <button
                    className={`toggle-pill ${view === 'pie' ? 'active' : ''}`}
                    onClick={() => setView('pie')}
                >
                    <PieIcon size={12} />
                </button>
            </div>

            <div className={`tag-content ${view}`}>
                {data.length === 0 ? (
                    <div className="tag-empty">No tag data yet</div>
                ) : view === 'bar' ? (
                    <div className="tag-list">
                        {data.map((tag) => (
                            <div key={tag.id} className="tag-row">
                                <div className="tag-row-info">
                                    <span className="tag-label">
                                        <span className="tag-dot" style={{ backgroundColor: tag.color }} />
                                        {tag.name}
                                    </span>
                                    <span className="tag-stats-text">{tag.minutes}m</span>
                                </div>
                                <div className="tag-progress-track">
                                    <div
                                        className="tag-progress-fill"
                                        style={{
                                            width: `${totalMinutes > 0 ? (tag.minutes / totalMinutes) * 100 : 0}%`,
                                            backgroundColor: tag.color
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="pie-view">
                        <div className="pie-chart-wrapper">
                            <svg viewBox="0 0 100 100" className="pie-svg">
                                {data.map((tag, index) => {
                                    const percentage = totalMinutes > 0 ? (tag.minutes / totalMinutes) * 100 : 0;
                                    let accumulated = 0;
                                    for (let i = 0; i < index; i++) {
                                        accumulated += totalMinutes > 0 ? (data[i].minutes / totalMinutes) * 100 : 0;
                                    }

                                    const strokeDasharray = `${percentage} ${100 - percentage}`;
                                    const strokeDashoffset = -accumulated;

                                    return (
                                        <circle
                                            key={tag.id}
                                            cx="50"
                                            cy="50"
                                            r="40"
                                            fill="transparent"
                                            stroke={tag.color}
                                            strokeWidth="10"
                                            strokeDasharray={strokeDasharray}
                                            strokeDashoffset={strokeDashoffset}
                                            className="pie-segment"
                                            style={{ animationDelay: `${index * 100}ms` }}
                                        >
                                            <title>{tag.name}: {tag.minutes}m</title>
                                        </circle>
                                    );
                                })}
                            </svg>
                            <div className="pie-center">
                                <span className="total-value">{totalMinutes}</span>
                                <span className="total-label">mins</span>
                            </div>
                        </div>
                        <div className="pie-legend">
                            {data.slice(0, 4).map(tag => (
                                <div key={tag.id} className="legend-item">
                                    <span className="tag-dot" style={{ backgroundColor: tag.color }} />
                                    <span className="legend-name">{tag.name}</span>
                                    <span className="legend-percent">{totalMinutes > 0 ? Math.round((tag.minutes / totalMinutes) * 100) : 0}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="tag-footer">
                <span className="tag-total">{totalMinutes} mins across {data.length} tags</span>
            </div>
        </div>
    );
}
