// ========================================
// Add Goal Form - Standard Manual Input
// ========================================

import { useState } from 'react';
import { X, DollarSign, Users, Dumbbell, GraduationCap, Briefcase, User, Plus, Trash2, Target, CheckSquare, TrendingUp } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import type { Goal, GoalCategory, GoalType, GoalMilestone } from '../../types';
import { generateId } from '../../utils/helpers';
import AddTagModal from '../common/AddTagModal';
import './AddGoalForm.css';

interface AddGoalFormProps {
    onClose: () => void;
    editGoal?: Goal;
}

const COLOR_OPTIONS = ['#F87171', '#FFB84D', '#34D399', '#60A5FA', '#A78BFA', '#F472B6'];

const CATEGORIES: { id: GoalCategory; label: string; icon: any }[] = [
    { id: 'financial', label: 'Financial', icon: DollarSign },
    { id: 'social', label: 'Social', icon: Users },
    { id: 'fitness', label: 'Fitness', icon: Dumbbell },
    { id: 'learning', label: 'Learning', icon: GraduationCap },
    { id: 'career', label: 'Career', icon: Briefcase },
    { id: 'personal', label: 'Personal', icon: User },
];

export default function AddGoalForm({ onClose, editGoal }: AddGoalFormProps) {
    const { addGoal, updateGoal, state } = useApp();
    const [name, setName] = useState(editGoal?.name || '');
    const [description, setDescription] = useState(editGoal?.description || '');
    const [goalType, setGoalType] = useState<GoalType>(editGoal?.goalType || 'trackable');
    const [targetValue, setTargetValue] = useState(editGoal?.targetValue?.toString() || '');
    const [startingValue, setStartingValue] = useState(editGoal?.startingValue?.toString() || '0');
    const [targetDirection, setTargetDirection] = useState<'increase' | 'decrease'>(editGoal?.targetDirection || 'increase');
    const [unit, setUnit] = useState(editGoal?.unit || '');
    const [milestones, setMilestones] = useState<GoalMilestone[]>(editGoal?.milestones || []);
    const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
    const [category, setCategory] = useState<GoalCategory>(editGoal?.category || 'personal');
    const [color, setColor] = useState(editGoal?.color || COLOR_OPTIONS[0]);
    const [deadline, setDeadline] = useState(editGoal?.deadline ? new Date(editGoal.deadline).toISOString().split('T')[0] : '');
    const [selectedTags, setSelectedTags] = useState<string[]>(editGoal?.tags || []);
    const [showAddTag, setShowAddTag] = useState(false);
    const [errors, setErrors] = useState<{ name?: string; target?: string; deadline?: string }>({});
    const [isShaking, setIsShaking] = useState(false);
    const [notes, setNotes] = useState(editGoal?.notes || '');

    const validate = () => {
        const newErrors: { name?: string; target?: string; deadline?: string } = {};

        if (name.trim().length < 3) {
            newErrors.name = 'Goal name must be at least 3 characters.';
        } else if (name.trim().length > 50) {
            newErrors.name = 'Goal name must be under 50 characters.';
        }

        if (goalType === 'trackable') {
            const val = parseFloat(targetValue);
            if (isNaN(val) || val <= 0) {
                newErrors.target = 'Target must be a positive number.';
            }
        }

        if (deadline) {
            const selectedDate = new Date(deadline);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (selectedDate < today) {
                newErrors.deadline = 'Deadline cannot be in the past.';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) {
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
            return;
        }

        const goalData = {
            name: name.trim(),
            description: description.trim(),
            goalType,
            startingValue: goalType === 'trackable' ? parseFloat(startingValue) : 0,
            targetValue: goalType === 'trackable' ? parseFloat(targetValue) : milestones.length,
            targetDirection: goalType === 'trackable' ? targetDirection : 'increase',
            unit: goalType === 'trackable' ? (unit.trim() || 'units') : 'milestones',
            milestones: goalType === 'milestone' ? milestones : undefined,
            category,
            color,
            icon: category,
            deadline: deadline ? new Date(deadline) : undefined,
            tags: selectedTags,
            notes: notes.trim(),
        };

        if (editGoal) {
            // Check if goal is still complete after edits
            // Reset completedAt if goal structure changed and is no longer complete
            let isStillComplete = false;
            if (goalType === 'milestone') {
                // For milestone goals: check if all milestones are completed
                isStillComplete = milestones.length > 0 && milestones.every(m => m.completed);
            } else {
                // For trackable goals: check if current value meets the new target
                const newTargetValue = parseFloat(targetValue);
                const direction = targetDirection;
                isStillComplete = direction === 'decrease'
                    ? editGoal.currentValue <= newTargetValue
                    : editGoal.currentValue >= newTargetValue;
            }

            await updateGoal(editGoal.id, {
                ...goalData,
                // Keep completedAt if still complete, otherwise reset to allow status recalculation
                completedAt: isStillComplete ? editGoal.completedAt : undefined,
            });
        } else {
            await addGoal(goalData);
        }

        onClose();
    };

    const toggleTag = (tagId: string) => {
        setSelectedTags(prev =>
            prev.includes(tagId)
                ? prev.filter(id => id !== tagId)
                : [...prev, tagId]
        );
    };

    const addMilestone = () => {
        if (!newMilestoneTitle.trim()) return;
        const newMilestone: GoalMilestone = {
            id: generateId(),
            title: newMilestoneTitle.trim(),
            completed: false,
        };
        setMilestones(prev => [...prev, newMilestone]);
        setNewMilestoneTitle('');
    };

    const removeMilestone = (id: string) => {
        setMilestones(prev => prev.filter(m => m.id !== id));
    };

    const isValid = name.trim() && (
        (goalType === 'trackable' && targetValue.trim()) ||
        (goalType === 'milestone' && milestones.length > 0)
    );

    return (
        <div className="modal-overlay modal-fade-in" onClick={onClose}>
            <div className={`modal-content add-goal-modal ${isShaking ? 'shake' : ''}`} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">{editGoal ? 'EDIT GOAL' : 'NEW GOAL'}</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Basic Info */}
                        <div className={`input-group ${errors.name ? 'has-error' : ''}`}>
                            <label className="input-label-minimal">GOAL NAME</label>
                            <input
                                type="text"
                                className="input input-clean"
                                placeholder="What's your goal?"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                                }}
                                autoFocus
                                required
                            />
                        </div>

                        <div className="input-group">
                            <label className="input-label-minimal">DESCRIPTION (OPTIONAL)</label>
                            <textarea
                                className="input input-clean"
                                placeholder="What's this goal about?"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={2}
                            />
                        </div>

                        {/* Goal Type Toggle */}
                        <div className="input-group">
                            <label className="input-label-minimal">GOAL TYPE</label>
                            <div className="goal-type-toggle">
                                <button
                                    type="button"
                                    className={`type-btn ${goalType === 'trackable' ? 'selected' : ''}`}
                                    onClick={() => setGoalType('trackable')}
                                >
                                    <Target size={16} />
                                    <span>Trackable</span>
                                    <small>Has a measurable target</small>
                                </button>
                                <button
                                    type="button"
                                    className={`type-btn ${goalType === 'milestone' ? 'selected' : ''}`}
                                    onClick={() => setGoalType('milestone')}
                                >
                                    <CheckSquare size={16} />
                                    <span>Milestone</span>
                                    <small>Checklist of steps</small>
                                </button>
                            </div>
                        </div>

                        {/* Trackable Goal Fields */}
                        {goalType === 'trackable' && (
                            <>
                                <div className="input-group">
                                    <label className="input-label-minimal">TRACKING DIRECTION</label>
                                    <div className="goal-type-toggle direction-toggle">
                                        <button
                                            type="button"
                                            className={`type-btn ${targetDirection === 'increase' ? 'selected' : ''}`}
                                            onClick={() => setTargetDirection('increase')}
                                        >
                                            <TrendingUp size={14} />
                                            <span>Increasing</span>
                                            <small>e.g. Savings, Books Read</small>
                                        </button>
                                        <button
                                            type="button"
                                            className={`type-btn ${targetDirection === 'decrease' ? 'selected' : ''}`}
                                            onClick={() => setTargetDirection('decrease')}
                                        >
                                            <TrendingUp size={14} style={{ transform: 'rotate(90deg)' }} />
                                            <span>Decreasing</span>
                                            <small>e.g. Weight Loss, Debt</small>
                                        </button>
                                    </div>
                                </div>
                                <div className="input-row">
                                    <div className="input-group flex-1">
                                        <label className="input-label-minimal">STARTING VALUE</label>
                                        <input
                                            type="number"
                                            className="input input-clean"
                                            placeholder="0"
                                            value={startingValue}
                                            onChange={(e) => setStartingValue(e.target.value)}
                                            required
                                            step="any"
                                        />
                                    </div>
                                    <div className={`input-group flex-1 ${errors.target ? 'has-error' : ''}`}>
                                        <label className="input-label-minimal">TARGET VALUE</label>
                                        <input
                                            type="number"
                                            className="input input-clean"
                                            placeholder="e.g. 100"
                                            value={targetValue}
                                            onChange={(e) => {
                                                setTargetValue(e.target.value);
                                                if (errors.target) setErrors(prev => ({ ...prev, target: undefined }));
                                            }}
                                            required
                                            step="any"
                                        />
                                        {errors.target && <span className="error-message">{errors.target}</span>}
                                    </div>
                                    <div className="input-group flex-1">
                                        <label className="input-label-minimal">UNIT</label>
                                        <input
                                            type="text"
                                            className="input input-clean"
                                            placeholder="e.g. kg, $"
                                            value={unit}
                                            onChange={(e) => setUnit(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Milestone Goal Fields */}
                        {goalType === 'milestone' && (
                            <div className="input-group">
                                <label className="input-label-minimal">MILESTONES</label>
                                <div className="milestone-editor">
                                    {milestones.map((m, index) => (
                                        <div key={m.id} className="milestone-item">
                                            <span className="milestone-number">{index + 1}</span>
                                            <span className="milestone-title">{m.title}</span>
                                            <button
                                                type="button"
                                                className="milestone-remove"
                                                onClick={() => removeMilestone(m.id)}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    <div className="milestone-add">
                                        <input
                                            type="text"
                                            className="input input-clean"
                                            placeholder="Add a milestone..."
                                            value={newMilestoneTitle}
                                            onChange={(e) => setNewMilestoneTitle(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMilestone())}
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-icon btn-sm"
                                            onClick={addMilestone}
                                            disabled={!newMilestoneTitle.trim()}
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Deadline */}
                        <div className={`input-group ${errors.deadline ? 'has-error' : ''}`}>
                            <label className="input-label-minimal">DEADLINE (OPTIONAL)</label>
                            <input
                                type="date"
                                className="input input-clean"
                                value={deadline}
                                onChange={(e) => {
                                    setDeadline(e.target.value);
                                    if (errors.deadline) setErrors(prev => ({ ...prev, deadline: undefined }));
                                }}
                                min={new Date().toISOString().split('T')[0]}
                            />
                            {errors.deadline && <span className="error-message">{errors.deadline}</span>}
                        </div>

                        {/* Category */}
                        <div className="input-group">
                            <label className="input-label-minimal">CATEGORY</label>
                            <div className="category-grid">
                                {CATEGORIES.map((cat) => {
                                    const Icon = cat.icon;
                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            className={`category-btn ${category === cat.id ? 'selected' : ''}`}
                                            onClick={() => setCategory(cat.id)}
                                        >
                                            <Icon size={18} />
                                            <span>{cat.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Color */}
                        <div className="input-group">
                            <label className="input-label-minimal">COLOR</label>
                            <div className="color-picker-minimal">
                                {COLOR_OPTIONS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        className={`color-dot ${color === c ? 'selected' : ''}`}
                                        style={{ background: c }}
                                        onClick={() => setColor(c)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Tags */}
                        <div className="input-group">
                            <label className="input-label-minimal">TAGS</label>
                            <div className="tags-grid">
                                {state.tags.map(tag => (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        className={`tag-button ${selectedTags.includes(tag.id) ? 'selected' : ''}`}
                                        onClick={() => toggleTag(tag.id)}
                                    >
                                        <div className="tag-dot" style={{ backgroundColor: tag.color }} />
                                        {tag.name}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    className="tag-button add-tag-btn"
                                    onClick={() => setShowAddTag(true)}
                                >
                                    <Plus size={14} />
                                    <span>Add Tag</span>
                                </button>
                            </div>
                        </div>

                        {/* Add Tag Modal */}
                        {showAddTag && <AddTagModal onClose={() => setShowAddTag(false)} />}

                        {/* Notes */}
                        <div className="input-group">
                            <label className="input-label-minimal">NOTES (OPTIONAL)</label>
                            <textarea
                                className="input input-clean"
                                placeholder="Add any extra notes..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={!isValid}>
                            {editGoal ? 'Update Goal' : 'Create Goal'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
