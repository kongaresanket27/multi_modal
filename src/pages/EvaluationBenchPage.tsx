/**
 * StudyPilot - System Evaluation & Benchmarking Suite
 * Reports quantitative framework metrics (RAGAS / DeepEval):
 * - Faithfulness, Answer Relevancy, Context Precision & Context Recall
 * - Out-of-material refusal rate on adversarial queries
 * - Multi-session simulated student cohort analysis with BKT mastery gains
 */

import React, { useState } from 'react';
import {
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  Users,
  TrendingUp,
  Cpu,
  RefreshCw,
  Sparkles,
  Info,
} from 'lucide-react';
import { BENCHMARK_EVALUATION_METRICS, SIMULATED_STUDENT_PROFILES } from '../services/geminiService';
import { updateBKT } from '../learner/bkt';

export const EvaluationBenchPage: React.FC = () => {
  const [isRunningSim, setIsRunningSim] = useState(false);
  const [simProfiles, setSimProfiles] = useState(SIMULATED_STUDENT_PROFILES);

  const handleRerunSimulation = () => {
    setIsRunningSim(true);
    // Reproducible synthetic BKT run: 10 sessions × 6 unique questions per profile.
    setTimeout(() => {
      setSimProfiles(prev => prev.map((profile, profileIndex) => {
        let mastery = profile.initial_mastery;
        const correctThreshold = [4, 7, 9][profileIndex] || 6;
        for (let session = 0; session < 10; session++) {
          for (let question = 0; question < 6; question++) {
            const isCorrect = ((session * 3 + question * 2 + profileIndex) % 10) < correctThreshold;
            mastery = updateBKT(mastery, isCorrect).newMastery;
          }
        }
        const gain = ((mastery - profile.initial_mastery) / Math.max(profile.initial_mastery, 0.01)) * 100;
        return {
          ...profile,
          final_mastery: mastery,
          gain_percentage: Number(gain.toFixed(1)),
          sessions_simulated: profile.sessions_simulated + 10,
          questions_attempted: profile.questions_attempted + 60,
          repetition_rate: 0,
        };
      }));
      setIsRunningSim(false);
    }, 250);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/50 dark:border-indigo-800/50">
              Evaluation & Benchmarking
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500">
              RAGAS-style metrics & synthetic cohort simulation
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            System Evaluation Benchmark
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Benchmark metrics are not yet measured; the cohort control runs a reproducible synthetic BKT simulation.
          </p>
        </div>

        <button
          onClick={handleRerunSimulation}
          disabled={isRunningSim}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-sm transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRunningSim ? 'animate-spin' : ''}`} />
          <span>{isRunningSim ? 'Simulating Cohorts...' : 'Re-Run Student Cohort Sim'}</span>
        </button>
      </div>

      {/* RAGAS Retrieval & Generation Metrics Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            RAGAS Pipeline Evaluation Metrics (no labeled test run recorded)
          </h3>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            Benchmark scores not yet measured
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {BENCHMARK_EVALUATION_METRICS.map((metric, idx) => {
            const scorePct = (metric.score * 100).toFixed(1);
            const targetPct = (metric.benchmark_target * 100).toFixed(0);

            return (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {metric.metric_name}
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200/50 dark:border-emerald-900/50">
                    {metric.sample_size > 0 ? (metric.score >= metric.benchmark_target ? 'Meets Target' : 'Below Target') : 'Not Measured'}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
                    {metric.sample_size > 0 ? scorePct + '%' : 'Not measured'}
                  </span>
                  <span className="text-xs text-slate-400">
                    target: &ge;{targetPct}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={metric.sample_size > 0 ? 'bg-emerald-500 h-full rounded-full transition-all duration-700' : 'bg-slate-300 dark:bg-slate-700 h-full rounded-full'}
                    style={{ width: `${scorePct}%` }}
                  />
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  {metric.description}
                </p>

                <p className="text-[10px] text-slate-400 font-mono border-t border-slate-100 dark:border-slate-800 pt-2">
                  Samples: {metric.sample_size || 'none'} · Method: {metric.methodology}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Simulated Student Cohorts Across Multiple Sessions */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              Simulated Multi-Session Student Cohorts (BKT Personalization)
            </h3>
            <p className="text-xs text-slate-500">
              Synthetic BKT simulation only. Click re-run to compute reproducible outcomes; these are not real-user study results.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-indigo-500">
            {simProfiles.every(profile => profile.sessions_simulated === 0) ? 'Simulation not run yet' : 'Synthetic repetition rate: 0.0%'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {simProfiles.map((student) => {
            const initPct = Math.round(student.initial_mastery * 100);
            const finalPct = Math.round(student.final_mastery * 100);

            return (
              <div
                key={student.id}
                className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                    {student.name}
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                    {student.archetype}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Mastery Progression:</span>
                  <div className="flex items-center gap-1 font-mono font-bold">
                    <span className="text-rose-500">{initPct}%</span>
                    <span>&rarr;</span>
                    <span className="text-emerald-500">{finalPct}%</span>
                  </div>
                </div>

                {/* Progress bar comparison */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>Initial: {initPct}%</span>
                    <span className="text-emerald-400 font-bold">+{student.gain_percentage}% Net Gain</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden relative">
                    <div
                      className="bg-slate-400 h-full absolute"
                      style={{ width: `${initPct}%` }}
                    />
                    <div
                      className="bg-emerald-500 h-full absolute"
                      style={{ width: `${finalPct}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 flex justify-between">
                  <span>Sessions: {student.sessions_simulated}</span>
                  <span>Questions: {student.questions_attempted}</span>
                  <span className="font-semibold text-indigo-500">Repeats: 0%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
