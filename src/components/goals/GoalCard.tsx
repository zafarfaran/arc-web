import React from 'react';
import { useApp } from '../../contexts/AppContext';
import type { Goal } from '../../types';
import { Check, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import { getGoalStatus, getDeadlineWarning, CATEGORY_ICONS } from './GoalsTracker';

interface GoalCardProps {
    goal: Goal;
    onClick: () => void;
    style?: React.CSSProperties;
    // Add props passed from Sortable wrapper
    attributes?: any;
    listeners?: any;
}

export default function GoalCard({ goal, onClick, style, attributes, listeners }: GoalCardProps) {
    const { state } = useApp();
    const status = getGoalStatus(goal);
    const deadlineWarning = getDeadlineWarning(goal);
    const isMilestoneGoal = goal.goalType === 'milestone';
    const completedMilestones = goal.milestones?.filter(m => m.completed).length || 0;
    const totalMilestones = goal.milestones?.length || 1;
    const totalDelta = goal.targetDirection === 'decrease'
        ? goal.startingValue - goal.targetValue
        : goal.targetValue - goal.startingValue;
    const currentDelta = goal.targetDirection === 'decrease'
        ? goal.startingValue - goal.currentValue
        : goal.currentValue - goal.startingValue;
    const progress = isMilestoneGoal
        ? Math.round((completedMilestones / totalMilestones) * 100)
        : Math.max(0, Math.min(100, Math.round((currentDelta / (totalDelta || 1)) * 100)));
    const CategoryIcon = CATEGORY_ICONS[goal.category];

    return (
        <div
            className="goal-card"
            style={{ '--goal-color': goal.color, ...style } as React.CSSProperties}
            data-status={status}
            onClick={onClick}
            {...attributes}
            {...listeners}
        >
            <div className="goal-header">
                <div className="goal-icon" style={{ color: goal.color }}>
                    <CategoryIcon size={20} />
                </div>
                <div className={`goal-status status-${status}`}>
                    {status === 'completed' && <Check size={12} />}
                    {status === 'at-risk' && <AlertTriangle size={12} />}
                    {status === 'overdue' && <AlertTriangle size={12} />}
                    {status === 'on-track' && <TrendingUp size={12} />}
                    <span>{status.replace('-', ' ')}</span>
                </div>
            </div>

            <h3 className="goal-name">{goal.name}</h3>

            <div className="goal-progress">
                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{ width: `${progress}%`, background: goal.color }}
                    />
                </div>
                <div className="progress-text">
                    {isMilestoneGoal ? (
                        <>
                            <span className="progress-value">{completedMilestones}</span>
                            <span className="progress-divider">/</span>
                            <span className="progress-target">{totalMilestones} steps</span>
                        </>
                    ) : (
                        <>
                            <span className="progress-value">{goal.currentValue}</span>
                            <span className="progress-divider">/</span>
                            <span className="progress-target">{goal.targetValue} {goal.unit}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Tags */}
            {goal.tags && goal.tags.length > 0 && (
                <div className="goal-tags">
                    {goal.tags.slice(0, 4).map(tagId => {
                        const tag = state.tags.find(t => t.id === tagId);
                        if (!tag) return null;
                        return (
                            <span
                                key={tagId}
                                className="goal-tag"
                                style={{ '--tag-color': tag.color } as React.CSSProperties}
                            >
                                {tag.name.toUpperCase()}
                            </span>
                        );
                    })}
                    {goal.tags.length > 4 && (
                        <span className="goal-tag-more">+{goal.tags.length - 4}</span>
                    )}
                </div>
            )}

            {/* Deadline Warning Indicator */}
            {deadlineWarning && (
                <div className={`deadline-warning warning-${deadlineWarning}`}>
                    <Clock size={12} />
                    <span>
                        {deadlineWarning === 'urgent' && '1 day left!'}
                        {deadlineWarning === 'soon' && 'Less than 3 days left'}
                        {deadlineWarning === 'upcoming' && 'Less than a week left'}
                    </span>
                </div>
            )}

            <div className="goal-footer">
                <span className="goal-percent">{progress}%</span>
                {goal.deadline && (
                    <span className="goal-deadline">
                        Due {new Date(goal.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                )}
            </div>
        </div>
    );
}
