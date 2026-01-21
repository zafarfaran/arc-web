import { useState } from 'react';
import {
    Bell,
    Clock,
    User,
    Database,
    Volume2,
    Smartphone,
    Download,
    Upload,
    Trash2,
    Minus,
    Plus,
    Globe,
    Terminal,
    Wand2,
    RefreshCw,
    LogOut,
    Check,
    MapPin
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { seedDummyUsers, cleanupDummyUsers } from '../../utils/seedData';
import XPDisplay from '../xp/XPDisplay';
import './SettingsPage.css';

// Avatar options using DiceBear API - Professional styles
const AVATAR_STYLES = [
    { style: 'lorelei', label: 'Illustrated' },
    { style: 'avataaars', label: 'Cartoon' },
    { style: 'notionists', label: 'Minimal' },
    { style: 'micah', label: 'Modern' },
    { style: 'personas', label: 'Professional' },
    { style: 'adventurer', label: 'Adventurer' },
    { style: 'big-ears', label: 'Friendly' },
    { style: 'bottts', label: 'Robots' },
    { style: 'thumbs', label: 'Abstract' },
    { style: 'fun-emoji', label: 'Emoji' },
    { style: 'pixel-art', label: 'Pixel' },
    { style: 'miniavs', label: 'Mini' },
];

const AVATAR_SEEDS = [
    'Felix', 'Luna', 'Max', 'Bella', 'Charlie', 'Lucy', 'Cooper', 'Daisy',
    'Rocky', 'Lily', 'Bear', 'Zoe', 'Duke', 'Stella', 'Zeus', 'Chloe',
    'Oscar', 'Penny', 'Archie', 'Ruby', 'Winston', 'Rosie', 'Louie', 'Gracie',
    'Murphy', 'Olive', 'Toby', 'Hazel', 'Jackson', 'Coco', 'Bruno', 'Willow',
    'Apollo', 'Ivy', 'Milo', 'Nala', 'Tucker', 'Sadie', 'Beau', 'Maple',
    'Scout', 'Pearl', 'Finn', 'Ginger', 'Leo', 'Sage', 'Rex', 'Violet',
];

function generateAvatarUrl(style: string, seed: string): string {
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
}

{/* Helper component for stepper */ }
function NumberStepper({ value, onChange, step = 1, min = 1 }: { value: number, onChange: (val: number) => void, step?: number, min?: number }) {
    return (
        <div className="settings-stepper">
            <button className="stepper-btn" onClick={() => onChange(Math.max(min, value - step))}>
                <Minus size={14} />
            </button>
            <span className="settings-input-display">{value}</span>
            <button className="stepper-btn" onClick={() => onChange(value + step)}>
                <Plus size={14} style={{ color: 'var(--primary)' }} />
            </button>
        </div>
    );
}

export default function SettingsPage() {
    const { state, updateTimerSettings, updateUserProfile, logout } = useApp();
    const { timerSettings } = state;

    // Local state for non-persisted settings (for demo)
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [hapticsEnabled, setHapticsEnabled] = useState(false);

    // Avatar picker state
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [selectedStyle, setSelectedStyle] = useState('avataaars');
    const [savingAvatar, setSavingAvatar] = useState(false);

    // Handle avatar selection
    const handleSelectAvatar = async (avatarUrl: string) => {
        setSavingAvatar(true);
        try {
            await updateUserProfile({ avatar: avatarUrl });
            setShowAvatarPicker(false);
        } catch (error) {
            console.error('Failed to update avatar:', error);
        }
        setSavingAvatar(false);
    };

    // Remove avatar
    const handleRemoveAvatar = async () => {
        setSavingAvatar(true);
        try {
            await updateUserProfile({ avatar: null });
        } catch (error) {
            console.error('Failed to remove avatar:', error);
        }
        setSavingAvatar(false);
    };

    // Developer state
    const [seedStatus, setSeedStatus] = useState<string | null>(null);
    const [dummyUserIds, setDummyUserIds] = useState<string[]>([]);
    const [isSeeding, setIsSeeding] = useState(false);

    // Seed handlers
    const handleSeed = async () => {
        if (!state.user?.location || typeof state.user.location === 'string') {
            setSeedStatus('Please grant location on Leaderboard first');
            setTimeout(() => setSeedStatus(null), 3000);
            return;
        }
        setIsSeeding(true);
        setSeedStatus('Seeding users...');
        try {
            // verified not string above
            const location = state.user.location as { lat: number; lng: number };
            const ids = await seedDummyUsers(15, location, (cur, tot, name) => {
                setSeedStatus(`Creating ${cur}/${tot}: ${name}`);
            });
            setDummyUserIds(prev => [...prev, ...ids]);
            setSeedStatus(`Success! Created ${ids.length} users.`);
            setTimeout(() => setSeedStatus(null), 3000);
        } catch (e) {
            setSeedStatus('Error seeding users');
            setTimeout(() => setSeedStatus(null), 3000);
        }
        setIsSeeding(false);
    };

    const handleCleanup = async () => {
        if (dummyUserIds.length === 0) return;
        setIsSeeding(true);
        setSeedStatus('Cleaning up...');
        try {
            await cleanupDummyUsers(dummyUserIds);
            setDummyUserIds([]);
            setSeedStatus('Cleanup complete.');
            setTimeout(() => setSeedStatus(null), 3000);
        } catch (e) {
            setSeedStatus('Error cleaning up');
            setTimeout(() => setSeedStatus(null), 3000);
        }
        setIsSeeding(false);
    };

    // Timer handlers
    const handleTimerChange = (key: keyof typeof timerSettings, value: number) => {
        updateTimerSettings({ [key]: value });
    };

    const handleToggleAutoStart = () => {
        updateTimerSettings({ autoStartBreaks: !timerSettings.autoStartBreaks });
    };

    // Data helpers
    const handleExport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", "arc_workspace_backup.json");
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    return (
        <div className="settings-container">

            {/* 1. Timer Settings */}
            <section className="settings-section">
                <div className="settings-section-header">
                    <Clock className="settings-icon" size={20} />
                    <h3 className="settings-section-title">Timer Preferences</h3>
                </div>
                <div className="settings-section-body">
                    <div className="settings-row">
                        <div className="settings-info">
                            <span className="settings-label">Focus Duration</span>
                            <span className="settings-description">Standard work intervals (minutes)</span>
                        </div>
                        <div className="settings-control">
                            <NumberStepper
                                value={timerSettings.focusDuration}
                                onChange={(val) => handleTimerChange('focusDuration', val)}
                                step={5}
                            />
                        </div>
                    </div>

                    <div className="settings-row">
                        <div className="settings-info">
                            <span className="settings-label">Short Break</span>
                            <span className="settings-description">Quick rest periods (minutes)</span>
                        </div>
                        <div className="settings-control">
                            <NumberStepper
                                value={timerSettings.shortBreakDuration}
                                onChange={(val) => handleTimerChange('shortBreakDuration', val)}
                            />
                        </div>
                    </div>

                    <div className="settings-row">
                        <div className="settings-info">
                            <span className="settings-label">Long Break</span>
                            <span className="settings-description">Extended downtime (minutes)</span>
                        </div>
                        <div className="settings-control">
                            <NumberStepper
                                value={timerSettings.longBreakDuration}
                                onChange={(val) => handleTimerChange('longBreakDuration', val)}
                                step={5}
                            />
                        </div>
                    </div>

                    <div className="settings-row">
                        <div className="settings-info">
                            <span className="settings-label">Auto-start Breaks</span>
                            <span className="settings-description">Start immediately after focus</span>
                        </div>
                        <div className="settings-control">
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={timerSettings.autoStartBreaks}
                                    onChange={handleToggleAutoStart}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. Notifications */}
            <section className="settings-section">
                <div className="settings-section-header">
                    <Bell className="settings-icon" size={20} />
                    <h3 className="settings-section-title">Notifications</h3>
                </div>
                <div className="settings-section-body">
                    <div className="settings-row">
                        <div className="settings-info">
                            <span className="settings-label">Sound Effects</span>
                            <span className="settings-description">Play audio cues for events</span>
                        </div>
                        <div className="settings-control">
                            <Volume2 size={16} className={soundEnabled ? "text-primary" : "text-muted"} />
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={soundEnabled}
                                    onChange={() => setSoundEnabled(!soundEnabled)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                    </div>

                    <div className="settings-row">
                        <div className="settings-info">
                            <span className="settings-label">Haptic Feedback</span>
                            <span className="settings-description">Vibrate on mobile devices</span>
                        </div>
                        <div className="settings-control">
                            <Smartphone size={16} className={hapticsEnabled ? "text-primary" : "text-muted"} />
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={hapticsEnabled}
                                    onChange={() => setHapticsEnabled(!hapticsEnabled)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. Account & XP */}
            <section className="settings-section">
                <div className="settings-section-header">
                    <User className="settings-icon" size={20} />
                    <h3 className="settings-section-title">Account</h3>
                </div>
                <div className="settings-section-body">
                    {state.user ? (
                        <div className="profile-preview">
                            <div
                                className="profile-avatar clickable"
                                onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                                title="Click to change avatar"
                            >
                                {state.user.avatar ? (
                                    <img src={state.user.avatar} alt={state.user.name} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                                ) : (
                                    <User size={32} />
                                )}
                                <div className="avatar-edit-overlay">
                                    <span>Edit</span>
                                </div>
                            </div>
                            <div className="profile-details">
                                <span className="profile-name">{state.user.name}</span>
                                <span className="profile-email">{state.user.email}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="profile-preview">
                            <div className="profile-avatar">
                                <User size={32} />
                            </div>
                            <div className="profile-details">
                                <span className="profile-name">Guest User</span>
                                <span className="profile-email">Sign in to sync your data</span>
                            </div>
                        </div>
                    )}

                    {/* Avatar Picker Modal */}
                    {state.user && showAvatarPicker && (
                        <div className="avatar-modal-overlay" onClick={() => setShowAvatarPicker(false)}>
                            <div className="avatar-modal" onClick={(e) => e.stopPropagation()}>
                                {/* Modal Header */}
                                <div className="avatar-modal-header">
                                    <div className="avatar-modal-title-section">
                                        <h3 className="avatar-modal-title">Choose Avatar</h3>
                                        <p className="avatar-modal-subtitle">Select a style and pick your avatar</p>
                                    </div>
                                    <button
                                        className="avatar-modal-close"
                                        onClick={() => setShowAvatarPicker(false)}
                                    >
                                        &times;
                                    </button>
                                </div>

                                {/* Current Avatar Preview */}
                                <div className="avatar-preview-section">
                                    <div className="avatar-preview-current">
                                        {state.user.avatar ? (
                                            <img src={state.user.avatar} alt="Current avatar" />
                                        ) : (
                                            <User size={40} />
                                        )}
                                    </div>
                                    <div className="avatar-preview-info">
                                        <span className="avatar-preview-label">Current Avatar</span>
                                        {state.user.avatar && (
                                            <button
                                                className="avatar-remove-link"
                                                onClick={handleRemoveAvatar}
                                                disabled={savingAvatar}
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Style Selector */}
                                <div className="avatar-style-section">
                                    <span className="avatar-section-label">Style</span>
                                    <div className="avatar-style-list">
                                        {AVATAR_STYLES.map((s) => (
                                            <button
                                                key={s.style}
                                                className={`avatar-style-chip ${selectedStyle === s.style ? 'active' : ''}`}
                                                onClick={() => setSelectedStyle(s.style)}
                                            >
                                                <img
                                                    src={generateAvatarUrl(s.style, 'preview')}
                                                    alt={s.label}
                                                    className="avatar-style-preview"
                                                />
                                                <span>{s.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Avatar Grid */}
                                <div className="avatar-grid-section">
                                    <span className="avatar-section-label">Choose Avatar</span>
                                    <div className="avatar-grid">
                                        {AVATAR_SEEDS.map((seed) => {
                                            const avatarUrl = generateAvatarUrl(selectedStyle, seed);
                                            const isSelected = state.user?.avatar === avatarUrl;
                                            return (
                                                <button
                                                    key={seed}
                                                    className={`avatar-option ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => handleSelectAvatar(avatarUrl)}
                                                    disabled={savingAvatar}
                                                >
                                                    <img src={avatarUrl} alt={seed} />
                                                    {isSelected && (
                                                        <div className="avatar-selected-badge">
                                                            <Check size={12} />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Saving indicator */}
                                {savingAvatar && (
                                    <div className="avatar-saving-indicator">
                                        <RefreshCw size={14} className="spin" />
                                        <span>Saving...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {state.user && (
                        <>
                            {/* XP Display */}
                            <div className="settings-xp-section">
                                <XPDisplay xp={state.user.xp} />
                            </div>

                            {/* Public Profile Toggle */}
                            <div className="settings-row">
                                <div className="settings-info">
                                    <span className="settings-label">
                                        <Globe size={14} style={{ marginRight: 6 }} />
                                        Public Profile
                                    </span>
                                    <span className="settings-description">Show on nearby leaderboard (50 mi)</span>
                                </div>
                                <div className="settings-control">
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={state.user.isPublic}
                                            onChange={() => updateUserProfile({ isPublic: !state.user?.isPublic })}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>

                            {/* Location Status */}
                            <div className="settings-row">
                                <div className="settings-info">
                                    <span className="settings-label">Location</span>
                                    <span className="settings-description">
                                        {state.user.location ? 'Location shared for leaderboard' : 'Grant permission on the Leaderboard page'}
                                    </span>
                                </div>
                                <div className="settings-control">
                                    <span className={`badge ${state.user.location ? 'active' : ''}`}>
                                        {state.user.location ? 'Active' : 'Not Set'}
                                    </span>
                                </div>
                            </div>

                            {/* Show Location on Map Toggle */}
                            <div className="settings-row">
                                <div className="settings-info">
                                    <span className="settings-label">
                                        <MapPin size={14} style={{ marginRight: 6 }} />
                                        Show on Map
                                    </span>
                                    <span className="settings-description">Display your pin on the leaderboard map</span>
                                </div>
                                <div className="settings-control">
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={state.user.showLocationOnMap}
                                            onChange={() => updateUserProfile({ showLocationOnMap: !state.user?.showLocationOnMap })}
                                        />
                                        <span className="toggle-slider"></span>
                                    </label>
                                </div>
                            </div>

                            {/* Subscription */}
                            <div className="settings-row">
                                <div className="settings-info">
                                    <span className="settings-label">Subscription</span>
                                    <span className="settings-description">{state.user.isPro ? 'Pro Plan Active' : 'Free Plan'}</span>
                                </div>
                                <div className="settings-control">
                                    <span className={`badge ${state.user.isPro ? 'active' : ''}`}>
                                        {state.user.isPro ? 'Pro' : 'Free'}
                                    </span>
                                </div>
                            </div>
                        </>
                    )}

                    {state.user && (
                        <div className="settings-row" style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                            <div className="settings-info">
                                <span className="settings-label text-error">Logout</span>
                                <span className="settings-description">Sign out of your account</span>
                            </div>
                            <div className="settings-control">
                                <button
                                    onClick={() => logout()}
                                    className="btn btn-secondary btn-sm btn-danger"
                                >
                                    <LogOut size={14} /> Logout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </section >

            {/* 4. Data Management */}
            < section className="settings-section" >
                <div className="settings-section-header">
                    <Database className="settings-icon" size={20} />
                    <h3 className="settings-section-title">Data</h3>
                </div>
                <div className="settings-section-body">
                    <div className="settings-row">
                        <div className="settings-info">
                            <span className="settings-label">Export Data</span>
                            <span className="settings-description">Download JSON backup</span>
                        </div>
                        <div className="settings-control">
                            <button onClick={handleExport} className="btn btn-secondary btn-sm">
                                <Download size={14} /> Export
                            </button>
                        </div>
                    </div>

                    <div className="settings-row">
                        <div className="settings-info">
                            <span className="settings-label">Import Data</span>
                            <span className="settings-description">Restore from backup</span>
                        </div>
                        <div className="settings-control">
                            <button className="btn btn-secondary btn-sm">
                                <Upload size={14} /> Import
                            </button>
                        </div>
                    </div>

                    <div className="settings-row">
                        <div className="settings-info">
                            <span className="settings-label text-error">Clear Data</span>
                            <span className="settings-description">Remove local data</span>
                        </div>
                        <div className="settings-control">
                            <button className="btn btn-secondary btn-sm btn-danger">
                                <Trash2 size={14} /> Clear
                            </button>
                        </div>
                    </div>
                </div>
            </section >

            {/* 5. Developer Tools */}
            < section className="settings-section" >
                <div className="settings-section-header">
                    <Terminal className="settings-icon" size={20} />
                    <h3 className="settings-section-title">Developer Tools</h3>
                </div>
                <div className="settings-section-body">
                    <div className="settings-row">
                        <div className="settings-info">
                            <span className="settings-label">Seed Dummy Data</span>
                            <span className="settings-description">Generate 15 nearby users with habits, todos & XP</span>
                        </div>
                        <div className="settings-control">
                            <button
                                onClick={handleSeed}
                                className="btn btn-primary btn-sm"
                                disabled={isSeeding}
                            >
                                <Wand2 size={14} /> {isSeeding ? 'Seeding...' : 'Seed Data'}
                            </button>
                        </div>
                    </div>

                    <div className="settings-row">
                        <div className="settings-info">
                            <span className="settings-label">Clear Dummy Users</span>
                            <span className="settings-description">Delete only the generated dummy data</span>
                        </div>
                        <div className="settings-control">
                            <button
                                onClick={handleCleanup}
                                className="btn btn-secondary btn-sm"
                                disabled={isSeeding || dummyUserIds.length === 0}
                            >
                                <RefreshCw size={14} className={isSeeding ? 'spin' : ''} /> Cleanup
                            </button>
                        </div>
                    </div>

                    {seedStatus && (
                        <div className="settings-status-toast">
                            {seedStatus}
                        </div>
                    )}
                </div>
            </section >

            <div className="settings-footer text-muted text-center text-sm py-4">
                Arc Workspace v2.1.0 (Build 5092)
            </div>
        </div >
    );
}
