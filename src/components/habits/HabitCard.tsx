import React from 'react';
import { useApp } from '../../contexts/AppContext';
import type { Habit } from '../../types';
import { Flame, Check, Dumbbell, GripVertical } from 'lucide-react';
import { ICON_MAP } from './HabitTracker';

interface HabitCardProps {
    habit: Habit;
    today: string;
    onToggle: (id: string, date: string) => void;
    onClick: () => void;
    style?: React.CSSProperties;
    attributes?: any;
    listeners?: any;
    variant?: 'full' | 'summary';
    completionRate?: number;
}

export default function HabitCard({
    habit,
    today,
    onToggle,
    onClick,
    style,
    attributes,
    listeners,
    variant = 'full',
    completionRate = 0
}: HabitCardProps) {
    const { state } = useApp();
    const isCompletedToday = habit.completedDates.includes(today);
    const IconComponent = ICON_MAP[habit.icon] || Dumbbell;

    const toggleToday = (e: React.MouseEvent) => {
        e.stopPropagation();
        onToggle(habit.id, today);
    };

    // Get last 7 days for weekly view
    const getWeekDays = () => {
        const days = [];
        const todayDate = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(todayDate);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayOfWeek = date.getDay();
            const isTargetDay = habit.targetDays.includes(dayOfWeek);
            const isCompleted = habit.completedDates.includes(dateStr);
            const dayLabel = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][dayOfWeek];
            days.push({ dateStr, dayLabel, isTargetDay, isCompleted, isToday: i === 0 });
        }
        return days;
    };

    const weekDays = getWeekDays();
    const habitTags = habit.tags?.map(tagId => state.tags.find(t => t.id === tagId)).filter(Boolean) || [];

    // Summary variant for MY HABITS section
    if (variant === 'summary') {
        return (
            <div
                className="habit-card-summary"
                style={{ '--habit-color': habit.color, ...style } as React.CSSProperties}
                onClick={onClick}
            >
                <div className="habit-summary-content">
                    <div className="habit-grip" {...attributes} {...listeners}>
                        <GripVertical size={16} />
                    </div>
                    <div className="habit-info">
                        <div className="habit-name">{habit.name}</div>
                        <div className="habit-rate">{completionRate}%</div>
                    </div>
                </div>
            </div>
        );
    }

    // Full sticky note variant
    return (
        <div
            className="habit-card"
            style={{ '--habit-color': habit.color, ...style } as React.CSSProperties}
            onClick={onClick}
            {...attributes}
            {...listeners}
        >
            <div className="habit-header">
                <div className="habit-icon" style={{ background: habit.color }}>
                    <IconComponent size={18} />
                </div>
                <div className="habit-streak">
                    <Flame size={12} />
                    <span>{habit.streakCount}</span>
                </div>
            </div>

            <h3 className="habit-name">{habit.name}</h3>

            {/* Weekly View */}
            <div className="habit-week">
                {weekDays.map((day) => (
                    <div
                        key={day.dateStr}
                        className={`week-day ${day.isTargetDay ? 'target' : 'off'} ${day.isCompleted ? 'completed' : ''} ${day.isToday ? 'today' : ''}`}
                        title={day.dateStr}
                    >
                        <span className="day-label">{day.dayLabel}</span>
                        <span className="day-dot">{day.isCompleted ? '✓' : ''}</span>
                    </div>
                ))}
            </div>

            {/* Tags */}
            {habitTags.length > 0 && (
                <div className="habit-tags">
                    {habitTags.slice(0, 4).map((tag: any) => (
                        <span key={tag.id} className="habit-tag" style={{ background: tag.color }}>
                            {tag.name.toUpperCase()}
                        </span>
                    ))}
                    {habitTags.length > 4 && <span className="habit-tag-more">+{habitTags.length - 4}</span>}
                </div>
            )}

            <button
                className={`habit-check-btn ${isCompletedToday ? 'completed' : ''}`}
                onClick={toggleToday}
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
            >
                {isCompletedToday && <Check size={14} />}
                <span>{isCompletedToday ? 'Done' : 'Check In'}</span>
            </button>
        </div>
    );
}
