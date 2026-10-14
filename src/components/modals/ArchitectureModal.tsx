/**
 * StudyPilot - Architecture & Methodology Modal
 * Comprehensive visual documentation of the Multimodal Ingestion Pipeline,
 * Citation Grounding Engine, BKT Learner Model Math, and RAGAS Evaluation Framework.
 * Designed for judges and the hackathon demonstration video.
 */

import React from 'react';
import {
  X,
  Layers,
  Database,
  Search,
  MessageSquare,
  Activity,
  CheckCircle2,
  GitCommit,
  ShieldCheck,
  Cpu,
} from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Surface */}
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-10 my-8 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                StudyPilot System Architecture & Grounding Methodology
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track D: Multimodal Personalized Tutoring, Adaptive BKT Modeling & System Evaluation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700 dark:text-slate-300">
          {/* Visual End-to-End Pipeline */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              1. End-to-End Technical Pipeline Flow
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                <span className="font-bold text-indigo-500 block mb-1">01. INGESTION</span>
                <p className="font-semibold text-slate-900 dark:text-white mb-1">Multimodal Input</p>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  Raw PDFs, Slide Decks, and Lecture Videos without manual preprocessing. Extracts text, tables, formulas & diagrams.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                <span className="font-bold text-cyan-500 block mb-1">02. KNOWLEDGE BASE</span>
                <p className="font-semibold text-slate-900 dark:text-white mb-1">Structured DAG</p>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  Organized into Topics &gt; Subtopics &gt; Concepts with prerequisite dependency graphs and exact provenance anchors.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                <span className="font-bold text-emerald-500 block mb-1">03. GROUNDING</span>
                <p className="font-semibold text-slate-900 dark:text-white mb-1">Strict Retrieval</p>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  Hybrid BM25 + semantic similarity. Enforces 100% inline bracket citations [1], [2] and refuses off-syllabus queries.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                <span className="font-bold text-amber-500 block mb-1">04. ASSESSMENT</span>
                <p className="font-semibold text-slate-900 dark:text-white mb-1">Dual-Pass Verify</p>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  Adaptive quiz builder with cross-model solver verification, zero duplicate hash checks, and misconception tagging.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
                <span className="font-bold text-purple-500 block mb-1">05. LEARNER MODEL</span>
                <p className="font-semibold text-slate-900 dark:text-white mb-1">BKT & Spaced Rep</p>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  Bayesian Knowledge Tracing (Corbett & Anderson) + Ebbinghaus memory stability decay curves predicting review due dates.
                </p>
              </div>
            </div>
          </div>

          {/* Mathematical Foundations: BKT */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              2. Bayesian Knowledge Tracing (BKT) Mathematical Model
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
              Maintains per-topic latent mastery probability $P(L_t)$ updated after every observation using standard 4-parameter BKT:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px] bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
              <div>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400 mb-1">Observation Update (Bayes Rule):</p>
                <p className="text-slate-700 dark:text-slate-300">
                  P(L_t | Correct) = [P(L_t) * (1 - P(S))] / [P(L_t)(1 - P(S)) + (1 - P(L_t))P(G)]
                </p>
                <p className="text-slate-700 dark:text-slate-300 mt-1">
                  P(L_t | Incorrect) = [P(L_t) * P(S)] / [P(L_t)P(S) + (1 - P(L_t))(1 - P(G))]
                </p>
              </div>
              <div>
                <p className="font-semibold text-indigo-600 dark:text-indigo-400 mb-1">Transition & Learning Rate:</p>
                <p className="text-slate-700 dark:text-slate-300">
                  P(L_{`{t+1}`}) = P(L_t | Obs) + (1 - P(L_t | Obs)) * P(T)
                </p>
                <p className="text-slate-500 text-[10px] mt-2">
                  Parameters: P(L0)=0.25, P(T)=0.18, P(G)=0.20, P(S)=0.10.
                </p>
              </div>
            </div>
          </div>

          {/* Source Grounding & Refusal Logic */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-500" />
                Citation Grounding & Out-of-Domain Refusal
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Every factual claim in tutor explanations is validated against retrieved content units. Queries outside the uploaded syllabus are automatically flagged with an amber banner, refusing to fabricate answers and strictly demarcating outside knowledge.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Cross-Model Question Verification
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Newly generated assessment items undergo an automated second-pass solve without access to the answer key. Questions where solver and key disagree are immediately discarded, ensuring 100% question reliability.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-950/60">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            Close Documentation
          </button>
        </div>
      </div>
    </div>
  );
};
