// ========================================
// Add Tag Modal - Reusable Component
// ========================================

import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import './AddTagModal.css';

interface AddTagModalProps {
    onClose: () => void;
}

const COLOR_OPTIONS = [
    '#F87171', // red
    '#FFB84D', // orange
    '#34D399', // green
    '#60A5FA', // blue
    '#A78BFA', // purple
    '#F472B6', // pink
];

export default function AddTagModal({ onClose }: AddTagModalProps) {
    const { addTag } = useApp();
    const [name, setName] = useState('');
    const [color, setColor] = useState(COLOR_OPTIONS[0]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        addTag(name.trim(), color);
        onClose();
    };

    return (
        <div className="modal-overlay modal-fade-in" onClick={onClose}>
            <div className="modal-content add-tag-modal modal-slide-up" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">NEW TAG</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div>
                    <div className="modal-body">
                        {/* Tag Name */}
                        <div className="input-group">
                            <label className="input-label-minimal">NAME</label>
                            <input
                                type="text"
                                className="input input-clean"
                                placeholder="e.g., Work, Personal"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && name.trim()) {
                                        e.preventDefault();
                                        handleSubmit(e);
                                    }
                                }}
                                autoFocus
                            />
                        </div>

                        {/* Color Selection */}
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

                        {/* Preview */}
                        {name.trim() && (
                            <div className="input-group">
                                <label className="input-label-minimal">PREVIEW</label>
                                <div className="tag-preview">
                                    <span className="tag-dot" style={{ background: color }} />
                                    <span>{name.trim()}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-ghost" onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            disabled={!name.trim()}
                            onClick={handleSubmit}
                        >
                            <Plus size={16} />
                            Create Tag
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
