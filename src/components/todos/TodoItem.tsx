// ========================================
// Todo Item Component - Uses Modal for Edit
// ========================================

import { useState } from 'react';
import { Check, Trash2, Calendar, Edit2 } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import type { Todo } from '../../types';
import { formatRelativeDate, isOverdue } from '../../utils/helpers';
import AddTodoForm from './AddTodoForm';
import './TodoItem.css';

interface TodoItemProps {
    todo: Todo;
    isDragging?: boolean;
}

export default function TodoItem({ todo, isDragging }: TodoItemProps) {
    const { state, toggleTodo, deleteTodo } = useApp();
    const [showEditModal, setShowEditModal] = useState(false);

    const handleToggle = () => toggleTodo(todo.id);
    const handleDelete = () => deleteTodo(todo.id);

    const handleEdit = () => {
        if (!todo.completed) {
            setShowEditModal(true);
        }
    };

    return (
        <>
            <div
                className={`todo-item ${todo.completed ? 'completed' : ''} ${isDragging ? 'dragging' : ''}`}
                data-priority={todo.priority || 'none'}
            >
                {/* Checkbox */}
                <button
                    className={`todo-checkbox ${todo.completed ? 'checked' : ''}`}
                    onClick={handleToggle}
                >
                    {todo.completed && <Check size={12} />}
                </button>

                {/* Content */}
                <div className="todo-content" onDoubleClick={handleEdit}>
                    <div className="todo-main">
                        <span className="todo-text">
                            {todo.text}
                        </span>
                    </div>

                    {/* Meta */}
                    {(todo.dueDate || (todo.tags && todo.tags.length > 0)) && (
                        <div className="todo-meta">
                            {todo.dueDate && (
                                <span className={`due-date ${isOverdue(todo.dueDate) && !todo.completed ? 'overdue' : ''}`}>
                                    <Calendar size={11} />
                                    {formatRelativeDate(todo.dueDate)}
                                </span>
                            )}

                            {/* Tags */}
                            {todo.tags && todo.tags.length > 0 && (
                                <div className="todo-tags">
                                    {todo.tags.slice(0, 4).map(tagId => {
                                        const tag = state.tags.find(t => t.id === tagId);
                                        if (!tag) return null;
                                        return (
                                            <span
                                                key={tagId}
                                                className="todo-tag"
                                                style={{ '--tag-color': tag.color } as React.CSSProperties}
                                            >
                                                {tag.name.toUpperCase()}
                                            </span>
                                        );
                                    })}
                                    {todo.tags.length > 4 && (
                                        <span className="todo-tag-more">+{todo.tags.length - 4}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="todo-actions">
                    <button className="action-btn edit" onClick={handleEdit} title="Edit task">
                        <Edit2 size={14} />
                    </button>
                    <button className="action-btn delete" onClick={handleDelete} title="Delete task">
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <AddTodoForm
                    onClose={() => setShowEditModal(false)}
                    editTodo={todo}
                />
            )}
        </>
    );
}
