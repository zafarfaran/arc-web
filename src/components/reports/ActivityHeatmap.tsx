import { useMemo, useRef, useEffect } from 'react';
import './ActivityHeatmap.css';

interface ActivityHeatmapProps {
    data: Record<string, number>; // date string "YYYY-MM-DD" -> count
}

export default function ActivityHeatmap({ data }: ActivityHeatmapProps) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Generate 26 weeks (6 months) of data
    const heatmapView = useMemo(() => {
        const weeks = [];
        const now = new Date();

        // Find the most recent Sunday to start our backward count
        const currentDay = now.getDay();
        const endDate = new Date(now);
        endDate.setDate(now.getDate() + (6 - currentDay)); // Move to Saturday/Sunday end
        endDate.setHours(0, 0, 0, 0);

        // Generate 26 weeks
        for (let w = 25; w >= 0; w--) {
            const weekDays = [];
            for (let d = 0; d < 7; d++) {
                const day = new Date(endDate);
                day.setDate(endDate.getDate() - (w * 7 + (6 - d)));

                const dateKey = day.toISOString().split('T')[0];
                const count = data[dateKey] || 0;

                weekDays.push({
                    date: day,
                    count,
                    isFuture: day > now,
                    isToday: day.toDateString() === now.toDateString()
                });
            }
            weeks.push(weekDays);
        }

        return weeks;
    }, [data]);

    // Extract month labels
    const monthLabels = useMemo(() => {
        const labels: { label: string; index: number }[] = [];
        let lastMonth = -1;

        heatmapView.forEach((week, index) => {
            const firstDayOfWeek = week[0].date;
            const month = firstDayOfWeek.getMonth();
            if (month !== lastMonth) {
                labels.push({
                    label: firstDayOfWeek.toLocaleString('default', { month: 'short' }),
                    index
                });
                lastMonth = month;
            }
        });

        return labels;
    }, [heatmapView]);

    const getIntensity = (count: number) => {
        if (!count || count === 0) return 'level-0';
        if (count <= 1) return 'level-1';
        if (count <= 2) return 'level-2';
        if (count <= 4) return 'level-3';
        return 'level-4';
    };

    // Auto-scroll to end on mount
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
        }
    }, []);

    return (
        <div className="heatmap-container refined">
            <div className="heatmap-header">
                <h3 className="heatmap-title">ACTIVITY INSIGHTS</h3>
                <div className="heatmap-meta">
                    <span className="meta-text">Last 6 Months</span>
                </div>
            </div>

            <div className="heatmap-wrapper">
                <div className="weekday-labels">
                    <span>Mon</span>
                    <span>Wed</span>
                    <span>Fri</span>
                </div>

                <div className="scroll-container" ref={scrollRef}>
                    <div className="heatmap-scroll-area">
                        {/* Month Labels */}
                        <div className="month-labels">
                            {monthLabels.map((m, i) => (
                                <span
                                    key={i}
                                    className="month-label"
                                    style={{ '--offset': m.index } as React.CSSProperties}
                                >
                                    {m.label}
                                </span>
                            ))}
                        </div>

                        {/* Grid */}
                        <div className="heatmap-grid-horizontal">
                            {heatmapView.map((week, wIndex) => (
                                <div key={wIndex} className="heatmap-column">
                                    {week.map((day, dIndex) => {
                                        const intensity = getIntensity(day.count);
                                        return (
                                            <div
                                                key={dIndex}
                                                className={`heatmap-cell ${intensity} ${day.isFuture ? 'future' : ''} ${day.isToday ? 'today' : ''}`}
                                            >
                                                <div className="heatmap-tooltip">
                                                    <span className="tooltip-count">{day.count} activities</span>
                                                    <span className="tooltip-date">
                                                        {day.date.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="heatmap-footer">
                <div className="heatmap-legend">
                    <span>Less</span>
                    <div className="legend-box level-0" />
                    <div className="legend-box level-1" />
                    <div className="legend-box level-2" />
                    <div className="legend-box level-3" />
                    <div className="legend-box level-4" />
                    <span>More</span>
                </div>
            </div>
        </div>
    );
}
