/**
 * StudyPilot - Spaced Repetition Study Planner
 * Generates an adaptive day-by-day study calendar based on Ebbinghaus forgetting curve decay,
 * time remaining before the exam, and low-mastery topic prioritization.
 */

import React, { useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Sparkles,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { useAppStore } from '../store/useStore';
import { generateStudySchedule } from '../learner/spacedRepetition';

interface StudyPlanPageProps {
  store: ReturnType<typeof useAppStore>;
  onStartStudySession: (topicTitle: string) => void;
}

export const StudyPlanPage: React.FC<StudyPlanPageProps> = ({
  store,
  onStartStudySession,
}) => {
  const { course, topicMastery } = store;

  const topicsLookup = useMemo(() => {
    const map: Record<string, { title: string; estimated_study_minutes: number }> = {};
    course.topics.forEach((t) => {
      map[t.id] = { title: t.title, estimated_study_minutes: t.estimated_study_minutes };
    });
    return map;
  }, [course]);

  const schedule = useMemo(() => {
    return generateStudySchedule(
      topicMastery,
      topicsLookup,
      course.exam_date,
      course.target_weekly_hours
    );
  }, [topicMastery, topicsLookup, course.exam_date, course.target_weekly_hours]);

  if (!course.content_units.length || !course.topics.length) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <div className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-3">
          <CalendarIcon className="w-8 h-8 mx-auto text-indigo-500" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Personalized Study Planner</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Upload your course material and complete an assessment. StudyPilot will then schedule reviews from your topic mastery and review-due estimates.</p>
        </div>
      </div>
    );
  }

  // Exam days countdown
  const examDate = new Date(course.exam_date);
  const daysUntilExam = Math.max(1, Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/50 dark:border-indigo-800/50">
              Ebbinghaus Spaced Repetition Engine
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500">
              Exam: {course.exam_date} ({daysUntilExam} days remaining)
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Personalized Study Planner
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Dynamic calendar synchronizing your daily review pace with your memory stability half-life.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Target Pace</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {course.target_weekly_hours} hrs/week (~{(course.target_weekly_hours / 7).toFixed(1)} hrs/day)
            </span>
          </div>
        </div>
      </div>

      {/* Forgetting Curve Concept Card */}
      <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-cyan-500" />
            Adaptive Forgetting Curve Schedule
          </h3>
          <p className="text-xs text-indigo-900/80 dark:text-indigo-300/80 max-w-3xl leading-relaxed">
            Topics with lower estimated mastery or review retrievability are prioritized using the learner model. The schedule changes as you complete assessments and topic mastery is updated.
          </p>
        </div>
        <div className="font-mono text-xs text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 shrink-0">
          Target R(t) &ge; 0.85
        </div>
      </div>

      {/* Schedule Calendar Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-indigo-500" />
          Day-by-Day Adaptive Review Calendar
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schedule.slice(0, 12).map((block, idx) => {
            const isToday = idx === 0;

            let badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
            let urgencyBorder = 'border-slate-200 dark:border-slate-800';

            if (block.urgency === 'high') {
              badgeColor = 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40';
              urgencyBorder = 'border-rose-200 dark:border-rose-900/40';
            } else if (block.urgency === 'medium') {
              badgeColor = 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/40';
            }

            return (
              <div
                key={idx}
                className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border ${urgencyBorder} shadow-xs flex flex-col justify-between space-y-4 relative ${
                  isToday ? 'ring-2 ring-indigo-500/40 shadow-md' : ''
                }`}
              >
                {isToday && (
                  <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shadow-xs">
                    Today's Priority
                  </span>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {block.dayLabel}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {block.estimatedMinutes}m
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                    {block.topicTitle}
                  </h4>

                  <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-medium ${badgeColor}`}>
                    {block.reason === 'weak_mastery'
                      ? 'Critical Mastery Recovery'
                      : block.reason === 'overdue_review'
                      ? 'Memory Decay Due'
                      : block.reason === 'exam_prep'
                      ? 'Final Exam Prep'
                      : 'Maintenance Retrieval'}
                  </span>
                </div>

                <button
                  onClick={() => onStartStudySession(`Review ${block.topicTitle}`)}
                  className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Start Review Session</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
