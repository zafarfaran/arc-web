// ========================================
// Bottom Dock Navigation - Sleek Professional Style
// ========================================

import { NavLink } from 'react-router-dom';
import { Timer, CheckSquare, Flame, Target, BarChart3, Trophy, Settings } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import ThemeToggle from '../common/ThemeToggle';
import './BottomDock.css';

export default function BottomDock() {
    const { state } = useApp();
    const { todos, habits, goals } = state;

    // Calculate counts
    const activeTasks = todos.filter(t => !t.completed).length;
    const today = new Date().toISOString().split('T')[0];
    const todayDayOfWeek = new Date().getDay();
    const pendingHabits = habits.filter(h =>
        h.targetDays.includes(todayDayOfWeek) && !h.completedDates.includes(today)
    ).length;
    const activeGoals = goals.filter(g => !g.completedAt).length;

    const navItems = [
        { path: '/', label: 'Focus', icon: <Timer size={20} />, count: null },
        { path: '/todos', label: 'Tasks', icon: <CheckSquare size={20} />, count: activeTasks },
        { path: '/habits', label: 'Habits', icon: <Flame size={20} />, count: pendingHabits },
        { path: '/goals', label: 'Goals', icon: <Target size={20} />, count: activeGoals },
        { path: '/reports', label: 'Reports', icon: <BarChart3 size={20} />, count: null },
        { path: '/leaderboard', label: 'Board', icon: <Trophy size={20} />, count: null },
    ];

    return (
        <nav className="bottom-dock">
            <div className="dock-container">
                {/* Main nav items */}
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `dock-item ${isActive ? 'active' : ''}`}
                        title={item.label}
                    >
                        <div className="dock-icon-wrapper">
                            <span className="dock-icon">{item.icon}</span>
                            {item.count !== null && item.count > 0 && (
                                <span className="dock-badge">{item.count > 99 ? '99+' : item.count}</span>
                            )}
                        </div>
                    </NavLink>
                ))}

                {/* Divider */}
                <div className="dock-divider" />

                {/* Settings */}
                <NavLink
                    to="/settings"
                    className={({ isActive }) => `dock-item ${isActive ? 'active' : ''}`}
                    title="Settings"
                >
                    <div className="dock-icon-wrapper">
                        <span className="dock-icon"><Settings size={20} /></span>
                    </div>
                </NavLink>

                {/* Theme Toggle */}
                <div className="dock-item theme-toggle-wrapper">
                    <ThemeToggle />
                </div>
            </div>
        </nav>
    );
}
