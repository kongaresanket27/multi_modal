import React, { useState } from 'react';
import { UploadCloud, FileText, Video, Youtube, CheckCircle2, Sparkles, ArrowRight, Loader2, X, AlertCircle } from 'lucide-react';
import { useAppStore } from '../store/useStore';
import { ContentUnit, Topic } from '../types';
import { registerSourceFile, unregisterSourceFile } from '../services/sourceFiles';

interface IngestionPageProps {
  store: ReturnType<typeof useAppStore>;
  onExploreKnowledgeBase: () => void;
}
type QueuedSource = { id: string; kind: 'file'; file: File } | { id: string; kind: 'youtube'; url: string };

const formatSize = (size: number) => size < 1024 * 1024 ? Math.max(1, Math.round(size / 1024)) + ' KB' : (size / (1024 * 1024)).toFixed(1) + ' MB';
const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const result = String(reader.result || '');
    resolve(result.includes(',') ? result.slice(result.indexOf(',') + 1) : result);
  };
  reader.onerror = () => reject(new Error('Could not read ' + file.name));
  reader.readAsDataURL(file);
});

export const IngestionPage: React.FC<IngestionPageProps> = ({ store, onExploreKnowledgeBase }) => {
  const { addIngestedContent, course } = store;
  const [sources, setSources] = useState<QueuedSource[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [result, setResult] = useState<{ topics: Topic[]; units: ContentUnit[] } | null>(null);

  const addFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files || []);
    const supported = picked.filter(file => /\.(pdf|pptx|mp4|mov|png|jpe?g|txt|md)$/i.test(file.name));
    const withinPerFileLimit = supported.filter(file => file.size <= 18 * 1024 * 1024);
    if (supported.length !== picked.length) setError('Some files were skipped. Supported: PDF, PPTX, MP4/MOV, PNG/JPG, TXT, and MD.');
    if (withinPerFileLimit.length !== supported.length) setError('Files over 18 MB were skipped. Compress or split them before uploading.');
    const currentFiles = sources.filter((source): source is Extract<QueuedSource, { kind: 'file' }> => source.kind === 'file');
    let totalBytes = currentFiles.reduce((total, source) => total + source.file.size, 0);
    const accepted: File[] = [];
    for (const file of withinPerFileLimit) {
      if (currentFiles.length + accepted.length >= 8 || totalBytes + file.size > 32 * 1024 * 1024) {
        setError('A batch can contain up to 8 files and 32 MB total. Remove files or ingest in smaller batches.');
        continue;
      }
      if ([...currentFiles.map(source => source.file.name), ...accepted.map(item => item.name)].includes(file.name) || course.content_units.some(unit => unit.source_file === file.name)) {
        setError('A file named "' + file.name + '" is already queued. Rename duplicate files so citations remain unambiguous.');
        continue;
      }
      accepted.push(file);
      totalBytes += file.size;
    }
    if (accepted.length) {
      accepted.forEach(registerSourceFile);
      setSources(prev => [...prev, ...accepted.map(file => ({ id: crypto.randomUUID(), kind: 'file' as const, file }))]);
      setIsCompleted(false);
    }
    event.target.value = '';
  };

  const addYouTube = () => {
    const url = youtubeUrl.trim();
    if (!url) return;
    if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url)) {
      setError('Enter a valid YouTube URL (youtube.com or youtu.be).');
      return;
    }
    setSources(prev => prev.some(source => source.kind === 'youtube' && source.url === url) ? prev : [...prev, { id: crypto.randomUUID(), kind: 'youtube', url }]);
    setYoutubeUrl('');
    setError('');
    setIsCompleted(false);
  };

  const startIngestion = async () => {
    if (!sources.length || isProcessing) return;
    setIsProcessing(true);
    setIsCompleted(false);
    setError('');
    setWarnings([]);
    setResult(null);
    setLogs(['Preparing source files…']);
    try {
      const files = await Promise.all(sources.filter((s): s is Extract<QueuedSource, { kind: 'file' }> => s.kind === 'file').map(async ({ file }) => ({
        name: file.name,
        mimeType: file.type || ({ pdf: 'application/pdf', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', mp4: 'video/mp4', mov: 'video/quicktime', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', txt: 'text/plain', md: 'text/markdown' } as Record<string, string>)[file.name.split('.').pop()?.toLowerCase() || ''] || 'application/octet-stream',
        data: await toBase64(file),
      })));
      const youtubeUrls = sources.filter((s): s is Extract<QueuedSource, { kind: 'youtube' }> => s.kind === 'youtube').map(s => s.url);
      setLogs(prev => [...prev, 'Sending material to the server-side extraction pipeline…', 'Extracting text and source-grounded concepts with Gemini…']);
      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files, youtubeUrls }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Ingestion failed.');
      const topics = (payload.topics || []) as Topic[];
      const units = (payload.units || []) as ContentUnit[];
      if (!units.length) throw new Error('No grounded content was extracted. Try another file or check the warnings.');
      addIngestedContent(units, topics);
      setResult({ topics, units });
      setWarnings(Array.isArray(payload.warnings) ? payload.warnings : []);
      setLogs(prev => [...prev, 'Received ' + units.length + ' content units across ' + topics.length + ' topics.', 'Added extracted content to your local StudyPilot knowledge base.']);
      setIsCompleted(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected ingestion error.';
      setError(message);
      setLogs(prev => [...prev, 'Ingestion failed: ' + message]);
    } finally {
      setIsProcessing(false);
    }
  };

  const removeSource = (id: string) => {
    const source = sources.find(item => item.id === id);
    if (source?.kind === 'file' && !course.content_units.some(unit => unit.source_file === source.file.name)) unregisterSourceFile(source.file.name);
    setSources(prev => prev.filter(source => source.id !== id));
    setIsCompleted(false);
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <div className="pb-4 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200/50 dark:border-indigo-800/50">Real Ingestion Pipeline</span>
          <span className="text-xs text-slate-400">·</span><span className="text-xs text-slate-500">Multimodal Extraction</span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Multimodal Course Material Ingestion</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Upload actual course material to extract grounded concepts, topics, and source locations. Files are processed by the server and results are added to your StudyPilot knowledge base.</p>
      </div>

      {!isProcessing && !isCompleted && (
        <div className="space-y-6">
          <label className="block p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-3xl bg-white dark:bg-slate-900/60 text-center cursor-pointer transition-colors group">
            <input type="file" multiple accept=".pdf,.pptx,.mp4,.mov,.png,.jpg,.jpeg,.txt,.md" onChange={addFiles} className="hidden" />
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform"><UploadCloud className="w-6 h-6" /></div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Choose course files to upload</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">PDF, PPTX, MP4/MOV, PNG/JPG, TXT, and Markdown. Maximum 18 MB per file and 32 MB total per batch.</p>
          </label>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2"><Youtube className="w-4 h-4 text-rose-500" />Paste a YouTube lecture link</label>
            <div className="flex gap-2">
              <input type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addYouTube(); } }} placeholder="https://www.youtube.com/watch?v=…" className="flex-1 min-w-0 px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              <button type="button" onClick={addYouTube} className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200">Add URL</button>
            </div>
            <p className="text-[11px] text-slate-500">YouTube links use an available English caption track. Links without accessible captions return a warning and are not treated as ingested content.</p>
          </div>

          {error && <div role="alert" className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}</div>}

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Queued materials ({sources.length})</h3>
            {sources.length === 0 ? <p className="text-xs text-slate-400 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50">No files queued yet. Choose files above or add a YouTube URL.</p> : sources.map(source => {
              const name = source.kind === 'file' ? source.file.name : source.url;
              const size = source.kind === 'file' ? formatSize(source.file.size) : 'YouTube URL';
              return <div key={source.id} className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 min-w-0">{source.kind === 'youtube' ? <Youtube className="w-4 h-4 text-rose-500 shrink-0" /> : source.file.type.startsWith('video/') ? <Video className="w-4 h-4 text-rose-500 shrink-0" /> : <FileText className="w-4 h-4 text-indigo-500 shrink-0" />}<span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{name}</span></div>
                <div className="flex items-center gap-3 shrink-0"><span className="text-[11px] font-mono text-slate-400">{size}</span><button onClick={() => removeSource(source.id)} aria-label={'Remove ' + name} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"><X className="w-3.5 h-3.5" /></button></div>
              </div>;
            })}
          </div>

          <button onClick={startIngestion} disabled={!sources.length} className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-md transition-all flex items-center justify-center gap-2"><Sparkles className="w-4 h-4" /><span>Start Real Extraction Pipeline</span></button>
        </div>
      )}

      {isProcessing && <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg space-y-5">
        <div className="flex items-center gap-2.5"><Loader2 className="w-5 h-5 text-indigo-500 animate-spin" /><h3 className="text-sm font-bold text-slate-900 dark:text-white">Processing your actual material</h3></div>
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-cyan-400 space-y-2">{logs.map((log, i) => <p key={i}>&gt; {log}</p>)}</div>
        <p className="text-xs text-slate-500">This can take a little while depending on file size and the AI service response.</p>
      </div>}

      {isCompleted && result && <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-emerald-500/30 shadow-xl space-y-6">
        <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center"><CheckCircle2 className="w-6 h-6" /></div><div><h2 className="text-xl font-black text-slate-900 dark:text-white">Ingestion completed</h2><p className="text-xs text-slate-500 mt-0.5">Extracted results have been added to the current knowledge base.</p></div></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">{[{ value: result.topics.length, label: 'Topics created' }, { value: result.units.length, label: 'Content units' }, { value: result.units.filter(unit => unit.is_figure).length, label: 'Figure references' }].map(item => <div key={item.label} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"><p className="text-2xl font-black text-slate-900 dark:text-white">{item.value}</p><p className="text-[11px] text-slate-500 font-semibold uppercase mt-1">{item.label}</p></div>)}</div>
        {warnings.length > 0 && <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-800 dark:text-amber-200"><strong>Warnings</strong>{warnings.map((warning, i) => <p key={i} className="mt-1">{warning}</p>)}</div>}
        <div className="space-y-2"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Extracted topics</h3>{result.topics.map(topic => <div key={topic.id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800"><p className="text-sm font-bold text-slate-900 dark:text-white">{topic.title}</p><p className="text-xs text-slate-500 mt-1">{topic.unit_count} units · {topic.description}</p></div>)}</div>
        <div className="flex flex-wrap justify-end gap-3 pt-2"><button onClick={() => { setIsCompleted(false); setResult(null); setLogs([]); }} className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300">Ingest more materials</button><button onClick={onExploreKnowledgeBase} className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1.5">Explore Knowledge Base <ArrowRight className="w-4 h-4" /></button></div>
      </div>}

      {!isProcessing && error && !isCompleted && logs.length > 0 && <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300"><strong>Ingestion failed</strong><p className="mt-1">{error}</p><button onClick={startIngestion} className="mt-3 underline font-semibold">Retry ingestion</button></div>}
      {!isProcessing && logs.length > 0 && !isCompleted && <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-cyan-400 space-y-1">{logs.map((log, i) => <p key={i}>&gt; {log}</p>)}</div>}
    </div>
  );
};
