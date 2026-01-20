// ========================================
// Add/Edit Habit Form - No Days Selection
// ========================================

import { useState, useEffect } from 'react';
import { X, Dumbbell, Book, Footprints, Heart, Droplet, Apple, Moon, PenTool, Target, Palette, Music, Sprout, Plus } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import type { Habit } from '../../types';
import AddTagModal from '../common/AddTagModal';
import './AddHabitForm.css';

interface AddHabitFormProps {
    onClose: () => void;
    editHabit?: Habit;
}

const ICON_OPTIONS = [
    { icon: Dumbbell, name: 'dumbbell' },
    { icon: Book, name: 'book' },
    { icon: Footprints, name: 'footprints' },
    { icon: Heart, name: 'heart' },
    { icon: Droplet, name: 'droplet' },
    { icon: Apple, name: 'apple' },
    { icon: Moon, name: 'moon' },
    { icon: PenTool, name: 'pen' },
    { icon: Target, name: 'target' },
    { icon: Palette, name: 'palette' },
    { icon: Music, name: 'music' },
    { icon: Sprout, name: 'sprout' },
];

const COLOR_OPTIONS = ['#F87171', '#FFB84D', '#34D399', '#60A5FA', '#A78BFA', '#F472B6'];

export default function AddHabitForm({ onClose, editHabit }: AddHabitFormProps) {
    const { state, addHabit, updateHabit } = useApp();
    const [name, setName] = useState('');
    const [iconName, setIconName] = useState('dumbbell');
    const [color, setColor] = useState('#F87171');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [showAddTag, setShowAddTag] = useState(false);
    const [errors, setErrors] = useState<{ name?: string }>({});
    const [isShaking, setIsShaking] = useState(false);

    useEffect(() => {
        if (editHabit) {
            setName(editHabit.name);
            setIconName(editHabit.icon);
            setColor(editHabit.color);
            setSelectedTags(editHabit.tags);
        }
    }, [editHabit]);

    const validate = () => {
        const newErrors: { name?: string } = {};

        if (name.trim().length < 3) {
            newErrors.name = 'Name must be at least 3 characters.';
        } else if (name.trim().length > 50) {
            newErrors.name = 'Name must be under 50 characters.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) {
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
            return;
        }

        if (editHabit) {
            updateHabit(editHabit.id, {
                name: name.trim(),
                icon: iconName,
                color,
                tags: selectedTags,
            });
        } else {
            // New habits start with NO target days - users will drag to assign
            addHabit(name.trim(), iconName, color, [], selectedTags);
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

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className={`modal-content add-habit-modal ${isShaking ? 'shake' : ''}`} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">{editHabit ? 'EDIT HABIT' : 'NEW HABIT'}</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Habit Name */}
                        <div className={`input-group ${errors.name ? 'has-error' : ''}`}>
                            <label className="input-label-minimal">NAME</label>
                            <input
                                type="text"
                                className="input input-clean"
                                placeholder="e.g., Morning Exercise"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
                                }}
                                autoFocus
                            />
                            {errors.name && <span className="error-message">{errors.name}</span>}
                        </div>

                        {/* Icon Selection */}
                        <div className="input-group">
                            <label className="input-label-minimal">ICON</label>
                            <div className="icon-grid-minimal">
                                {ICON_OPTIONS.map(({ icon: Icon, name: iconKey }) => (
                                    <button
                                        key={iconKey}
                                        type="button"
                                        className={`icon-btn-minimal ${iconName === iconKey ? 'selected' : ''}`}
                                        onClick={() => setIconName(iconKey)}
                                    >
                                        <Icon size={18} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Color Selection - Dots */}
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

                        {/* Hint about day assignment */}
                        <div className="hint-text">
                            💡 Drag the habit to days in the weekly view to set when it repeats
                        </div>

                        {/* Tags */}
                        <div className="input-group">
                            <label className="input-label-minimal">TAGS</label>
                            <div className="tags-grid">
                                {state.tags.map((tag) => (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        className={`tag-button ${selectedTags.includes(tag.id) ? 'selected' : ''}`}
                                        onClick={() => toggleTag(tag.id)}
                                    >
                                        <span className="tag-dot" style={{ background: tag.color }} />
                                        <span>{tag.name}</span>
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
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={!name.trim()}
                        >
                            {editHabit ? 'Save' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
