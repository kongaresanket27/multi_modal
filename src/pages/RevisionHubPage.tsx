/**
 * StudyPilot - Source-grounded revision tools.
 * Flashcards, printable summaries, and spoken briefs are generated from
 * the learner's actual ingested content units, never from a hardcoded syllabus.
 */
import React, { useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, FileText, Layers, Pause, Play, RotateCw, Volume2 } from 'lucide-react';
import { useAppStore } from '../store/useStore';

interface RevisionHubPageProps {
  store: ReturnType<typeof useAppStore>;
}

export const RevisionHubPage: React.FC<RevisionHubPageProps> = ({ store }) => {
  const { course, topicMastery, openCitation } = store;
  const [activeTab, setActiveTab] = useState<'flashcards' | 'summary' | 'audio'>('flashcards');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const weakTopics = topicMastery
    .filter(topic => topic.mastery < 0.65)
    .sort((a, b) => a.mastery - b.mastery);
  const activeTopicId = weakTopics[0]?.topic_id || course.topics[0]?.id || '';
  const activeTopic = course.topics.find(topic => topic.id === activeTopicId);
  const topicUnits = course.content_units.filter(unit => unit.topic_id === activeTopicId);
  const revisionUnits = topicUnits.length ? topicUnits : course.content_units;
  const currentCard = revisionUnits[currentCardIndex];

  const openSource = (unit: typeof course.content_units[number], index: number) => {
    openCitation({
      id: index + 1,
      unit_id: unit.id,
      source_title: unit.title,
      source_file: unit.source_file,
      source_location: unit.source_location,
      source_type: unit.source_type,
      excerpt: unit.full_text_excerpt,
      figure_image_url: unit.figure_image_url,
      video_timestamp_seconds: unit.video_timestamp_seconds,
      youtube_video_id: unit.youtube_video_id,
    });
  };

  const moveCard = (direction: -1 | 1) => {
    if (!revisionUnits.length) return;
    setIsFlipped(false);
    setCurrentCardIndex(previous => (previous + direction + revisionUnits.length) % revisionUnits.length);
  };

  const toggleAudioBrief = () => {
    if (!('speechSynthesis' in window)) return;
    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }
    const sourceText = revisionUnits.slice(0, 6).map(unit =>
      unit.title + '. ' + (unit.summary || unit.full_text_excerpt) + '. Source: ' + unit.source_file + ', ' + unit.source_location + '.'
    ).join(' ');
    if (!sourceText.trim()) return;
    const utterance = new SpeechSynthesisUtterance('StudyPilot revision brief for ' + (activeTopic?.title || 'your course') + '. ' + sourceText);
    utterance.rate = 1.0;
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);
    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  if (!course.content_units.length || !revisionUnits.length) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto">
        <div className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center space-y-3">
          <BookOpen className="w-8 h-8 mx-auto text-indigo-500" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Revision Hub</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">Upload course materials first. Revision cards, summaries, and spoken briefs will use only the content and source locations extracted from those materials.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/50 dark:border-indigo-800/50">Source-grounded revision</span>
            {activeTopic && <span className="text-xs text-slate-500">Priority: {activeTopic.title}</span>}
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Revision Hub</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Cards, summaries, and spoken briefs use your ingested course excerpts and preserve source locations.</p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          {[
            { id: 'flashcards', label: 'Flashcards' },
            { id: 'summary', label: 'Summary' },
            { id: 'audio', label: 'Audio brief' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={`px-3 py-2 rounded-lg font-medium transition-colors ${activeTab === tab.id ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-600 dark:text-slate-400'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {activeTab === 'flashcards' && currentCard && (
        <section className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Card {currentCardIndex + 1} of {revisionUnits.length}</span>
            <span>Flip to reveal the source excerpt</span>
          </div>
          <button type="button" onClick={() => setIsFlipped(value => !value)} className="w-full min-h-[260px] p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-left flex flex-col justify-between gap-6 hover:border-indigo-400 transition-colors">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">{isFlipped ? 'Source excerpt' : 'Concept prompt'}</span>
            <span className="text-lg font-bold leading-relaxed text-slate-900 dark:text-white">{isFlipped ? currentCard.full_text_excerpt || currentCard.summary : currentCard.title}</span>
            <span className="text-xs text-slate-500 flex items-center gap-2"><RotateCw className="w-4 h-4" /> {isFlipped ? currentCard.source_file + ' · ' + currentCard.source_location : 'Select to reveal explanation'}</span>
          </button>
          {isFlipped && (
            <button type="button" onClick={() => openSource(currentCard, currentCardIndex)} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-900">
              <FileText className="w-4 h-4" /> Open cited source
            </button>
          )}
          <div className="flex items-center justify-center gap-3">
            <button type="button" aria-label="Previous card" onClick={() => moveCard(-1)} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"><ChevronLeft className="w-5 h-5" /></button>
            <button type="button" onClick={() => { setIsFlipped(false); setCurrentCardIndex(0); }} className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold">Restart cards</button>
            <button type="button" aria-label="Next card" onClick={() => moveCard(1)} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"><ChevronRight className="w-5 h-5" /></button>
          </div>
        </section>
      )}

      {activeTab === 'summary' && (
        <section className="p-6 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{activeTopic?.title || 'Course summary'}</h2>
              <p className="text-xs text-slate-500 mt-1">Generated from {revisionUnits.length} source-linked content units.</p>
            </div>
            <button type="button" onClick={() => window.print()} className="px-3 py-2 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">Print / Save PDF</button>
          </div>
          <div className="space-y-4">
            {revisionUnits.map((unit, index) => (
              <article key={unit.id} className="border-b border-slate-100 dark:border-slate-800 pb-4 last:border-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{unit.title}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{unit.summary || unit.full_text_excerpt}</p>
                <p className="mt-2 text-[11px] text-slate-500">{unit.source_file} · {unit.source_location}</p>
                <button type="button" onClick={() => openSource(unit, index)} className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">Open source</button>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'audio' && (
        <section className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"><Volume2 className="w-6 h-6" /></div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Spoken revision brief</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Reads up to six source-grounded excerpts aloud using your browser's speech synthesis.</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <p className="text-xs text-slate-600 dark:text-slate-300">{revisionUnits.slice(0, 6).map(unit => unit.title).join(' · ')}</p>
          </div>
          <button type="button" onClick={toggleAudioBrief} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500">
            {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {isPlayingAudio ? 'Stop brief' : 'Play source-grounded brief'}
          </button>
        </section>
      )}
    </div>
  );
};
