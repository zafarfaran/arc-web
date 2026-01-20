// ========================================
// Habit Detail Modal - With Animations
// ========================================

import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Edit2, Trash2, Flame, Dumbbell, Book, Footprints, Heart, Droplet, Apple, Moon, PenTool, Target, Palette, Music, Sprout } from 'lucide-react';
import type { Habit } from '../../types';
import './HabitDetailModal.css';

interface HabitDetailModalProps {
    habit: Habit;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

// Icon mapping
const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
    dumbbell: Dumbbell,
    book: Book,
    footprints: Footprints,
    heart: Heart,
    droplet: Droplet,
    apple: Apple,
    moon: Moon,
    pen: PenTool,
    target: Target,
    palette: Palette,
    music: Music,
    sprout: Sprout,
};

// Number counting animation hook
function useCountUp(end: number, duration: number = 800) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);

            // Ease out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(easeProgress * end));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration]);

    return count;
}

export default function HabitDetailModal({ habit, onClose, onEdit, onDelete }: HabitDetailModalProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [calendarKey, setCalendarKey] = useState(0);

    const IconComponent = ICON_MAP[habit.icon] || Dumbbell;
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Get calendar days for current month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    // Calculate stats
    const thisMonthCompletions = habit.completedDates.filter(date => {
        const d = new Date(date);
        return d.getMonth() === month && d.getFullYear() === year;
    }).length;

    const targetDaysThisMonth = Array.from({ length: daysInMonth }, (_, i) => {
        const date = new Date(year, month, i + 1);
        return habit.targetDays.includes(date.getDay()) ? 1 : 0;
    }).reduce((a: number, b: number) => a + b, 0);

    const completionRate = targetDaysThisMonth > 0
        ? Math.round((thisMonthCompletions / targetDaysThisMonth) * 100)
        : 0;

    // Animated counts
    const animatedStreak = useCountUp(habit.streakCount);
    const animatedRate = useCountUp(completionRate);
    const animatedTotal = useCountUp(habit.completedDates.length);

    const previousMonth = () => {
        setCurrentMonth(new Date(year, month - 1, 1));
        setCalendarKey(prev => prev + 1);
    };

    const nextMonth = () => {
        const now = new Date();
        if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth())) {
            setCurrentMonth(new Date(year, month + 1, 1));
            setCalendarKey(prev => prev + 1);
        }
    };

    const handleDelete = () => {
        onDelete();
        onClose();
    };

    const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const canGoNext = currentMonth < new Date();

    return (
        <div className="modal-overlay modal-fade-in" onClick={onClose}>
            <div className="modal-content habit-detail-modal modal-slide-up" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div className="habit-detail-title">
                        <div className="habit-icon-large" style={{ color: habit.color }}>
                            <IconComponent size={32} />
                        </div>
                        <h2 className="modal-title">{habit.name}</h2>
                    </div>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Stats - Animated */}
                <div className="habit-stats-row">
                    <div className="stat-card stat-fade-in" style={{ animationDelay: '100ms' }}>
                        <div className="stat-value streak-value">
                            <span>{animatedStreak}</span>
                            <div className="streak-icon-wrapper">
                                <Flame size={20} className="streak-icon" />
                            </div>
                        </div>
                        <div className="stat-label">
                            <span>Current Streak</span>
                        </div>
                    </div>
                    <div className="stat-card stat-fade-in" style={{ animationDelay: '200ms' }}>
                        <div className="stat-value">{animatedRate}%</div>
                        <div className="stat-label">This Month</div>
                    </div>
                    <div className="stat-card stat-fade-in" style={{ animationDelay: '300ms' }}>
                        <div className="stat-value">{animatedTotal}</div>
                        <div className="stat-label">Total Days</div>
                    </div>
                </div>

                {/* Calendar */}
                <div className="calendar-section">
                    <div className="calendar-header">
                        <button className="btn btn-ghost btn-icon" onClick={previousMonth}>
                            <ChevronLeft size={20} />
                        </button>
                        <h3 className="calendar-title">{monthName}</h3>
                        <button
                            className="btn btn-ghost btn-icon"
                            onClick={nextMonth}
                            disabled={!canGoNext}
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="calendar-progress">
                        <div
                            className="calendar-progress-fill"
                            style={{
                                width: `${completionRate}%`,
                                background: habit.color
                            }}
                        />
                    </div>

                    <div className="calendar-grid" key={calendarKey}>
                        {/* Day headers */}
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                            <div key={i} className="calendar-day-header">{day}</div>
                        ))}

                        {/* Empty cells for days before month starts */}
                        {Array.from({ length: startDayOfWeek }).map((_, i) => (
                            <div key={`empty-${i}`} className="calendar-day empty" />
                        ))}

                        {/* Days of month - Staggered animation */}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const date = new Date(year, month, day);
                            const dateStr = date.toISOString().split('T')[0];
                            const isCompleted = habit.completedDates.includes(dateStr);
                            const isTargetDay = habit.targetDays.includes(date.getDay());
                            const isToday = dateStr === new Date().toISOString().split('T')[0];

                            return (
                                <div
                                    key={day}
                                    className={`calendar-day calendar-day-fade ${isCompleted ? 'completed' : ''} ${isTargetDay ? 'target' : ''} ${isToday ? 'today' : ''}`}
                                    style={{
                                        '--habit-color': habit.color,
                                        animationDelay: `${Math.floor(i / 7) * 50}ms`
                                    } as React.CSSProperties}
                                >
                                    {day}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Actions */}
                <div className="modal-footer">
                    {showDeleteConfirm ? (
                        <>
                            <span className="delete-confirm-text">Delete this habit?</span>
                            <button className="btn btn-ghost" onClick={() => setShowDeleteConfirm(false)}>
                                Cancel
                            </button>
                            <button className="btn btn-danger" onClick={handleDelete}>
                                Delete
                            </button>
                        </>
                    ) : (
                        <>
                            <button className="btn btn-ghost" onClick={() => setShowDeleteConfirm(true)}>
                                <Trash2 size={16} />
                                Delete
                            </button>
                            <button className="btn btn-primary" onClick={onEdit}>
                                <Edit2 size={16} />
                                Edit
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
