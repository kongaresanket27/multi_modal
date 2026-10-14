/**
 * StudyPilot - Revision Hub Page
 * Targeted revision materials for weak course topics:
 * - Interactive 3D flip flashcards
 * - One-page high-yield formula & concept cheat sheets
 * - Audio brief player with animated waveform and speech synthesis
 */

import React, { useState } from 'react';
import {
  Layers,
  RotateCw,
  Volume2,
  FileText,
  Sparkles,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  CheckCircle2,
} from 'lucide-react';
import { useAppStore } from '../store/useStore';

interface RevisionHubPageProps {
  store: ReturnType<typeof useAppStore>;
}

export const RevisionHubPage: React.FC<RevisionHubPageProps> = ({ store }) => {
  const { course, topicMastery } = store;

  // Weak topics prioritized
  const weakTopics = topicMastery
    .filter((t) => t.mastery < 0.65)
    .sort((a, b) => a.mastery - b.mastery);

  const activeTopicId = weakTopics[0]?.topic_id || 'topic-5';
  const activeTopic = course.topics.find((t) => t.id === activeTopicId) || course.topics[0];

  const [activeTab, setActiveTab] = useState<'flashcards' | 'cheatsheet' | 'audio'>('flashcards');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // High-yield revision cards for the active weak topic
  const flashcards = [
    {
      front: 'Why divide by \\sqrt{d_k} in Scaled Dot-Product Attention?',
      back: 'To prevent the softmax function from saturating into regions of near-zero gradients. For large d_k, the variance of the dot product grows as d_k; dividing by \\sqrt{d_k} scales variance back to 1. (Vaswani et al., Page 4)',
      source: 'AttentionIsAllYouNeed_Vaswani2017.pdf (Page 04)',
    },
    {
      front: 'What is the key geometric difference between SGD and Momentum in ill-conditioned ravines?',
      back: 'Standard SGD oscillates violently between high-curvature walls. Momentum maintains a velocity vector that cancels orthogonal oscillations while accelerating along the consistent gentle ravine slope. (Goodfellow Ch 8, Slide 7)',
      source: 'Lecture14_OptimizationLandscapes.pdf (Slide 07)',
    },
    {
      front: 'Why do saddle points dominate critical points in high-dimensional loss landscapes?',
      back: 'For a critical point in D dimensions to be a local minimum, all D eigenvalues of the Hessian must be positive (probability ~ 2^{-D}). At modern scale where D > 10^6, critical points are virtually always saddle points. (Dauphin et al.)',
      source: 'Lecture14_OptimizationLandscapes.pdf (Slide 07)',
    },
    {
      front: 'What is the Receptive Field growth formula in 2D Convolutional Networks?',
      back: 'RF_l = RF_{l-1} + (K_l - 1) * \\prod_{i=1}^{l-1} S_i. Stride compounds multiplicatively, causing later layers to aggregate exponential visual context.',
      source: 'ComputerVision_Foundations_Ch04.pdf (Page 112)',
    },
  ];

  const currentCard = flashcards[currentCardIndex];

  const handleNextCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev + 1) % flashcards.length);
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  const toggleAudioBrief = () => {
    if (!('speechSynthesis' in window)) return;
    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }
    const text = `StudyPilot Audio Brief for ${activeTopic.title}. In this high-yield review: self-attention computes query-key similarity matrices normalized by softmax. The key insight is dividing by the square root of d_k, which prevents gradient vanishing. In residual connections, direct identity skip highways ensure unobstructed backpropagation from the loss to early weights.`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);
    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/50 dark:border-indigo-800/50">
              Targeted Weak-Topic Synthesis
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-rose-500 font-semibold">
              Prioritizing: {activeTopic.title}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Revision Hub & Audio Briefs
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            High-yield active recall flashcards, one-page summary cheat sheets, and spoken lecture recaps.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          {[
            { id: 'flashcards', label: 'Active Recall Cards' },
            { id: 'cheatsheet', label: '1-Page Summary' },
            { id: 'audio', label: 'Spoken Audio Brief' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* FLASHCARDS TAB */}
      {activeTab === 'flashcards' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Card {currentCardIndex + 1} of {flashcards.length}</span>
            <span>Click card to reveal explanation and cited source</span>
          </div>

          {/* 3D Flip Card Container */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full min-h-[280px] p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg cursor-pointer flex flex-col justify-between transition-all hover:border-indigo-500/50 relative overflow-hidden group select-none"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">
                {isFlipped ? 'Answer & Source Grounding' : 'Concept Question'}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <RotateCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
                <span>Flip Card</span>
              </span>
            </div>

            <div className="my-6">
              {!isFlipped ? (
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
                  {currentCard.front}
                </h3>
              ) : (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                    {currentCard.back}
                  </p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono">
                    Provenance: {currentCard.source}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 dark:border-slate-800/80 pt-4">
              <span>{activeTopic.title}</span>
              <span>StudyPilot Spaced Recall</span>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handlePrevCard}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextCard}
              className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* 1-PAGE SUMMARY CHEAT SHEET TAB */}
      {activeTab === 'cheatsheet' && (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                Exam Quick Review Sheet
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                {activeTopic.title} - Core Formulas & Principles
              </h2>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
            >
              Print / Save PDF
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                1. Core Attention Mathematical Derivation
              </h4>
              <p className="font-mono bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400">
                Attention(Q, K, V) = softmax((Q K^T) / \\sqrt{'{d_k}'}) V
              </p>
              <p>
                Query vectors (Q) project intent; key vectors (K) project index addresses; value vectors (V) project contextual content. Division by \\sqrt{'{d_k}'} normalizes dot-product variance from Var(Q·K) = d_k down to 1.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                2. Multi-Head Representation Projection
              </h4>
              <p className="font-mono bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400">
                MultiHead(Q,K,V) = Concat(head_1, ..., head_h) W^O
              </p>
              <p>
                Each head projects into d_k = d_model / h dimensions, capturing distinct semantic, syntactic, and positional relationship subspaces simultaneously.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                3. Computational Graph Adjoint Rule
              </h4>
              <p className="font-mono bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-indigo-600 dark:text-indigo-400">
                \\nabla_W L = (\\nabla_Y L) * X^T
              </p>
              <p>
                Reverse-mode backpropagation requires linear time O(W) with respect to parameter weight count, caching activations during forward execution.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                4. Common Exam Traps & Misconceptions
              </h4>
              <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                <li>Dividing by \\sqrt{'{d_k}'} does NOT reduce O(N^2) token complexity.</li>
                <li>Critical points in high dimensions are almost always saddle points, not local minima.</li>
                <li>Double descent peaks at the interpolation threshold where training error hits zero.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SPOKEN AUDIO BRIEF TAB */}
      {activeTab === 'audio' && (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-500">
                AI Voice Synthesis
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                Spoken Lecture Brief: {activeTopic.title}
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">Duration: ~2 min</span>
          </div>

          {/* Animated Waveform Visualizer */}
          <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center gap-1.5 h-28">
            {[40, 65, 85, 30, 95, 45, 75, 90, 50, 70, 35, 80, 95, 60, 45, 80, 55, 70].map((h, i) => (
              <div
                key={i}
                className={`w-1.5 rounded-full transition-all duration-300 ${
                  isPlayingAudio ? 'bg-indigo-500 animate-pulse' : 'bg-slate-700'
                }`}
                style={{ height: isPlayingAudio ? `${h}%` : '20%' }}
              />
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Listen to an executive overview summarizing the key derivations, assumptions, and exam tips.
            </p>
            <button
              onClick={toggleAudioBrief}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all cursor-pointer shrink-0"
            >
              {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{isPlayingAudio ? 'Pause Spoken Brief' : 'Play Spoken Brief'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
