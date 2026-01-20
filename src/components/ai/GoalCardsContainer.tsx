import { useNavigate } from 'react-router-dom';
import type { Goal } from '../../types';
import GoalCard from '../goals/GoalCard'; // Import default export
import './TaskCard.css'; // Reuse container styles or create new ones? Let's assume we can reuse .task-cards-container styling or similar

interface GoalCardsContainerProps {
    goals: any[]; // Raw backend data
}

const MAX_DISPLAY_GOALS = 5;

const mapToGoal = (raw: any): Goal => ({
    ...raw,
    // Map snake_case to camelCase
    currentValue: raw.current_value || 0,
    targetValue: raw.target_value || 1,
    startingValue: raw.starting_value || 0,
    targetDirection: raw.target_direction || 'increase',
    goalType: raw.goal_type || 'trackable',
    createdAt: raw.created_at ? new Date(raw.created_at) : new Date(),
    deadline: raw.deadline ? new Date(raw.deadline) : undefined,
    // Defaults
    tags: raw.tags || [],
    milestones: raw.milestones || [],
    category: raw.category || 'personal',
    color: raw.color || '#3B82F6',
    icon: raw.icon || 'Target',
    progressHistory: []
});

export function GoalCardsContainer({ goals }: GoalCardsContainerProps) {
    const navigate = useNavigate();

    if (!goals || goals.length === 0) return null;

    const displayedGoals = goals.slice(0, MAX_DISPLAY_GOALS).map(mapToGoal);
    const hasMore = goals.length > MAX_DISPLAY_GOALS;

    const handleGoalClick = (_goalId: string) => {
        // Navigate to profile/goals page
        navigate('/profile?tab=goals');
    };

    return (
        <div className="task-cards-container" style={{ gap: '12px' }}>
            {displayedGoals.map(goal => (
                <div key={goal.id} className="goal-card-wrapper" style={{ minWidth: '280px' }}>
                    <GoalCard
                        goal={goal}
                        onClick={() => handleGoalClick(goal.id)}
                        style={{ margin: 0, width: '100%' }}
                    />
                </div>
            ))}
            {hasMore && (
                <a href="/profile?tab=goals" className="task-view-more-link">
                    View all goals ({goals.length}) →
                </a>
            )}
        </div>
    );
}
