// ========================================
// Mobile Navigation - Bottom Bar
// ========================================

import { NavLink } from 'react-router-dom';
import { Timer, CheckSquare, Flame, Target, BarChart3 } from 'lucide-react';
import './MobileNav.css';

const navItems = [
    { path: '/', label: 'Focus', icon: <Timer size={20} /> },
    { path: '/todos', label: 'Tasks', icon: <CheckSquare size={20} /> },
    { path: '/habits', label: 'Habits', icon: <Flame size={20} /> },
    { path: '/goals', label: 'Goals', icon: <Target size={20} /> },
    { path: '/reports', label: 'Reports', icon: <BarChart3 size={20} /> },
];

export default function MobileNav() {
    return (
        <nav className="mobile-nav">
            {navItems.map((item) => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}
                >
                    <span className="mobile-nav-icon">{item.icon}</span>
                    <span className="mobile-nav-label">{item.label}</span>
                </NavLink>
            ))}
        </nav>
    );
}
