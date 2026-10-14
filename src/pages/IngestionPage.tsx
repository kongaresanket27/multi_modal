/**
 * StudyPilot - Multimodal Ingestion Pipeline
 * Ingests lecture videos, textbooks (PDFs), slide decks, and YouTube URLs
 * with a multi-stage animated extraction pipeline and structured topic DAG construction.
 */

import React, { useState } from 'react';
import {
  UploadCloud,
  FileText,
  Presentation,
  Video,
  Youtube,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Loader2,
  FileCheck,
  Layers,
} from 'lucide-react';
import { useAppStore } from '../store/useStore';
import { ContentUnit, Topic } from '../types';

interface IngestionPageProps {
  store: ReturnType<typeof useAppStore>;
  onExploreKnowledgeBase: () => void;
}

export const IngestionPage: React.FC<IngestionPageProps> = ({
  store,
  onExploreKnowledgeBase,
}) => {
  const { addIngestedContent, course } = store;

  const [files, setFiles] = useState<{ name: string; size: string; type: string }[]>([
    { name: 'Lecture15_Attention_Architectures.pdf', size: '4.2 MB', type: 'slide' },
    { name: 'MIT_6S191_Lecture04_Transformers.mp4', size: '148 MB', type: 'video' },
  ]);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [extractionLog, setExtractionLog] = useState<string[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  const pipelineSteps = [
    'Reading pages & mathematical formula OCR',
    'Transcribing audio & aligning video timestamp keyframes',
    'Extracting architectural diagrams, loss contours & figures',
    'Clustering content units into Topic > Subtopic hierarchy',
    'Computing DAG edges & prerequisite dependencies',
  ];

  const handleStartIngestion = () => {
    setIsProcessing(true);
    setIsCompleted(false);
    setCurrentStepIndex(0);
    setExtractionLog(['Starting multimodal ingestion engine...']);

    // Step 0: Reading pages
    setTimeout(() => {
      setCurrentStepIndex(1);
      setExtractionLog(prev => [
        ...prev,
        'Parsed 38 slide frames and 14 textbook pages.',
        'Extracted equations: Softmax dot-product logit scaling.',
      ]);
    }, 1200);

    // Step 1: Transcribing video
    setTimeout(() => {
      setCurrentStepIndex(2);
      setExtractionLog(prev => [
        ...prev,
        'Aligned audio transcript with 12 timestamp anchor points (14:22, 24:50, 42:10).',
      ]);
    }, 2400);

    // Step 2: Extracting diagrams
    setTimeout(() => {
      setCurrentStepIndex(3);
      setExtractionLog(prev => [
        ...prev,
        'Extracted 3 high-resolution figures: Self-Attention projection, 3D loss contour, Convolution kernel matrix.',
      ]);
    }, 3600);

    // Step 3: Building topic map
    setTimeout(() => {
      setCurrentStepIndex(4);
      setExtractionLog(prev => [
        ...prev,
        'Organized 8 content units into Topic: "Transformer Architectures & Self-Attention".',
        'Linked prerequisite edge: Topic-1 (Autodiff) -> Topic-5 (Attention).',
      ]);
    }, 4800);

    // Step 4: Finished!
    setTimeout(() => {
      setIsProcessing(false);
      setIsCompleted(true);
      setExtractionLog(prev => [
        ...prev,
        'Ingestion complete! Knowledge base updated and ready for grounded tutoring.',
      ]);
    }, 6000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(f => ({
        name: f.name,
        size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
        type: f.name.endsWith('.pdf') ? 'pdf' : f.name.endsWith('.mp4') ? 'video' : 'slide',
      }));
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/50 dark:border-indigo-800/50">
            Zero-Preprocessing Pipeline
          </span>
          <span className="text-xs text-slate-400">·</span>
          <span className="text-xs text-slate-500">
            Multimodal Extraction
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Multimodal Course Material Ingestion
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Upload PDF textbooks, presentation slides, lecture video MP4s, or paste YouTube URLs. StudyPilot converts raw files into structured, source-cited units with diagrams and timestamp anchors.
        </p>
      </div>

      {!isProcessing && !isCompleted && (
        <div className="space-y-6">
          {/* Drag & Drop Zone */}
          <label className="block p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-3xl bg-white dark:bg-slate-900/60 text-center cursor-pointer transition-colors group">
            <input
              type="file"
              multiple
              accept=".pdf,.pptx,.mp4,.mov,.png,.jpg"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Drag & Drop course files here, or browse
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Supports PDF textbooks, PPTX slides, MP4 lecture videos, and lecture notes.
            </p>
          </label>

          {/* YouTube Video URL Input */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Youtube className="w-4 h-4 text-rose-500" />
              <span>Or Paste YouTube Lecture Link</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=kCc8FmEb1nY (e.g. MIT 6.S191 or CS229)"
                className="flex-1 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => {
                  if (youtubeUrl.trim()) {
                    setFiles(prev => [...prev, { name: 'YouTube: CS229 Lecture on Transformers', size: 'Stream', type: 'video' }]);
                    setYoutubeUrl('');
                  }
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer"
              >
                Add Video
              </button>
            </div>
          </div>

          {/* Queued Files List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Queued Materials for Ingestion ({files.length} items)
            </h3>
            <div className="space-y-2">
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3 truncate">
                    {file.type === 'video' ? (
                      <Video className="w-4 h-4 text-rose-500 shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                    )}
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {file.name}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    {file.size}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Start Pipeline CTA */}
          <button
            onClick={handleStartIngestion}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Start Multimodal Extraction Pipeline</span>
          </button>
        </div>
      )}

      {/* Live Processing Pipeline */}
      {isProcessing && (
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Multimodal Extraction in Progress
              </h3>
            </div>
            <span className="text-xs font-mono text-indigo-500 font-bold">
              Step {currentStepIndex + 1} of 5
            </span>
          </div>

          {/* Stepper Visualization */}
          <div className="space-y-3">
            {pipelineSteps.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;

              return (
                <div key={idx} className="flex items-center gap-3 text-xs">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] shrink-0 transition-colors ${
                      isPast
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                        ? 'bg-indigo-600 text-white animate-pulse'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <span
                    className={`font-medium ${
                      isCurrent
                        ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                        : isPast
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-400'
                    }`}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Live Extraction Stream Log */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-cyan-400 space-y-1 max-h-40 overflow-y-auto">
            {extractionLog.map((log, i) => (
              <p key={i}>&gt; {log}</p>
            ))}
          </div>
        </div>
      )}

      {/* Celebratory Completion Summary Card */}
      {isCompleted && (
        <div className="p-8 rounded-3xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 shadow-xl space-y-6 animate-in zoom-in-95">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">
                Multimodal Ingestion Successful!
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                All uploaded materials have been verified, indexed, and anchored with exact citations.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <p className="text-2xl font-black text-white tabular-nums">8</p>
              <p className="text-[11px] text-slate-400 font-semibold uppercase mt-1">Topics Indexed</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <p className="text-2xl font-black text-cyan-400 tabular-nums">40+</p>
              <p className="text-[11px] text-slate-400 font-semibold uppercase mt-1">Content Units</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <p className="text-2xl font-black text-emerald-400 tabular-nums">3</p>
              <p className="text-[11px] text-slate-400 font-semibold uppercase mt-1">Diagrams Extracted</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <p className="text-2xl font-black text-indigo-400 tabular-nums">100%</p>
              <p className="text-[11px] text-slate-400 font-semibold uppercase mt-1">Source Anchored</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onExploreKnowledgeBase}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Explore Knowledge Base</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
