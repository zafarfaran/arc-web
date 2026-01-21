// ========================================
// Habit Tracker - Drag-Drop to Day Columns
// ========================================

import { useState, useMemo } from 'react';
import { Plus, Dumbbell, Book, Footprints, Heart, Droplet, Apple, Moon, PenTool, Target, Palette, Music, Sprout, GripVertical, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
import {
    DndContext,
    pointerWithin,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    useDraggable,
    useDroppable,
    DragOverlay,
    TouchSensor,
    MeasuringStrategy,
    type DragEndEvent,
    type DragStartEvent
} from '@dnd-kit/core';
import { useApp } from '../../contexts/AppContext';
import type { Habit } from '../../types';
import AddHabitForm from './AddHabitForm';
import HabitDetailModal from './HabitDetailModal';
import './HabitTracker.css';

// Icon mapping
export const ICON_MAP: Record<string, React.ComponentType<{ size?: number }>> = {
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

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Draggable Habit Card for the bank
function DraggableHabitCard({ habit, completionRate, onClick }: {
    habit: Habit;
    completionRate: number;
    onClick: () => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        isDragging,
    } = useDraggable({
        id: habit.id,
        data: { habit }
    });

    const style = {
        opacity: isDragging ? 0.4 : 1,
        touchAction: 'none',
    };

    return (
        <div
            ref={setNodeRef}
            style={{ ...style, '--habit-color': habit.color } as React.CSSProperties}
            className={`habit-card-summary ${isDragging ? 'dragging' : ''}`}
            onClick={onClick}
            {...attributes}
            {...listeners}
        >
            <div className="habit-summary-content">
                <div className="habit-icon">
                    {(() => {
                        const IconComponent = ICON_MAP[habit.icon as keyof typeof ICON_MAP] || Dumbbell;
                        return <IconComponent size={16} />;
                    })()}
                </div>
                <div className="habit-info">
                    <div className="habit-name">{habit.name}</div>
                    <div className="habit-rate">{completionRate}%</div>
                </div>
                <div className="habit-grip-hint">
                    <GripVertical size={14} />
                </div>
            </div>
        </div>
    );
}

// Droppable Day Column
function DroppableDayColumn({
    dayIndex,
    dayHabits,
    dateStr,
    isSelected,
    onToggleHabit,
    onHabitClick,
    onRemoveFromDay
}: {
    dayIndex: number;
    dayHabits: Habit[];
    dateStr: string;
    isSelected: boolean;
    onToggleHabit: (habitId: string, dateStr: string, e: React.MouseEvent) => void;
    onHabitClick: (habit: Habit) => void;
    onRemoveFromDay: (habitId: string, dayIndex: number) => void;
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: `day-${dayIndex}`,
        data: { dayIndex }
    });

    return (
        <div
            ref={setNodeRef}
            className={`day-column ${isSelected ? 'selected' : ''} ${isOver ? 'drag-over' : ''}`}
        >
            {dayHabits.length === 0 ? (
                <div className="day-empty">
                    <span>Drop habits here</span>
                </div>
            ) : (
                <div className="day-habits">
                    {dayHabits.map((habit: Habit) => {
                        const isCompleted = habit.completedDates.includes(dateStr);

                        return (
                            <div
                                key={habit.id}
                                className={`compact-habit-card ${isCompleted ? 'completed' : ''}`}
                                style={{ '--habit-color': habit.color } as React.CSSProperties}
                                onClick={() => onHabitClick(habit)}
                            >
                                <button
                                    className={`compact-checkbox ${isCompleted ? 'checked' : ''}`}
                                    onClick={(e) => onToggleHabit(habit.id, dateStr, e)}
                                    aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
                                >
                                    {isCompleted && <Check size={12} />}
                                </button>
                                <span className="compact-habit-icon">
                                    {(() => {
                                        const IconComponent = ICON_MAP[habit.icon as keyof typeof ICON_MAP] || Dumbbell;
                                        return <IconComponent size={14} />;
                                    })()}
                                </span>
                                <span className={`compact-habit-name ${isCompleted ? 'done' : ''}`}>
                                    {habit.name}
                                </span>
                                <button
                                    className="remove-from-day"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveFromDay(habit.id, dayIndex);
                                    }}
                                    aria-label="Remove from this day"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// Droppable Day Tab (Mobile friendly target)
function DroppableDayTab({
    dayIndex,
    dayName,
    isToday,
    isActive,
    onClick
}: {
    dayIndex: number;
    dayName: string;
    isToday: boolean;
    isActive: boolean;
    onClick: () => void;
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: `tab-${dayIndex}`,
        data: { dayIndex }
    });

    return (
        <button
            ref={setNodeRef}
            className={`day-tab ${isActive ? 'active' : ''} ${isToday ? 'today' : ''} ${isOver ? 'drag-over-tab' : ''}`}
            onClick={onClick}
        >
            {dayName}
            {isToday && <span className="today-dot" />}
        </button>
    );
}

const HABITS_PER_PAGE = 15;

export default function HabitTracker() {
    const { state, toggleHabitDay, deleteHabit, updateHabit } = useApp();
    const { habits } = state;
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
    const [selectedDayIndex, setSelectedDayIndex] = useState(new Date().getDay());
    const [activeId, setActiveId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);

    const pointerSensor = useSensor(PointerSensor, {
        activationConstraint: { distance: 8 },
    });
    const touchSensor = useSensor(TouchSensor, {
        activationConstraint: { delay: 200, tolerance: 8 },
    });
    const keyboardSensor = useSensor(KeyboardSensor);
    const sensors = useSensors(pointerSensor, touchSensor, keyboardSensor);

    // Get current week dates (Sunday to Saturday)
    const weekDates = useMemo(() => {
        const now = new Date();
        const currentDay = now.getDay();
        const dates = [];

        for (let i = 0; i < 7; i++) {
            const date = new Date(now);
            date.setDate(now.getDate() - currentDay + i);
            dates.push({
                date: date.toISOString().split('T')[0],
                dayIndex: i,
                dayName: DAY_NAMES[i],
                isToday: i === currentDay
            });
        }
        return dates;
    }, []);

    // Calculate weekly completion rate
    const calculateWeeklyCompletion = () => {
        let totalTargets = 0;
        let totalCompleted = 0;

        weekDates.forEach(({ date, dayIndex }) => {
            habits.forEach((habit: Habit) => {
                if (habit.targetDays.includes(dayIndex)) {
                    totalTargets++;
                    if (habit.completedDates.includes(date)) {
                        totalCompleted++;
                    }
                }
            });
        });

        return totalTargets > 0 ? (totalCompleted / totalTargets) * 100 : 0;
    };

    const weeklyCompletionRate = calculateWeeklyCompletion();

    // Calculate completion percentage for each habit
    const getHabitCompletionRate = (habit: Habit) => {
        let totalTargets = 0;
        let completed = 0;

        weekDates.forEach(({ date, dayIndex }) => {
            if (habit.targetDays.includes(dayIndex)) {
                totalTargets++;
                if (habit.completedDates.includes(date)) {
                    completed++;
                }
            }
        });

        return totalTargets > 0 ? Math.round((completed / totalTargets) * 100) : 0;
    };

    // Pagination logic for the bank
    const totalPages = Math.ceil(habits.length / HABITS_PER_PAGE);
    const startIndex = (currentPage - 1) * HABITS_PER_PAGE;
    const endIndex = startIndex + HABITS_PER_PAGE;
    const paginatedHabits = useMemo(() => {
        return habits.slice(startIndex, endIndex);
    }, [habits, startIndex, endIndex]);

    // Handle page navigation with animation
    const handlePageChange = (newPage: number) => {
        const direction = newPage > currentPage ? 'left' : 'right';
        setSlideDirection(direction);
        setTimeout(() => {
            setCurrentPage(newPage);
            setSlideDirection(null);
        }, 150);
    };

    // Get habits for a specific day
    const getHabitsForDay = (dayIndex: number) => {
        return habits.filter((habit: Habit) => habit.targetDays.includes(dayIndex));
    };

    const handleHabitClick = (habit: Habit) => {
        setSelectedHabit(habit);
    };

    const handleEdit = () => {
        if (selectedHabit) {
            setEditingHabit(selectedHabit);
            setSelectedHabit(null);
        }
    };

    const handleDelete = () => {
        if (selectedHabit) {
            deleteHabit(selectedHabit.id);
        }
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const overId = over.id as string;
        const data = over.data.current as { dayIndex: number } | undefined;
        let dayIndex = -1;

        if (overId.startsWith('day-')) {
            dayIndex = parseInt(overId.replace('day-', ''));
        } else if (overId.startsWith('tab-')) {
            dayIndex = data?.dayIndex ?? parseInt(overId.replace('tab-', ''));
        }

        if (dayIndex !== -1) {
            const habitId = active.id as string;
            const habit = habits.find(h => h.id === habitId);

            if (habit) {
                // Switch view immediately to show result
                setSelectedDayIndex(dayIndex);

                if (!habit.targetDays.includes(dayIndex)) {
                    updateHabit(habitId, {
                        targetDays: [...habit.targetDays, dayIndex].sort()
                    });
                }
            }
        }
    };

    const handleToggleHabit = (habitId: string, dateStr: string, e: React.MouseEvent) => {
        e.stopPropagation();
        toggleHabitDay(habitId, dateStr);
    };

    const handleRemoveFromDay = (habitId: string, dayIndex: number) => {
        const habit = habits.find(h => h.id === habitId);
        if (habit) {
            updateHabit(habitId, {
                targetDays: habit.targetDays.filter(d => d !== dayIndex)
            });
        }
    };

    const activeHabit = activeId ? habits.find(h => h.id === activeId) : null;

    return (
        <div className="habits-screen">
            {/* Header */}
            <div className="habits-header">
                <div className="habits-brand">
                    <span className="brand-dot" />
                    <span className="brand-name">HABITS</span>
                </div>
            </div>

            {/* Minimal Progress Bar */}
            <div className="progress-section">
                <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${weeklyCompletionRate}%` }} />
                </div>
                <div className="progress-right">
                    <span className="progress-count">{habits.length}</span>
                    <button
                        className="add-btn-header"
                        onClick={() => setShowAddForm(true)}
                        aria-label="Add habit"
                    >
                        <Plus size={18} />
                    </button>
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={pointerWithin}
                measuring={{
                    droppable: {
                        strategy: MeasuringStrategy.Always,
                    },
                }}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                {/* My Habits Section (Bank) */}
                <div className="my-habits-section">
                    <div className="section-header-row">
                        <div className="controls-left">
                            <h2 className="my-habits-title">MY HABITS</h2>

                            {/* Pagination Controls - Mini variant */}
                            {totalPages > 1 && (
                                <div className="pagination-controls mini">
                                    <button
                                        className="pagination-btn"
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1 || slideDirection !== null}
                                        aria-label="Previous page"
                                    >
                                        <ChevronLeft size={14} />
                                    </button>
                                    <div className="pagination-info">
                                        <span className="pagination-current">{currentPage}</span>
                                        <span className="pagination-separator">/</span>
                                        <span className="pagination-total">{totalPages}</span>
                                    </div>
                                    <button
                                        className="pagination-btn"
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages || slideDirection !== null}
                                        aria-label="Next page"
                                    >
                                        <ChevronRight size={14} />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {habits.length > 0 && (
                        <div
                            key={currentPage}
                            className={`my-habits-grid ${slideDirection ? `slide-${slideDirection}` : ''}`}
                        >
                            {paginatedHabits.map((habit: Habit) => (
                                <DraggableHabitCard
                                    key={habit.id}
                                    habit={habit}
                                    completionRate={getHabitCompletionRate(habit)}
                                    onClick={() => handleHabitClick(habit)}
                                />
                            ))}
                        </div>
                    )}

                    {habits.length === 0 && (
                        <div className="habits-empty">
                            <span>No habits yet. Create one to get started!</span>
                        </div>
                    )}
                </div>

                {/* Weekly View */}
                <div className="weekly-view">
                    {/* Day Tabs */}
                    <div className="day-tabs">
                        {weekDates.map(({ dayIndex, dayName, isToday }) => (
                            <DroppableDayTab
                                key={dayIndex}
                                dayIndex={dayIndex}
                                dayName={dayName}
                                isToday={isToday}
                                isActive={selectedDayIndex === dayIndex}
                                onClick={() => setSelectedDayIndex(dayIndex)}
                            />
                        ))}
                    </div>

                    {/* Day Columns - Droppable */}
                    <div className="day-columns">
                        {weekDates.map(({ dayIndex, date }) => (
                            <DroppableDayColumn
                                key={dayIndex}
                                dayIndex={dayIndex}
                                dayHabits={getHabitsForDay(dayIndex)}
                                dateStr={date}
                                isSelected={selectedDayIndex === dayIndex}
                                onToggleHabit={handleToggleHabit}
                                onHabitClick={handleHabitClick}
                                onRemoveFromDay={handleRemoveFromDay}
                            />
                        ))}
                    </div>
                </div>

                {/* Drag Overlay */}
                <DragOverlay>
                    {activeHabit ? (
                        <div
                            className="habit-card-summary dragging"
                            style={{ '--habit-color': activeHabit.color, pointerEvents: 'none' } as React.CSSProperties}
                        >
                            <div className="habit-summary-content">
                                <div className="habit-icon">
                                    {(() => {
                                        const IconComponent = ICON_MAP[activeHabit.icon as keyof typeof ICON_MAP] || Dumbbell;
                                        return <IconComponent size={16} />;
                                    })()}
                                </div>
                                <div className="habit-info">
                                    <div className="habit-name">{activeHabit.name}</div>
                                    <div className="habit-rate">{getHabitCompletionRate(activeHabit)}%</div>
                                </div>
                                <div className="habit-grip-hint">
                                    <GripVertical size={14} />
                                </div>
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Modals */}
            {showAddForm && <AddHabitForm onClose={() => setShowAddForm(false)} />}
            {editingHabit && (
                <AddHabitForm
                    editHabit={editingHabit}
                    onClose={() => setEditingHabit(null)}
                />
            )}
            {selectedHabit && (
                <HabitDetailModal
                    habit={selectedHabit}
                    onClose={() => setSelectedHabit(null)}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            )}
        </div>
    );
}
