import { useApp } from '../../contexts/AppContext';
import { RANK_INFO } from '../../types';
import { getRankProgress, getXpToNextRank } from '../../services/xpService';
import RankIcon from '../xp/RankIcon';

import ActivityHeatmap from './ActivityHeatmap';
import FocusTimeChart from './FocusTimeChart';
import TagAnalytics from './TagAnalytics';
import TrendCards from './TrendCards';
import ProductivityTimeChart from './ProductivityTimeChart';
import WeeklyRhythmChart from './WeeklyRhythmChart';
import ComparisonChart from './ComparisonChart';
import RecentActivity from './RecentActivity';
import XPTrendsChart from './XPTrendsChart';
import {
    getHeatmapData,
    getWeeklyFocusData,
    getTagAnalytics,
    getProductivityTrends,
    getHistoricalTrend,
    getHourlyProductivityData,
    getDayOfWeekData,
    getWeeklyComparisonData
} from '../../utils/analyticsUtils';
import './Reports.css';

export default function Reports() {
    const { state } = useApp();
    const { sessions, todos, tags, habits, user } = state;

    // Process data
    const heatmapData = getHeatmapData(sessions, todos, habits);
    const weeklyFocusData = getWeeklyFocusData(sessions);
    const tagData = getTagAnalytics(sessions, tags, 'week');
    const trendsData = getProductivityTrends(sessions, todos);
    const historyData = getHistoricalTrend(sessions);
    const hourlyData = getHourlyProductivityData(sessions);
    const rhythmData = getDayOfWeekData(sessions);
    const comparisonData = getWeeklyComparisonData(sessions);

    // Global stats
    const totalFocusMinutes = sessions.filter(s => s.status === 'completed' && s.mode === 'focus')
        .reduce((acc, s) => acc + (s.actualDuration || s.duration) / 60, 0);

    const hasData = sessions.length > 0 || todos.some(t => t.completed) || habits.some(h => h.completedDates.length > 0);

    return (
        <div className="reports-container">
            {/* Summary Stats */}
            <div className="summary-stats-section">
                <div className="summary-stat">
                    <span className="summary-label">TOTAL FOCUS</span>
                    <span className="summary-value">{Math.floor(totalFocusMinutes / 60)}h {Math.round(totalFocusMinutes % 60)}m</span>
                </div>
                <div className="summary-stat">
                    <span className="summary-label">SESSIONS</span>
                    <span className="summary-value">{sessions.filter(s => s.status === 'completed').length}</span>
                </div>
                <div className="summary-stat">
                    <span className="summary-label">TASKS DONE</span>
                    <span className="summary-value">{todos.filter(t => t.completed).length}</span>
                </div>
                <div className="summary-stat">
                    <span className="summary-label">HABIT STREAK</span>
                    <span className="summary-value">{Math.max(...habits.map(h => h.streakCount), 0)}</span>
                </div>
                {user?.xp && (
                    <div className="summary-stat rank-stat">
                        <span className="summary-label">RANK</span>
                        <div className="rank-summary-row">
                            <RankIcon rank={user.xp.rank} size={20} />
                            <span className="summary-value" style={{ color: RANK_INFO[user.xp.rank]?.color }}>
                                {RANK_INFO[user.xp.rank]?.name}
                            </span>
                        </div>
                        <div className="rank-progress-mini">
                            <div
                                className="rank-progress-fill"
                                style={{
                                    width: `${getRankProgress(user.xp.totalXp)}%`,
                                    background: RANK_INFO[user.xp.rank]?.color
                                }}
                            />
                        </div>
                        <span className="rank-xp-label">
                            {user.xp.totalXp} XP • {getXpToNextRank(user.xp.totalXp).xpNeeded} to next
                        </span>
                    </div>
                )}
            </div>

            {!hasData ? (
                <div className="empty-state-container">
                    <div className="empty-state-message">
                        <h3>No data yet</h3>
                        <p>Complete your first focus session to see insights here.</p>
                    </div>
                </div>
            ) : (
                <div className="reports-grid">
                    {/* Trends Section */}
                    <TrendCards trends={trendsData} history={historyData} />

                    <div className="reports-row">
                        <div className="reports-col-8">
                            <ActivityHeatmap data={heatmapData} />
                            <ProductivityTimeChart data={hourlyData} weeklyData={rhythmData} />
                            <ComparisonChart data={comparisonData} />
                        </div>
                        <div className="reports-col-4">
                            <FocusTimeChart data={weeklyFocusData} />
                            <WeeklyRhythmChart data={rhythmData} dailyData={hourlyData} />
                            <XPTrendsChart />
                            <TagAnalytics data={tagData} />
                            <RecentActivity />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

