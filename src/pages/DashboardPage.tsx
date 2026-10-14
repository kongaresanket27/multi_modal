/**
 * StudyPilot - Dashboard Page
 * Hero dashboard featuring Bayesian Knowledge Tracing overall mastery ring,
 * 30-day progression charts, spaced repetition review alarms,
 * weak topics with 1-click practice, and adaptive recommendations.
 */

import React from 'react';
import {
  Flame,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  BrainCircuit,
  Sparkles,
  Target,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '../store/useStore';
import { SAMPLE_MASTERY_HISTORY } from '../demo-data/sampleCourse';

interface DashboardPageProps {
  store: ReturnType<typeof useAppStore>;
  onNavigateToQuiz: (topicId?: string) => void;
  onNavigateToTutor: (initialQuery?: string) => void;
  onNavigateToCourseMap: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  store,
  onNavigateToQuiz,
  onNavigateToTutor,
  onNavigateToCourseMap,
}) => {
  const { course, topicMastery, learnerProfile, quizHistory } = store;

  // Compute Overall Weighted Mastery
  const totalMastery = topicMastery.reduce((acc, curr) => acc + curr.mastery, 0);
  const overallMasteryPct = Math.round((totalMastery / topicMastery.length) * 100);

  // Topics needing review or critical
  const weakTopics = topicMastery
    .filter(t => t.mastery < 0.65 || t.retrievability < 0.75)
    .sort((a, b) => a.mastery - b.mastery);

  const topicsDueCount = topicMastery.filter(t => t.review_due_timestamp <= Date.now() + 24 * 3600 * 1000).length;

  // Recommended next topic (lowest mastery with prerequisites satisfied)
  const recommendedTopicState = weakTopics[0] || topicMastery[0];
  const recommendedTopicInfo = course.topics.find(t => t.id === recommendedTopicState.topic_id);

  // Exam Countdown calculation
  const examDate = new Date(course.exam_date);
  const daysUntilExam = Math.max(1, Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Hero Greeting & Motivational Insight */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/50 dark:border-indigo-800/50">
              Personalized Adaptive Engine
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Exam Target: {course.exam_date}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Welcome back, {learnerProfile.student_name}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            You're <span className="font-semibold text-emerald-600 dark:text-emerald-400">+14% stronger</span> in Computational Graphs this week. Your next priority is Transformer Attention.
          </p>
        </div>

        {/* Quick CTA Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateToQuiz(recommendedTopicState.topic_id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
          >
            <BrainCircuit className="w-4 h-4" />
            <span>Practice Recommended Topic</span>
          </button>
          <button
            onClick={onNavigateToCourseMap}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition-colors cursor-pointer"
          >
            <Layers className="w-4 h-4" />
            <span>View Flow Map</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Stats Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall BKT Mastery Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Overall Mastery
            </p>
            <p className="text-3xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
              {overallMasteryPct}%
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>+18% from diagnostic</span>
            </p>
          </div>
          {/* Circular SVG Ring */}
          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100 dark:text-slate-800 stroke-current"
                strokeWidth="3.5"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-indigo-500 stroke-current transition-all duration-1000 ease-out"
                strokeDasharray={`${overallMasteryPct}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums">
              {overallMasteryPct}%
            </span>
          </div>
        </div>

        {/* Quizzes Completed */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Quizzes Taken
          </p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
            {learnerProfile.total_quizzes_taken}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {learnerProfile.total_questions_answered} questions verified
          </p>
        </div>

        {/* Current Active Streak */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Study Streak</span>
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
          </p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-1 tabular-nums">
            {learnerProfile.current_streak_days} <span className="text-sm font-semibold text-slate-400">days</span>
          </p>
          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
            Active today · Goal: 7 days
          </p>
        </div>

        {/* Overdue Review Alerts */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Due for Review</span>
            <Clock className="w-4 h-4 text-rose-500" />
          </p>
          <p className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
            {topicsDueCount} <span className="text-sm font-semibold text-slate-400">topics</span>
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Forgetting curve alert
          </p>
        </div>
      </div>

      {/* Recommended Next Action Banner */}
      {recommendedTopicInfo && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-900 border border-indigo-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-indigo-950/20">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  Recommended Next Step
                </span>
                <span className="text-xs text-slate-500">·</span>
                <span className="text-xs text-slate-400">
                  Learner Model Priority
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                {recommendedTopicInfo.title}
              </h3>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Why this now: Your current mastery is {Math.round(recommendedTopicState.mastery * 100)}% (Critical threshold). Reviewing Query-Key-Value attention is required before advancing to Representation Learning.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateToQuiz(recommendedTopicState.topic_id)}
            className="shrink-0 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Start Practice Quiz (5 min)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Topic Mastery Bars + Progression History Line Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Per-Topic Mastery Breakdown */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Topic Mastery Distribution (BKT Estimates)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Corbett-Anderson 4-parameter probabilistic state
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> &lt;40% Critical
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> 40-70% Review
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> &gt;70% Mastered
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {topicMastery.map((tm) => {
              const info = course.topics.find(t => t.id === tm.topic_id);
              if (!info) return null;
              const pct = Math.round(tm.mastery * 100);

              let barColor = 'bg-rose-500';
              let badgeText = 'Critical';
              let badgeClass = 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-900/40';

              if (pct >= 70) {
                barColor = 'bg-emerald-500';
                badgeText = 'Mastered';
                badgeClass = 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-900/40';
              } else if (pct >= 40) {
                barColor = 'bg-amber-500';
                badgeText = 'Needs Review';
                badgeClass = 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-900/40';
              }

              return (
                <div key={tm.topic_id} className="space-y-1.5 group">
                  <div className="flex items-center justify-between text-xs">
                    <button
                      onClick={() => onNavigateToTutor(`Explain ${info.title}`)}
                      className="font-semibold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 text-left truncate max-w-xs sm:max-w-md transition-colors"
                    >
                      {info.title}
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${badgeClass}`}>
                        {badgeText}
                      </span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums w-9 text-right">
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (5 cols): 30-Day Mastery Trend + Weak Topics Quick Practice */}
        <div className="lg:col-span-5 space-y-6">
          {/* Progression Line Graph Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  30-Day Mastery Trajectory
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Progression from baseline 28% to current 65%
                </p>
              </div>
              <span className="text-xs font-bold font-mono text-indigo-500">
                +37% Net Gain
              </span>
            </div>

            {/* SVG Line Chart with Gradient Area */}
            <div className="h-44 w-full relative">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 300 120">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Horizontal reference grid lines */}
                <line x1="0" y1="20" x2="300" y2="20" stroke="#334155" strokeDasharray="3 3" opacity="0.3" />
                <line x1="0" y1="60" x2="300" y2="60" stroke="#334155" strokeDasharray="3 3" opacity="0.3" />
                <line x1="0" y1="100" x2="300" y2="100" stroke="#334155" strokeDasharray="3 3" opacity="0.3" />

                {/* Filled Area */}
                <path
                  d="M 10 90 L 55 80 L 105 68 L 155 56 L 205 48 L 255 44 L 290 40 L 290 110 L 10 110 Z"
                  fill="url(#chartGradient)"
                />
                {/* Line Path */}
                <path
                  d="M 10 90 L 55 80 L 105 68 L 155 56 L 205 48 L 255 44 L 290 40"
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Points */}
                {[
                  { cx: 10, cy: 90, val: '28%' },
                  { cx: 55, cy: 80, val: '35%' },
                  { cx: 105, cy: 68, val: '44%' },
                  { cx: 155, cy: 56, val: '53%' },
                  { cx: 205, cy: 48, val: '60%' },
                  { cx: 255, cy: 44, val: '63%' },
                  { cx: 290, cy: 40, val: '65%' },
                ].map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.cx}
                    cy={pt.cy}
                    r="4"
                    className="fill-indigo-500 stroke-white dark:stroke-slate-900"
                    strokeWidth="2"
                  />
                ))}
              </svg>
              <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-mono">
                <span>Day 1 (28%)</span>
                <span>Day 10</span>
                <span>Day 20</span>
                <span className="font-bold text-indigo-400">Today (65%)</span>
              </div>
            </div>
          </div>

          {/* Urgent Weak Topics Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Priority Weak Topics
              </h3>
              <span className="text-xs text-slate-400">1-click practice</span>
            </div>

            <div className="space-y-2">
              {weakTopics.slice(0, 3).map((wt) => {
                const info = course.topics.find(t => t.id === wt.topic_id);
                if (!info) return null;

                return (
                  <div
                    key={wt.topic_id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/70 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {info.title}
                      </p>
                      <p className="text-[11px] text-rose-500 font-medium">
                        Mastery: {Math.round(wt.mastery * 100)}% · Due for review
                      </p>
                    </div>
                    <button
                      onClick={() => onNavigateToQuiz(wt.topic_id)}
                      className="shrink-0 p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                      title="Practice this topic"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Quiz Activity Feed */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/90 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Recent Assessment Submissions & Misconception Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quizHistory.slice(0, 3).map((sub) => (
            <div
              key={sub.id}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                  {sub.quiz_title}
                </span>
                <span
                  className={`font-bold font-mono px-2 py-0.5 rounded text-[11px] ${
                    sub.score_percentage >= 75
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50'
                      : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50'
                  }`}
                >
                  {sub.score_percentage}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {sub.correct_questions}/{sub.total_questions} correct · {Math.round(sub.time_spent_seconds / 60)}m duration
              </p>
              {sub.key_misconceptions.length > 0 && (
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300">
                  <span className="font-semibold">Identified Misconception: </span>
                  {sub.key_misconceptions[0]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
