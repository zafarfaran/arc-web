// ========================================
// Goals Tracker - Main Component
// ========================================

import { useState, useMemo } from 'react';
import { Plus, TrendingUp, AlertTriangle, Check, Target, DollarSign, Users, Dumbbell, GraduationCap, Briefcase, User, ChevronLeft, ChevronRight } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    type DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy
} from '@dnd-kit/sortable';
import { useApp } from '../../contexts/AppContext';
import type { Goal } from '../../types';
import AddGoalForm from './AddGoalForm';
import GoalDetailModal from './GoalDetailModal';
import SortableGoalCard from './SortableGoalCard';
import './GoalsTracker.css';

// Category icons
const CATEGORY_ICONS: Record<Goal['category'], React.ComponentType<{ size?: number }>> = {
    financial: DollarSign,
    social: Users,
    fitness: Dumbbell,
    learning: GraduationCap,
    career: Briefcase,
    personal: User,
};

// Goal time-based progress status
function getTimeBasedStatus(goal: Goal): 'ahead' | 'on-track' | 'behind' {
    if (goal.completedAt) return 'ahead';
    if (!goal.deadline) return 'on-track';

    const now = new Date().getTime();
    const start = new Date(goal.createdAt).getTime();
    const end = new Date(goal.deadline).getTime();

    const totalTime = end - start;
    const timeElapsed = now - start;
    const timePercent = totalTime > 0 ? Math.max(0, Math.min(100, (timeElapsed / totalTime) * 100)) : 100;

    // Calculate progress %
    let progressPercent: number;
    if (goal.goalType === 'milestone' && goal.milestones) {
        const completed = goal.milestones.filter(m => m.completed).length;
        progressPercent = (completed / goal.milestones.length) * 100;
    } else {
        const totalDelta = goal.targetDirection === 'decrease'
            ? goal.startingValue - goal.targetValue
            : goal.targetValue - goal.startingValue;
        const currentDelta = goal.targetDirection === 'decrease'
            ? goal.startingValue - goal.currentValue
            : goal.currentValue - goal.startingValue;
        progressPercent = totalDelta === 0 ? 100 : (currentDelta / totalDelta) * 100;
    }

    if (progressPercent > timePercent + 10) return 'ahead';
    if (progressPercent < timePercent - 10) return 'behind';
    return 'on-track';
}

function getGoalStatus(goal: Goal): 'completed' | 'on-track' | 'at-risk' | 'overdue' {
    // Check actual completion state first (not just completedAt)
    // This ensures goals are properly re-evaluated when milestones/targets change
    if (goal.goalType === 'milestone' && goal.milestones) {
        const allComplete = goal.milestones.every(m => m.completed);
        if (allComplete) return 'completed';
    } else {
        const isCompleted = goal.targetDirection === 'decrease'
            ? goal.currentValue <= goal.targetValue
            : goal.currentValue >= goal.targetValue;
        if (isCompleted) return 'completed';
    }

    if (!goal.deadline) {
        return 'on-track';
    }

    const now = new Date();
    const deadline = new Date(goal.deadline);
    if (now > deadline) return 'overdue';

    const timeStatus = getTimeBasedStatus(goal);
    if (timeStatus === 'behind') return 'at-risk';

    return 'on-track';
}

// Calculate deadline warning level for goals approaching their due date
function getDeadlineWarning(goal: Goal): 'urgent' | 'soon' | 'upcoming' | null {
    if (!goal.deadline || getGoalStatus(goal) === 'completed') return null;

    const now = new Date();
    const deadline = new Date(goal.deadline);
    const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining <= 0) return null; // Already overdue, handled by status
    if (daysRemaining <= 1) return 'urgent';    // 1 day or less
    if (daysRemaining <= 3) return 'soon';      // 2-3 days
    if (daysRemaining <= 7) return 'upcoming';  // 4-7 days
    return null;
}

type GoalFilter = 'all' | 'on-track' | 'at-risk' | 'completed';

const GOALS_PER_PAGE = 20;

export default function GoalsTracker() {
    const { state, deleteGoal, reorderGoals } = useApp();
    const { goals } = state;
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
    const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
    const [filter, setFilter] = useState<GoalFilter>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 200,
                tolerance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Find actual goal objects from state to ensure reactivity
    const selectedGoal = goals.find(g => g.id === selectedGoalId) || null;
    const editingGoal = goals.find(g => g.id === editingGoalId) || null;

    // Apply filter
    const filteredGoals = useMemo(() => {
        return goals.filter((g: Goal) => {
            const status = getGoalStatus(g);
            if (filter === 'completed') return status === 'completed';
            if (filter === 'on-track') return status === 'on-track';
            if (filter === 'at-risk') return status === 'at-risk' || status === 'overdue';
            return true;
        });
    }, [goals, filter]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredGoals.length / GOALS_PER_PAGE);
    const startIndex = (currentPage - 1) * GOALS_PER_PAGE;
    const endIndex = startIndex + GOALS_PER_PAGE;
    const paginatedGoals = useMemo(() => {
        return filteredGoals.slice(startIndex, endIndex);
    }, [filteredGoals, startIndex, endIndex]);

    // Reset to page 1 when filter changes
    const handleFilterChange = (newFilter: GoalFilter) => {
        setSlideDirection('right');
        setTimeout(() => {
            setFilter(newFilter);
            setCurrentPage(1);
            setSlideDirection(null);
        }, 150);
    };

    // Handle page navigation with animation
    const handlePageChange = (newPage: number) => {
        const direction = newPage > currentPage ? 'left' : 'right';
        setSlideDirection(direction);
        setTimeout(() => {
            setCurrentPage(newPage);
            setSlideDirection(null);
        }, 150);
    };

    // Counts
    const activeGoals = goals.filter((g: Goal) => getGoalStatus(g) !== 'completed');
    const aheadCount = activeGoals.filter(g => getTimeBasedStatus(g) === 'ahead').length;
    const onTrackCount = activeGoals.filter(g => getTimeBasedStatus(g) === 'on-track').length;
    const behindCount = activeGoals.filter(g => getTimeBasedStatus(g) === 'behind').length;
    const atRiskCount = activeGoals.filter(g => getGoalStatus(g) === 'at-risk' || getGoalStatus(g) === 'overdue').length;
    const completedCount = goals.filter((g: Goal) => getGoalStatus(g) === 'completed').length;

    const handleGoalClick = (goal: Goal) => {
        setSelectedGoalId(goal.id);
    };

    const handleEdit = () => {
        if (selectedGoalId) {
            setEditingGoalId(selectedGoalId);
            setSelectedGoalId(null);
        }
    };

    const handleDelete = () => {
        if (selectedGoalId) {
            deleteGoal(selectedGoalId);
            setSelectedGoalId(null);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = goals.findIndex((g) => g.id === active.id);
            const newIndex = goals.findIndex((g) => g.id === over.id);

            const newGoals = arrayMove(goals, oldIndex, newIndex);
            reorderGoals(newGoals);
        }
    };

    return (
        <div className="goals-screen">
            {/* Header */}
            <div className="goals-header">
                <div className="goals-brand">
                    <span className="brand-dot" />
                    <span className="brand-name">GOALS</span>
                </div>
                <div className="goals-header-right">
                    {/* Stats moved to controls */}
                </div>
            </div>

            {/* Overview Stats */}
            <div className="goals-overview">
                <div className="goals-stats-container">
                    {activeGoals.length === 0 ? (
                        <div className="goals-stat empty">
                            <span className="stat-value">0</span>
                            <span className="stat-label">active goals</span>
                        </div>
                    ) : (
                        <>
                            {aheadCount > 0 && (
                                <div className="goals-stat ahead">
                                    <span className="stat-value">{aheadCount}</span>
                                    <span className="stat-label">Ahead</span>
                                </div>
                            )}
                            {onTrackCount > 0 && (
                                <div className="goals-stat on-track">
                                    <span className="stat-value">{onTrackCount}</span>
                                    <span className="stat-label">On Track</span>
                                </div>
                            )}
                            {behindCount > 0 && (
                                <div className="goals-stat behind">
                                    <span className="stat-value">{behindCount}</span>
                                    <span className="stat-label">Behind</span>
                                </div>
                            )}
                            {completedCount > 0 && (
                                <div className="goals-stat completed">
                                    <span className="stat-value">{completedCount}</span>
                                    <span className="stat-label">Done</span>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Controls Row */}
            <div className="goals-controls">
                <div className="controls-left">
                    {goals.length > 0 && (
                        <div className="filter-pills">
                            <button
                                className={`filter-pill ${filter === 'all' ? 'active' : ''}`}
                                onClick={() => handleFilterChange('all')}
                            >
                                All ({goals.length})
                            </button>
                            <button
                                className={`filter-pill ${filter === 'on-track' ? 'active' : ''}`}
                                onClick={() => handleFilterChange('on-track')}
                            >
                                <TrendingUp size={12} />
                                On Track
                            </button>
                            <button
                                className={`filter-pill ${filter === 'at-risk' ? 'active' : ''}`}
                                onClick={() => handleFilterChange('at-risk')}
                            >
                                <AlertTriangle size={12} />
                                At Risk ({atRiskCount})
                            </button>
                            <button
                                className={`filter-pill ${filter === 'completed' ? 'active' : ''}`}
                                onClick={() => handleFilterChange('completed')}
                            >
                                <Check size={12} />
                                Done ({completedCount})
                            </button>
                        </div>
                    )}

                    {/* Pagination Controls - Mini Variant next to filters */}
                    {totalPages > 1 && (
                        <div className="pagination-controls mini">
                            <button
                                className="pagination-btn"
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1 || slideDirection !== null}
                                aria-label="Previous page"
                            >
                                <ChevronLeft size={16} />
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
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
                <div className="controls-right">
                    <button className="add-btn-header" onClick={() => setShowAddForm(true)} aria-label="Add goal">
                        <Plus size={18} />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="goals-main">
                {goals.length === 0 ? (
                    <div className="goals-empty">
                        <Target size={48} strokeWidth={1} />
                        <span>No goals yet. Set your first goal!</span>
                    </div>
                ) : (
                    <div className={`goals-grid ${slideDirection ? `slide-${slideDirection}` : ''}`}>
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={paginatedGoals.map(g => g.id)}
                                strategy={rectSortingStrategy}
                            >
                                {paginatedGoals.map((goal: Goal) => (
                                    <SortableGoalCard
                                        key={goal.id}
                                        goal={goal}
                                        onClick={() => handleGoalClick(goal)}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                    </div>
                )}
            </div>

            {/* Modals */}
            {showAddForm && <AddGoalForm onClose={() => setShowAddForm(false)} />}
            {editingGoal && (
                <AddGoalForm
                    editGoal={editingGoal}
                    onClose={() => setEditingGoalId(null)}
                />
            )}
            {selectedGoal && (
                <GoalDetailModal
                    goal={selectedGoal}
                    onClose={() => setSelectedGoalId(null)}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            )}
        </div>
    );
}

// Goal Card Component
// Export utilities
export { getGoalStatus, getDeadlineWarning, CATEGORY_ICONS };
