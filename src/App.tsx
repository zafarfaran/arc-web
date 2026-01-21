// ========================================
// Main App Component with Routing
// ========================================

import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AppProvider, useApp } from './contexts/AppContext';
import PageTransition from './components/layout/PageTransition';
import BottomDock from './components/layout/BottomDock';
import FloatingAIButton from './components/layout/FloatingAIButton';
import PomodoroTimer from './components/pomodoro/PomodoroTimer';
import TodoList from './components/todos/TodoList';
import HabitTracker from './components/habits/HabitTracker';
import GoalsTracker from './components/goals/GoalsTracker';
import Reports from './components/reports/Reports';
import LeaderboardMap from './components/xp/LeaderboardMap';
import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';
import XPGainAnimation from './components/xp/XPGainAnimation';
import XPWidget from './components/xp/XPWidget';
import { BarChart3, Settings } from 'lucide-react';
import './index.css';

// Protected Route Wrapper
function ProtectedRoute() {
  const { state } = useApp();
  if (!state.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

// Layout for internal app pages
function AppLayout() {
  const { state } = useApp();
  const location = useLocation();
  const { timerState } = useTimerContext();

  const hideAIPaths = ['/login', '/signup', '/settings'];
  const shouldShowAI = !hideAIPaths.includes(location.pathname);

  // Hide UI when timer is running on the focus page
  const isFocusRunning = location.pathname === '/' && timerState.status === 'running';

  return (
    <div className="app-container">
      <main className="main-content">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {/* Public Routes */}
            <Route path="/" element={
              <PageTransition>
                <PomodoroTimer />
              </PageTransition>
            } />
            <Route path="/settings" element={
              <PageTransition>
                <SettingsRoute />
              </PageTransition>
            } />
            <Route path="/login" element={
              <PageTransition>
                <LoginPage />
              </PageTransition>
            } />
            <Route path="/signup" element={
              <PageTransition>
                <SignupPage />
              </PageTransition>
            } />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/todos" element={
                <PageTransition>
                  <TodoList />
                </PageTransition>
              } />
              <Route path="/habits" element={
                <PageTransition>
                  <HabitTracker />
                </PageTransition>
              } />
              <Route path="/goals" element={
                <PageTransition>
                  <GoalsTracker />
                </PageTransition>
              } />
              <Route path="/reports" element={
                <PageTransition>
                  <PageWrapper title="REPORTS" icon={<BarChart3 size={20} />}>
                    <Reports />
                  </PageWrapper>
                </PageTransition>
              } />
              <Route path="/leaderboard" element={
                <LeaderboardMap />
              } />
            </Route>
          </Routes>
        </AnimatePresence>
      </main>
      {!isFocusRunning && <BottomDock />}
      {!isFocusRunning && (
        <div className="global-xp-widget">
          <XPWidget />
        </div>
      )}
      {shouldShowAI && !isFocusRunning && <FloatingAIButton />}
      {state.user && <XPGainAnimation xp={state.user.xp} />}
    </div>
  );
}

// Page wrapper for consistent layout
function PageWrapper({ children, title, icon }: { children: React.ReactNode; title: string; icon: React.ReactNode }) {
  return (
    <div className="page-screen">
      <div className="page-header">
        <div className="page-title">
          <span className="page-icon">{icon}</span>
          <span>{title}</span>
        </div>
      </div>
      <div className="page-content">
        {children}
      </div>
    </div>
  );
}

// Coming soon placeholder



import SettingsPage from './components/settings/SettingsPage';

function SettingsRoute() {
  return (
    <PageWrapper title="SETTINGS" icon={<Settings size={20} />}>
      <SettingsPage />
    </PageWrapper>
  );
}

import { TimerProvider, useTimerContext } from './contexts/TimerContext';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <TimerProvider>
          <AppLayout />
        </TimerProvider>
      </BrowserRouter>
    </AppProvider>
  );
}
