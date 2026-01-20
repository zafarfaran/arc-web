import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext'; // Access live state
import HabitCard from '../habits/HabitCard';
import type { Habit } from '../../types';

interface HabitCardsContainerProps {
    habits: any[]; // Raw data from AI tool
}

const MAX_DISPLAY_HABITS = 5;

// Helper to map raw API data to a temporary Habit object if not found in state
const mapFallbackHabit = (raw: any): Habit => ({
    id: raw.id,
    name: raw.name,
    icon: raw.icon || 'dumbbell',
    color: raw.color || '#3B82F6',
    streakCount: raw.streak_count || 0,
    completedDates: raw.completed_today ? [new Date().toISOString().split('T')[0]] : [],
    targetDays: raw.target_days || [],
    tags: raw.tags || [],
    createdAt: new Date()
});

export function HabitCardsContainer({ habits }: HabitCardsContainerProps) {
    const navigate = useNavigate();
    const { state, toggleHabitDay } = useApp();
    const today = new Date().toISOString().split('T')[0];

    if (!habits || habits.length === 0) return null;

    // Resolve AI habits to Real habits from state to ensure interactivity
    const resolvedHabits = habits.slice(0, MAX_DISPLAY_HABITS).map(aiHabit => {
        const realHabit = state.habits.find(h => h.id === aiHabit.id);
        return realHabit || mapFallbackHabit(aiHabit);
    });

    const hasMore = habits.length > MAX_DISPLAY_HABITS;

    const handleHabitClick = () => {
        navigate('/habits');
    };

    return (
        <div className="habit-cards-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            {resolvedHabits.map(habit => (
                <div key={habit.id} className="habit-card-wrapper" style={{ transform: 'scale(0.95)', transformOrigin: 'left', width: '105%' }}>
                    <HabitCard
                        habit={habit}
                        today={today}
                        onToggle={toggleHabitDay} // LIVE toggling!
                        onClick={handleHabitClick}
                        // Pass required dnd-kit props as empty since we aren't dragging here
                        attributes={{}}
                        listeners={{}}
                        style={{ margin: 0 }}
                    />
                </div>
            ))}
            {hasMore && (
                <a href="/habits" style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    textDecoration: 'none',
                    marginTop: '4px',
                    display: 'block'
                }}>
                    View all habits ({habits.length}) →
                </a>
            )}
        </div>
    );
}
