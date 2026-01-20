// ========================================
// Session Goal Modal
// ========================================

import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import AddTagModal from '../common/AddTagModal';
import './SessionGoalModal.css';

interface SessionGoalModalProps {
    onStart: (goal?: string, tags?: string[]) => void;
    onClose: () => void;
}

export default function SessionGoalModal({ onStart, onClose }: SessionGoalModalProps) {
    const { state } = useApp();
    const [goal, setGoal] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [showAddTag, setShowAddTag] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onStart(goal.trim() || undefined, selectedTags.length > 0 ? selectedTags : undefined);
    };

    const handleSkip = () => {
        onStart();
    };

    const toggleTag = (tagId: string) => {
        setSelectedTags((prev) =>
            prev.includes(tagId)
                ? prev.filter((id) => id !== tagId)
                : [...prev, tagId]
        );
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content session-goal-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">What's your focus?</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="input-group">
                            <label className="input-label">Session Goal (optional)</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="e.g., Complete project proposal..."
                                value={goal}
                                onChange={(e) => setGoal(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="tags-section">
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
                        <button type="button" className="btn btn-ghost" onClick={handleSkip}>
                            Skip
                        </button>
                        <button type="submit" className="btn btn-primary">
                            Start Focus
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
