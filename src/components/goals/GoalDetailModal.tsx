// ========================================
// Goal Detail Modal - With Stats, Progress & Milestones
// ========================================

import { useState, useEffect, useRef } from 'react';
import {
    X, Edit2, Trash2, TrendingUp, Target, Calendar, CheckCircle, Circle,
    DollarSign, Users, Dumbbell, GraduationCap, Briefcase, User, Plus, GripVertical, ChevronDown
} from 'lucide-react';
import type { Goal, GoalMilestone } from '../../types';
import { formatCompactNumber, generateId } from '../../utils/helpers';
import { getGoalStatus } from './GoalsTracker';
import { useApp } from '../../contexts/AppContext';
import UpdateProgressModal from './UpdateProgressModal';
import { MessageSquare } from 'lucide-react';
import './GoalDetailModal.css';

interface GoalDetailModalProps {
    goal: Goal;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

// Category icons
const CATEGORY_ICONS: Record<Goal['category'], React.ComponentType<{ size?: number }>> = {
    financial: DollarSign,
    social: Users,
    fitness: Dumbbell,
    learning: GraduationCap,
    career: Briefcase,
    personal: User,
};

// Calculate velocity (avg daily progress over last 7 days)
function calculateVelocity(goal: Goal): number {
    if (!goal.progressHistory || goal.progressHistory.length < 2) return 0;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentSnapshots = goal.progressHistory.filter(s => new Date(s.date) >= weekAgo);
    if (recentSnapshots.length < 2) {
        const lastValue = goal.currentValue;
        const totalChange = goal.targetDirection === 'decrease'
            ? goal.startingValue - lastValue
            : lastValue - goal.startingValue;
        const daysDiff = Math.max(1, Math.ceil((now.getTime() - new Date(goal.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
        return parseFloat((totalChange / daysDiff).toFixed(1));
    }

    const firstValue = recentSnapshots[0].value;
    const lastValue = recentSnapshots[recentSnapshots.length - 1].value;
    const daysDiff = Math.max(1, recentSnapshots.length);

    const change = goal.targetDirection === 'decrease'
        ? firstValue - lastValue
        : lastValue - firstValue;

    return parseFloat((change / daysDiff).toFixed(1));
}

// Get static milestones for trackable goals
function getTrackableMilestones(goal: Goal) {
    const totalDelta = goal.targetDirection === 'decrease'
        ? goal.startingValue - goal.targetValue
        : goal.targetValue - goal.startingValue;
    const currentDelta = goal.targetDirection === 'decrease'
        ? goal.startingValue - goal.currentValue
        : goal.currentValue - goal.startingValue;

    const percent = totalDelta === 0 ? 100 : (currentDelta / totalDelta) * 100;
    return [
        { label: '25%', reached: percent >= 25 },
        { label: '50%', reached: percent >= 50 },
        { label: '75%', reached: percent >= 75 },
        { label: '100%', reached: percent >= 100 },
    ];
}

// Number counting animation hook
function useCountUp(end: number, duration: number = 800) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
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

export default function GoalDetailModal({ goal, onClose, onEdit, onDelete }: GoalDetailModalProps) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showUpdateProgress, setShowUpdateProgress] = useState(false);
    const [editableNotes, setEditableNotes] = useState(goal.notes || '');
    const [isNotesExpanded, setIsNotesExpanded] = useState(!!goal.notes);
    const [isAddingMilestone, setIsAddingMilestone] = useState(false);
    const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
    const dragNodeRef = useRef<HTMLDivElement | null>(null);
    const notesRef = useRef<HTMLTextAreaElement | null>(null);
    const { updateGoal, toggleGoalMilestone } = useApp();

    useEffect(() => {
        setEditableNotes(goal.notes || '');
    }, [goal.notes]);

    const handleSaveNotes = async () => {
        await updateGoal(goal.id, { notes: editableNotes.trim() });
    };

    const handleAddMilestone = async () => {
        if (!newMilestoneTitle.trim()) return;
        const newMilestone: GoalMilestone = {
            id: generateId(),
            title: newMilestoneTitle.trim(),
            completed: false,
        };
        const updatedMilestones = [...(goal.milestones || []), newMilestone];
        await updateGoal(goal.id, {
            milestones: updatedMilestones,
            targetValue: updatedMilestones.length
        });
        setNewMilestoneTitle('');
        setIsAddingMilestone(false);
    };

    const handleDeleteMilestone = async (milestoneId: string) => {
        const updatedMilestones = (goal.milestones || []).filter(m => m.id !== milestoneId);
        await updateGoal(goal.id, {
            milestones: updatedMilestones,
            targetValue: Math.max(1, updatedMilestones.length)
        });
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        dragNodeRef.current = e.target as HTMLDivElement;
        dragNodeRef.current.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        if (dragNodeRef.current) {
            dragNodeRef.current.style.opacity = '1';
        }
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;
        setDragOverIndex(index);
    };

    const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null || !goal.milestones) return;

        const newMilestones = [...goal.milestones];
        const [draggedItem] = newMilestones.splice(draggedIndex, 1);
        newMilestones.splice(dropIndex, 0, draggedItem);

        await updateGoal(goal.id, { milestones: newMilestones });
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const isMilestoneGoal = goal.goalType === 'milestone';
    const completedMilestones = goal.milestones?.filter(m => m.completed).length || 0;
    const totalMilestones = goal.milestones?.length || 1;
    const milestoneProgress = Math.round((completedMilestones / totalMilestones) * 100);

    const totalDelta = goal.targetDirection === 'decrease'
        ? goal.startingValue - goal.targetValue
        : goal.targetValue - goal.startingValue;
    const currentDelta = goal.targetDirection === 'decrease'
        ? goal.startingValue - goal.currentValue
        : goal.currentValue - goal.startingValue;

    const status = getGoalStatus(goal);
    const progress = isMilestoneGoal
        ? milestoneProgress
        : Math.max(0, Math.min(100, Math.round((currentDelta / (totalDelta || 1)) * 100)));
    const velocity = calculateVelocity(goal);
    const remaining = goal.targetDirection === 'decrease'
        ? Math.max(0, goal.currentValue - goal.targetValue)
        : Math.max(0, goal.targetValue - goal.currentValue);
    const CategoryIcon = CATEGORY_ICONS[goal.category];
    const trackableMilestones = getTrackableMilestones(goal);

    // Animated stats
    const animatedProgress = useCountUp(progress);

    const handleDelete = () => {
        onDelete();
        onClose();
    };

    const handleToggleMilestone = (milestoneId: string) => {
        toggleGoalMilestone(goal.id, milestoneId);
    };

    return (
        <div className="modal-overlay modal-fade-in" onClick={onClose}>
            <div className="modal-content goal-detail-modal modal-slide-up" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div className="goal-detail-title">
                        <div className="goal-icon-large" style={{ color: goal.color }}>
                            <CategoryIcon size={28} />
                        </div>
                        <div>
                            <h2 className="modal-title">{goal.name}</h2>
                            {goal.description && (
                                <p className="goal-description">{goal.description}</p>
                            )}
                        </div>
                    </div>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Progress Display */}
                <div className="goal-progress-hero">
                    <div className="progress-circle" style={{ '--progress': progress, '--color': goal.color } as React.CSSProperties}>
                        <span className="progress-value">{animatedProgress}%</span>
                    </div>
                    <div className="progress-details">
                        {isMilestoneGoal ? (
                            <>
                                <div className="progress-current">
                                    <span className="value">{completedMilestones}</span>
                                    <span className="label">Done</span>
                                </div>
                                <div className="progress-divider">/</div>
                                <div className="progress-target">
                                    <span className="value">{totalMilestones}</span>
                                    <span className="label">Steps</span>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="progress-current">
                                    <span className="value">{formatCompactNumber(goal.currentValue)}</span>
                                    <span className="label">Current</span>
                                </div>
                                <div className="progress-divider">/</div>
                                <div className="progress-target">
                                    <span className="value">{formatCompactNumber(goal.targetValue)}</span>
                                    <span className="label">{goal.unit}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Milestone Checklist (for milestone goals) */}
                {isMilestoneGoal && (
                    <div className="milestone-checklist-section">
                        <div className="section-header">
                            <h4 className="section-title">MILESTONES</h4>
                            {!isAddingMilestone && (
                                <button className="btn-add-milestone" onClick={() => setIsAddingMilestone(true)}>
                                    <Plus size={12} /> Add
                                </button>
                            )}
                        </div>
                        <div className="milestone-checklist">
                            {goal.milestones?.map((m, index) => (
                                <div
                                    key={m.id}
                                    className={`milestone-check-item ${m.completed ? 'completed' : ''} ${dragOverIndex === index ? 'drag-over' : ''}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragEnd={handleDragEnd}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDrop={(e) => handleDrop(e, index)}
                                >
                                    <span className="milestone-drag-handle">
                                        <GripVertical size={14} />
                                    </span>
                                    <button
                                        className="milestone-check-btn"
                                        onClick={() => handleToggleMilestone(m.id)}
                                    >
                                        {m.completed ? <CheckCircle size={18} /> : <Circle size={18} />}
                                    </button>
                                    <span className="milestone-check-title">{m.title}</span>
                                    <button
                                        className="milestone-delete-btn"
                                        onClick={() => handleDeleteMilestone(m.id)}
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        {isAddingMilestone && (
                            <div className="milestone-add-inline">
                                <input
                                    type="text"
                                    className="milestone-add-input"
                                    placeholder="New milestone..."
                                    value={newMilestoneTitle}
                                    onChange={(e) => setNewMilestoneTitle(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddMilestone()}
                                    autoFocus
                                />
                                <button className="btn btn-sm btn-primary" onClick={handleAddMilestone} disabled={!newMilestoneTitle.trim()}>
                                    Add
                                </button>
                                <button className="btn btn-sm btn-ghost" onClick={() => { setIsAddingMilestone(false); setNewMilestoneTitle(''); }}>
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Trackable Milestones (for trackable goals) */}
                {!isMilestoneGoal && (
                    <div className="milestones-section">
                        <h4 className="section-title">MILESTONES</h4>
                        <div className="milestones-track">
                            {trackableMilestones.map((m, i) => (
                                <div
                                    key={i}
                                    className={`milestone ${m.reached ? 'reached' : ''}`}
                                    style={{ '--color': goal.color } as React.CSSProperties}
                                >
                                    <div className="milestone-dot">
                                        {m.reached && <CheckCircle size={12} />}
                                    </div>
                                    <span className="milestone-label">{m.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Goal Notes Section - Collapsible */}
                <div className="goal-notes-section">
                    <div
                        className="section-header"
                        onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                    >
                        <h4 className="section-title">
                            NOTES
                            <ChevronDown
                                size={14}
                                className={`notes-toggle-icon ${isNotesExpanded ? 'expanded' : ''}`}
                            />
                        </h4>
                        {!isNotesExpanded && editableNotes && (
                            <span className="notes-preview">{editableNotes}</span>
                        )}
                    </div>
                    <div className={`notes-content ${isNotesExpanded ? 'expanded' : 'collapsed'}`}>
                        <textarea
                            ref={notesRef}
                            className="notes-inline"
                            value={editableNotes}
                            onChange={(e) => setEditableNotes(e.target.value)}
                            onBlur={handleSaveNotes}
                            placeholder="Add notes..."
                            rows={3}
                        />
                    </div>
                </div>

                {/* Stats Row (only for trackable goals) */}
                {!isMilestoneGoal && (
                    <div className="goal-stats-row">
                        <div className="stat-card stat-fade-in" style={{ animationDelay: '100ms' }}>
                            <div className="stat-icon-wrap">
                                <TrendingUp size={14} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-value">{formatCompactNumber(velocity)}</span>
                                <span className="stat-label">/{goal.unit}/DAY</span>
                            </div>
                        </div>
                        <div className="stat-card stat-fade-in" style={{ animationDelay: '200ms' }}>
                            <div className="stat-icon-wrap">
                                <Target size={14} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-value">{formatCompactNumber(remaining)}</span>
                                <span className="stat-label">{goal.unit.toUpperCase()} LEFT</span>
                            </div>
                        </div>
                        {goal.deadline && (
                            <div className="stat-card stat-fade-in" style={{ animationDelay: '300ms' }}>
                                <div className="stat-icon-wrap">
                                    <Calendar size={14} />
                                </div>
                                <div className="stat-content">
                                    <span className="stat-value">
                                        {Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}
                                    </span>
                                    <span className="stat-label">DAYS LEFT</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Deadline for milestone goals */}
                {isMilestoneGoal && goal.deadline && (
                    <div className="goal-stats-row">
                        <div className="stat-card stat-fade-in">
                            <div className="stat-icon-wrap">
                                <Calendar size={14} />
                            </div>
                            <div className="stat-content">
                                <span className="stat-value">
                                    {Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}
                                </span>
                                <span className="stat-label">DAYS LEFT</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Progress History (only for trackable goals) */}
                {!isMilestoneGoal && goal.progressHistory && goal.progressHistory.length > 0 && (
                    <div className="history-section">
                        <h4 className="section-title">RECENT UPDATES</h4>
                        <div className="history-list">
                            {goal.progressHistory.slice(-5).reverse().map((snap, i) => (
                                <div key={i} className="history-item history-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
                                    <span className="history-date">
                                        {new Date(snap.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                    <div className="history-details-wrapper">
                                        <div className="history-details">
                                            <span className="history-value">{formatCompactNumber(snap.value)} {goal.unit}</span>
                                            <span className="history-percent">{snap.percentage}%</span>
                                        </div>
                                        {snap.note && (
                                            <div className="history-note">
                                                <MessageSquare size={10} />
                                                <span>{snap.note}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Update Progress Button (only for trackable goals) */}
                {!isMilestoneGoal && status !== 'completed' && (
                    <button
                        className="btn btn-primary btn-block"
                        onClick={() => setShowUpdateProgress(true)}
                    >
                        <TrendingUp size={16} />
                        Update Progress
                    </button>
                )}

                {/* Actions */}
                <div className="modal-footer">
                    {showDeleteConfirm ? (
                        <>
                            <span className="delete-confirm-text">Delete this goal?</span>
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
                            <button className="btn btn-ghost" onClick={onEdit}>
                                <Edit2 size={16} />
                                Edit
                            </button>
                        </>
                    )}
                </div>

                {/* Update Progress Modal (only for trackable goals) */}
                {!isMilestoneGoal && showUpdateProgress && (
                    <UpdateProgressModal
                        goal={goal}
                        onClose={() => setShowUpdateProgress(false)}
                    />
                )}
            </div>
        </div>
    );
}
