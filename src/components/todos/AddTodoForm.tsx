// ========================================
// Add/Edit Todo Form Modal
// ========================================

import { useState, useEffect } from 'react';
import { X, Calendar, Flag, Plus } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import type { Todo } from '../../types';
import AddTagModal from '../common/AddTagModal';
import './AddTodoForm.css';

interface AddTodoFormProps {
    onClose: () => void;
    editTodo?: Todo;
}

type Priority = 'high' | 'medium' | 'low';

export default function AddTodoForm({ onClose, editTodo }: AddTodoFormProps) {
    const { state, addTodo, updateTodo } = useApp();
    const [text, setText] = useState('');
    const [priority, setPriority] = useState<Priority | undefined>();
    const [dueDate, setDueDate] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [showAddTag, setShowAddTag] = useState(false);
    const [errors, setErrors] = useState<{ text?: string; dueDate?: string }>({});
    const [isShaking, setIsShaking] = useState(false);

    // Initialize form with edit data if editing
    useEffect(() => {
        if (editTodo) {
            setText(editTodo.text);
            setPriority(editTodo.priority);
            setDueDate(editTodo.dueDate ? new Date(editTodo.dueDate).toISOString().split('T')[0] : '');
            setSelectedTags(editTodo.tags);
        }
    }, [editTodo]);

    const validate = () => {
        const newErrors: { text?: string; dueDate?: string } = {};

        if (text.trim().length < 3) {
            newErrors.text = 'Task must be at least 3 characters.';
        } else if (text.trim().length > 100) {
            newErrors.text = 'Task must be under 100 characters.';
        }

        if (dueDate) {
            const selectedDate = new Date(dueDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (selectedDate < today) {
                newErrors.dueDate = 'Due date cannot be in the past.';
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

        if (editTodo) {
            // Update existing todo
            updateTodo(editTodo.id, {
                text: text.trim(),
                priority,
                dueDate: dueDate ? new Date(dueDate) : undefined,
                tags: selectedTags,
            });
        } else {
            // Add new todo
            const newTodo = await addTodo(text.trim(), priority, selectedTags);

            // Update with due date if set
            if (dueDate && newTodo) {
                updateTodo(newTodo.id, { dueDate: new Date(dueDate) });
            }
        }

        onClose();
    };

    const toggleTag = (tagId: string) => {
        setSelectedTags((prev) =>
            prev.includes(tagId)
                ? prev.filter((id) => id !== tagId)
                : [...prev, tagId]
        );
    };

    const priorities: { value: Priority; label: string; color: string }[] = [
        { value: 'high', label: 'High', color: '#F87171' },
        { value: 'medium', label: 'Medium', color: '#FFB84D' },
        { value: 'low', label: 'Low', color: '#34D399' },
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className={`modal-content add-todo-modal ${isShaking ? 'shake' : ''}`} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">{editTodo ? 'Edit Task' : 'Add Task'}</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Task Text */}
                        <div className={`input-group ${errors.text ? 'has-error' : ''}`}>
                            <label className="input-label">Task</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="What needs to be done?"
                                value={text}
                                onChange={(e) => {
                                    setText(e.target.value);
                                    if (errors.text) setErrors(prev => ({ ...prev, text: undefined }));
                                }}
                                autoFocus
                            />
                            {errors.text && <span className="error-message">{errors.text}</span>}
                        </div>

                        {/* Priority Selection */}
                        <div className="input-group">
                            <label className="input-label">
                                <Flag size={14} />
                                Priority
                            </label>
                            <div className="priority-buttons">
                                {priorities.map((p) => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        className={`priority-btn ${priority === p.value ? 'selected' : ''}`}
                                        style={{
                                            '--priority-color': p.color,
                                        } as React.CSSProperties}
                                        onClick={() => setPriority(priority === p.value ? undefined : p.value)}
                                    >
                                        <span className="priority-dot" style={{ background: p.color }} />
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Due Date */}
                        <div className={`input-group ${errors.dueDate ? 'has-error' : ''}`}>
                            <label className="input-label">
                                <Calendar size={14} />
                                Due Date
                            </label>
                            <input
                                type="date"
                                className="input"
                                value={dueDate}
                                onChange={(e) => {
                                    setDueDate(e.target.value);
                                    if (errors.dueDate) setErrors(prev => ({ ...prev, dueDate: undefined }));
                                }}
                            />
                            {errors.dueDate && <span className="error-message">{errors.dueDate}</span>}
                        </div>

                        {/* Tags */}
                        <div className="input-group">
                            <label className="input-label">Tags</label>
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
                            disabled={!text.trim()}
                        >
                            {editTodo ? 'Save Changes' : 'Add Task'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
