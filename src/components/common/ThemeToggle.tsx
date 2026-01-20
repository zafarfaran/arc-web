// ========================================
// Theme Toggle Component
// ========================================

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import './ThemeToggle.css';

type Theme = 'dark' | 'light';

const STORAGE_KEY = 'arc_theme';

export default function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>(() => {
        // Check localStorage first
        const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
        if (stored) return stored;

        // Check system preference
        if (window.matchMedia('(prefers-color-scheme: light)').matches) {
            return 'light';
        }
        return 'dark';
    });

    useEffect(() => {
        // Apply theme to document
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    return (
        <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
    );
}
