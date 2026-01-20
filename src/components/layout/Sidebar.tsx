// ========================================
// Navigation Menu - Overlay Style
// ========================================

import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import {
    Timer,
    CheckSquare,
    Target,
    BarChart3,
    Settings,
    Flame,
    Menu,
    X,
    Lock,
    LogIn,
    LogOut,
    Trophy,
} from 'lucide-react';
import XPDisplay from '../xp/XPDisplay';
import ThemeToggle from '../common/ThemeToggle';
import './Sidebar.css';

interface NavItem {
    path: string;
    label: string;
    icon: React.ReactNode;
}

const navItems: NavItem[] = [
    { path: '/', label: 'Focus', icon: <Timer size={20} /> },
    { path: '/todos', label: 'Tasks', icon: <CheckSquare size={20} /> },
    { path: '/habits', label: 'Habits', icon: <Flame size={20} /> },
    { path: '/goals', label: 'Goals', icon: <Target size={20} /> },
    { path: '/reports', label: 'Reports', icon: <BarChart3 size={20} /> },
    { path: '/leaderboard', label: 'Leaderboard', icon: <Trophy size={20} /> },
];

export default function Sidebar() {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const { state, logout } = useApp();

    const toggleMenu = () => setIsOpen(!isOpen);
    const closeMenu = () => setIsOpen(false);

    // Close menu when route changes
    useEffect(() => {
        closeMenu();
    }, [location.pathname]);

    const isPublic = (path: string) => path === '/' || path === '/settings';

    return (
        <>
            {/* Menu Toggle Button */}
            <button className="menu-toggle" onClick={toggleMenu} aria-label="Open menu">
                <Menu size={20} />
            </button>

            {/* Overlay */}
            {isOpen && <div className="nav-overlay" onClick={closeMenu} />}

            {/* Navigation Panel */}
            <aside className={`nav-panel ${isOpen ? 'open' : ''}`}>
                {/* Header */}
                <div className="nav-header">
                    <div className="nav-brand">
                        <span className="brand-dot" />
                        <span className="brand-name">ARC</span>
                    </div>
                    <div className="nav-header-actions">
                        <ThemeToggle />
                        <button className="close-btn" onClick={closeMenu} aria-label="Close menu">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* XP Display (if authenticated) */}
                {state.isAuthenticated && state.user && (
                    <div className="nav-xp-section">
                        <XPDisplay xp={state.user.xp} compact />
                    </div>
                )}

                {/* Navigation */}
                <nav className="nav-links">
                    {navItems.map((item) => {
                        const isLocked = !state.isAuthenticated && !isPublic(item.path);
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            >
                                <span className="nav-text">{item.label.toUpperCase()}</span>
                                {isLocked && <span className="nav-lock" style={{ marginLeft: 'auto', opacity: 0.5 }}><Lock size={14} /></span>}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="nav-footer">
                    <NavLink to="/settings" className="nav-link" style={{ marginBottom: '8px' }}>
                        <span className="nav-icon"><Settings size={18} /></span>
                        <span className="nav-text">SETTINGS</span>
                    </NavLink>

                    {state.isAuthenticated ? (
                        <button className="nav-link logout-btn" onClick={() => logout()}>
                            <span className="nav-icon"><LogOut size={18} /></span>
                            <span className="nav-text">LOG OUT</span>
                        </button>
                    ) : (
                        <NavLink to="/login" className="nav-link" style={{ color: 'var(--primary)' }}>
                            <span className="nav-icon"><LogIn size={18} /></span>
                            <span className="nav-text">LOG IN</span>
                        </NavLink>
                    )}
                </div>
            </aside>
        </>
    );
}

