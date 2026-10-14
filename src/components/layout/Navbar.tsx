/**
 * StudyPilot - Top Navigation Bar
 * Provides global search, language selection, theme controls, and architecture guidance.
 */

import React from 'react';
import { Search, Flame, Moon, Sun, Network, Globe } from 'lucide-react';
import { useAppStore } from '../../store/useStore';
import { LanguageMode } from '../../types';

interface NavbarProps {
  store: ReturnType<typeof useAppStore>;
  onOpenSearch: () => void;
  onOpenArch: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ store, onOpenSearch, onOpenArch }) => {
  const {
    isDarkMode,
    setIsDarkMode,
    language,
    setLanguage,
    learnerProfile,
    course,
  } = store;

  return (
    <header className="h-16 px-6 border-b border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-between gap-4 sticky top-0 z-30 transition-colors">
      {/* Zone 1: Brand & Course Context */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white font-bold text-base shadow-sm shadow-indigo-500/20">
            S
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            StudyPilot
          </span>
        </div>
        <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 hidden lg:inline truncate max-w-xs">
          {course.code ? course.code + ': ' : ''}{course.title}
        </span>
      </div>

      {/* Zone 2: Global Search Affordance */}
      <div className="flex-1 max-w-md hidden md:flex items-center justify-center">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-900/80 hover:bg-slate-200/70 dark:hover:bg-slate-800/80 rounded-lg border border-slate-200/80 dark:border-slate-800 transition-all cursor-pointer shadow-inner"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Search topics, slide concepts, video timestamps...</span>
          </div>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Zone 3: Interactive Controls & User Metrics */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Architecture Modal Button for Judges & Demo */}
        <button
          onClick={onOpenArch}
          title="View System Architecture & Grounding Pipeline"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-lg border border-indigo-200/60 dark:border-indigo-800/60 transition-colors"
        >
          <Network className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">How It Works</span>
        </button>

        {/* Language Selector */}
        <div className="relative flex items-center">
          <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-2 pointer-events-none" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as LanguageMode)}
            className="pl-7 pr-2 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none"
          >
            <option value="en">English</option>
            <option value="hi">हिंदी (Hindi)</option>
            <option value="hinglish">Hinglish</option>
          </select>
        </div>

        {/* Dark / Light Toggle */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors cursor-pointer"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>

        {/* Learner Streak Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200/60 dark:border-amber-900/50">
          <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500 animate-pulse" />
          <span>{learnerProfile.current_streak_days}d</span>
        </div>

        {/* User Profile Avatar */}
        <div className="flex items-center gap-2 pl-1">
          <img
            src={learnerProfile.avatar_url}
            alt={learnerProfile.student_name}
            referrerPolicy="no-referrer"
            className="w-7 h-7 rounded-full object-cover ring-2 ring-indigo-500/30"
          />
        </div>
      </div>
    </header>
  );
};
