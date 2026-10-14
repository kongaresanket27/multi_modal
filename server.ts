/**
 * StudyPilot - Full-Stack Server Entry Point
 * Mounts Express API endpoints with server-side @google/genai SDK
 * and integrates Vite dev server middlewares.
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { inflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';

dotenv.config();

function readZipEntries(input: Buffer): Map<string, Buffer> {
  const entries = new Map<string, Buffer>();
  const minOffset = Math.max(0, input.length - 65557);
  let endOffset = -1;
  for (let i = input.length - 22; i >= minOffset; i--) {
    if (input.readUInt32LE(i) === 0x06054b50) { endOffset = i; break; }
  }
  if (endOffset < 0) throw new Error('Invalid PPTX archive: ZIP directory not found.');
  const entryCount = input.readUInt16LE(endOffset + 10);
  let cursor = input.readUInt32LE(endOffset + 16);
  for (let i = 0; i < entryCount; i++) {
    if (cursor + 46 > input.length || input.readUInt32LE(cursor) !== 0x02014b50) break;
    const method = input.readUInt16LE(cursor + 10);
    const compressedSize = input.readUInt32LE(cursor + 20);
    const nameLength = input.readUInt16LE(cursor + 28);
    const extraLength = input.readUInt16LE(cursor + 30);
    const commentLength = input.readUInt16LE(cursor + 32);
    const localOffset = input.readUInt32LE(cursor + 42);
    const name = input.subarray(cursor + 46, cursor + 46 + nameLength).toString('utf8');
    if (localOffset + 30 <= input.length && input.readUInt32LE(localOffset) === 0x04034b50) {
      const localNameLength = input.readUInt16LE(localOffset + 26);
      const localExtraLength = input.readUInt16LE(localOffset + 28);
      const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = input.subarray(dataOffset, dataOffset + compressedSize);
      if (method === 0) entries.set(name, Buffer.from(compressed));
      else if (method === 8) entries.set(name, inflateRawSync(compressed));
    }
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));

// Shared server-side Gemini client with required User-Agent
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.error('Failed to initialize GoogleGenAI client:', err);
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Grounded Tutor Chat Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, citations, mode, language, learnerMasteryLevel } = req.body;
    if (!message || typeof message !== 'string') return res.status(400).json({ error: 'A question is required.' });
    const safeCitations = Array.isArray(citations) ? citations.filter((c: any) => c && typeof c.excerpt === 'string' && c.excerpt.trim()) : [];

    // A missing retrieval result is not permission to answer from general model knowledge.
    if (!safeCitations.length) {
      return res.json({
        answer: 'I could not find a sufficiently relevant excerpt in the current course materials to answer this reliably. Try a more specific question or upload the relevant lecture, slide, or textbook page.',
        citations: [],
        isOutsideMaterial: true,
        outsideKnowledgeContent: '',
        suggestedFollowUps: ['Browse the knowledge base', 'Upload a relevant course source', 'Ask about a topic listed in your course'],
        learnerAdaptationNote: 'No sufficiently relevant source was retrieved; source-grounded refusal applied.',
      });
    }
    if (!ai) return res.status(503).json({ error: 'GEMINI_API_KEY not configured on server' });

    const citationsText = safeCitations.map((c: any, i: number) =>
      '[Source ' + (i + 1) + '] (' + String(c.source_file || 'Unknown file') + ', ' + String(c.source_location || 'Unknown location') + ')\nTitle: ' + String(c.source_title || '') + '\nExcerpt: "' + String(c.excerpt).slice(0, 12000) + '"'
    ).join('\n\n');
    let modePrompt = 'Explain clearly using only the supplied excerpts.';
    if (mode === 'eli5') modePrompt = 'Explain in simple everyday language, using only the supplied excerpts.';
    if (mode === 'step_by_step') modePrompt = 'Explain in numbered steps. Every step must be supported by the supplied excerpts.';
    if (mode === 'socratic') modePrompt = 'Ask a guiding question grounded in the supplied excerpts; do not add unsupported facts.';
    if (mode === 'quiz_me') modePrompt = 'Briefly summarize the supplied excerpts and ask one check question, without revealing unsupported information.';
    const langPrompt = language === 'hi'
      ? 'Respond in Hindi (Devanagari), preserving technical English terms.'
      : language === 'hinglish' ? 'Respond in conversational Hinglish.' : 'Respond in English.';
    const systemInstruction = 'You are StudyPilot, a source-grounded academic tutor. Answer ONLY from the course excerpts provided. Do not use outside knowledge to fill gaps. If the excerpts do not support the requested answer, explicitly say the course materials do not establish it and do not guess. Cite each factual claim with [1], [2] matching the source list. Never claim a source supports something not present in its excerpt. Student mastery level: ' + String(learnerMasteryLevel || 'unknown') + '. Style: ' + modePrompt + ' ' + langPrompt;
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: 'Course Sources:\n' + citationsText + '\n\nStudent Question: ' + message,
      config: { systemInstruction, temperature: 0.1 },
    });
    const answerText = response.text || 'The supplied excerpts do not contain enough information to answer that reliably.';
    const insufficient = /not (?:covered|included|established|specified|supported)|do not contain enough|does not (?:cover|establish|support)|cannot determine from (?:the )?(?:provided|supplied) (?:sources|excerpts)/i.test(answerText);
    res.json({
      answer: answerText,
      citations: safeCitations,
      isOutsideMaterial: insufficient,
      outsideKnowledgeContent: '',
      suggestedFollowUps: ['How does this connect to a prerequisite topic?', 'Quiz me on this concept', 'Show the exact source excerpt'],
      learnerAdaptationNote: 'Explanation tailored to ' + String(learnerMasteryLevel || 'your') + ' mastery level and constrained to retrieved excerpts.',
    });
  } catch (err: any) {
    console.error('Chat API Error:', err);
    res.status(500).json({ error: err.message || 'Er// Adaptive Quiz Generation Endpoint with independent second-pass verification
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { topicIds = [], count = 5, difficulty = 'medium', pastQuestionIds = [], sourceUnits = [] } = req.body;
    if (!ai) return res.status(503).json({ error: 'GEMINI_API_KEY not configured on server' });
    if (!Array.isArray(sourceUnits) || !sourceUnits.length) {
      return res.status(400).json({ error: 'No source material is available for the selected topics. Upload or select course material first.' });
    }
    const requestedCount = Math.min(10, Math.max(1, Number(count) || 5));
    const selectedUnits = sourceUnits.filter((u: any) => topicIds.includes(u.topic_id) && u.excerpt);
    if (!selectedUnits.length) return res.status(422).json({ error: 'No source excerpts matched the selected topics.' });
    const sourceContext = selectedUnits.slice(0, 60).map((u: any, i: number) =>
      '[U' + i + '] id=' + u.id + '; topic=' + u.topic_name + ' (' + u.topic_id + '); source=' + u.source_file + '; location=' + u.source_location + '; concepts=' + JSON.stringify(u.concept_tags || []) + '\nExcerpt: ' + String(u.excerpt).slice(0, 5000)
    ).join('\n\n');
    const prompt = 'Create ' + requestedCount + ' new academic questions at difficulty ' + String(difficulty) + ' using ONLY the source excerpts below. Mix MCQ, short_answer, and numerical question types when supported. Each question must be answerable from an excerpt and cite the exact source file/location and unit id. Do not make up source locations. Do not repeat any previous question identifiers: ' + JSON.stringify(pastQuestionIds) + '.\nReturn JSON array schema: [{ "id":"temporary-id","type":"mcq|short_answer|numerical","question":"...","options":["A","B","C","D"],"correct_answer":"0 for MCQ, otherwise concise answer","worked_solution":"source-grounded steps with source citations","topic_id":"...","topic_name":"...","concept_tags":["..."],"difficulty":"easy|medium|hard","source_location":"exact source location","source_file":"exact source file","source_type":"pdf|slide|video|youtube","unit_id":"exact source unit id","is_verified":false,"misconceptions":[{"option_index":1,"misconception_label":"...","explanation":"...","cited_source_location":"..."}]}]. For MCQ use four distinct options and a single correct option. Source excerpts:\n' + sourceContext;
    const generated = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json', temperature: 0.2 },
    });
    const parsed = JSON.parse(generated.text || '[]');
    if (!Array.isArray(parsed)) return res.status(502).json({ error: 'The question generator returned an invalid format.' });
    const seen = new Set<string>(Array.isArray(pastQuestionIds) ? pastQuestionIds.map(String) : []);
    const verified: any[] = [];
    for (const candidate of parsed) {
      if (verified.length >= requestedCount) break;
      const source = selectedUnits.find((u: any) => u.id === candidate.unit_id);
      if (!source || !candidate.question || !candidate.correct_answer || !candidate.worked_solution) continue;
      const questionText = String(candidate.question).trim();
      const stableId = 'q-' + createHash('sha256').update(questionText.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()).digest('hex').slice(0, 20);
      if (seen.has(stableId)) continue;
      const isMcq = candidate.type === 'mcq';
      if (isMcq && (!Array.isArray(candidate.options) || candidate.options.length !== 4 || new Set(candidate.options.map(String)).size !== 4)) continue;
      const answerIndex = isMcq ? Number(candidate.correct_answer) : -1;
      if (isMcq && (!Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex > 3)) continue;

      // Independent solve: verifier receives the problem and source excerpt, but never the proposed answer or solution.
      const verificationPrompt = 'Independently solve the following question using only the source excerpt. You MUST NOT assume an answer key. Return JSON {"answer_index": number for MCQ or -1 for non-MCQ, "answer_text":"concise answer for non-MCQ", "supported_by_source":boolean, "reason":"brief source-based reason"}. Question: ' + questionText + '\nOptions: ' + JSON.stringify(isMcq ? candidate.options : []) + '\nSource excerpt: ' + String(source.excerpt).slice(0, 5000);
      const verification = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: verificationPrompt,
        config: { responseMimeType: 'application/json', temperature: 0 },
      });
      let check: any;
      try { check = JSON.parse(verification.text || '{}'); } catch { continue; }
      if (check.supported_by_source !== true) continue;
      if (isMcq && Number(check.answer_index) !== answerIndex) continue;
      if (!isMcq) {
        const independentAnswer = String(check.answer_text || '').trim();
        if (independentAnswer.length < 2) continue;
        const generatedAnswer = String(candidate.correct_answer).trim();
        if (candidate.type === 'numerical') {
          const generatedNumber = generatedAnswer.replace(/,/g, '').match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i)?.[0];
          const solvedNumber = independentAnswer.replace(/,/g, '').match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i)?.[0];
          if (generatedNumber && solvedNumber) {
            const a = Number(generatedNumber), b = Number(solvedNumber);
            if (!Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a - b) > Math.max(0.01, Math.abs(a) * 0.02)) continue;
          } else {
            const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9.]+/g, ' ').trim();
            if (normalize(generatedAnswer) !== normalize(independentAnswer)) continue;
          }
        } else {
          const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
          const expected = normalize(generatedAnswer);
          const solved = normalize(independentAnswer);
          const expectedTokens = new Set(expected.split(/\s+/).filter(Boolean));
          const solvedTokens = new Set(solved.split(/\s+/).filter(Boolean));
          const overlap = [...expectedTokens].filter(token => solvedTokens.has(token)).length / Math.max(1, Math.min(expectedTokens.size, solvedTokens.size));
          if (expected !== solved && !expected.includes(solved) && !solved.includes(expected) && overlap < 0.6) continue;
        }
      }

      const question = {
        ...candidate,
        id: stableId,
        type: ['mcq', 'short_answer', 'numerical'].includes(candidate.type) ? candidate.type : 'mcq',
        options: isMcq ? candidate.options.map(String) : undefined,
        topic_id: source.topic_id,
        topic_name: source.topic_name,
        source_file: source.source_file,
        source_location: source.source_location,
        source_type: source.source_type,
        unit_id: source.id,
        concept_tags: Array.isArray(candidate.concept_tags) ? candidate.concept_tags.map(String) : source.concept_tags || [],
        difficulty: ['easy', 'medium', 'hard'].includes(candidate.difficulty) ? candidate.difficulty : (difficulty === 'adaptive' ? 'medium' : difficulty),
        is_verified: true,
        verification_notes: 'Independently solved in a second model pass without exposing the proposed answer key.',
      };
      seen.add(stableId);
      verified.push(question);
    }
    if (!verified.length) return res.status(422).json({ error: 'No generated questions passed independent answer verification and source checks. Try a different topic or difficulty.' });
    res.json({ questions: verified, requestedCount, verifiedCount: verified.length, verification: 'independent-second-pass' });
  } catch (err: any) {
    console.error('Quiz Generation Error:', err);
    res.status(500).json({ error: err.message || 'Error generating verified questions' });
  }
});

e || 'Error generating quiz' });
  }
});

// Answer Grading Endpoint
app.post('/api/grade-answer', async (req, res) => {
  try {
    const { question, userAnswer } = req.body;

    if (!ai) {
      return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
    }

    const prompt = `Question: "${question.question}"
Correct Answer / Worked Solution: "${question.worked_solution}"
Student Answer: "${userAnswer}"

Grade the student answer on a scale from 0.0 to 1.0 (with partial credit). Return JSON:
{
  "isCorrect": boolean,
  "partialScore": number,
  "feedback": "constructive 1-2 sentence explanation"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const result = JSON.parse(response.text || '{}');
    res.json(result);
  } catch (err: any) {
    console.error('Grading Error:', err);
    res.status(500).json({ error: err.message || 'Error grading answer' });
  }
});


app.post('/api/ingest', async (req, res) => {
  try {
    const body = req.body as { files?: Array<{ name: string; mimeType: string; data: string }>; youtubeUrls?: string[] };
    const files = body.files || [];
    const youtubeUrls = body.youtubeUrls || [];
    if (!ai) return res.status(503).json({ error: 'GEMINI_API_KEY not configured on server' });
    if (!Array.isArray(files) || !Array.isArray(youtubeUrls) || (!files.length && !youtubeUrls.length)) {
      return res.status(400).json({ error: 'Add at least one supported file or YouTube URL.' });
    }
    if (files.length > 8) return res.status(400).json({ error: 'Upload up to 8 files per batch.' });

    const parts: any[] = [];
    const sourceNames: string[] = [];
    const sourceTypes = new Map<string, string>();
    const ingestionWarnings: string[] = [];
    for (const file of files) {
      if (!file?.name || !file?.mimeType || !file?.data) return res.status(400).json({ error: 'A file is missing its name, MIME type, or content.' });
      const name = String(file.name).slice(0, 200);
      const mimeType = String(file.mimeType);
      const bytes = Buffer.from(String(file.data).replace(/^data:[^;]+;base64,/, ''), 'base64');
      if (!bytes.length) return res.status(400).json({ error: 'Could not read ' + name + '.' });
      if (bytes.length > 18 * 1024 * 1024) return res.status(413).json({ error: name + ' exceeds the 18 MB per-file inline ingestion limit. Compress or split it.' });

      if (mimeType.includes('presentation') || name.toLowerCase().endsWith('.pptx')) {
        const zipEntries = readZipEntries(bytes);
        const slidePaths = [...zipEntries.keys()].filter(p => /^ppt\/slides\/slide\d+\.xml$/.test(p))
          .sort((a, b) => Number(a.match(/slide(\d+)/)?.[1]) - Number(b.match(/slide(\d+)/)?.[1]));
        const slideTexts: string[] = [];
        for (const p of slidePaths) {
          const xml = await Promise.resolve(zipEntries.get(p)?.toString('utf8') || '');
          const text = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(m => m[1]
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")).join(' ');
          if (text.trim()) slideTexts.push('Slide ' + p.match(/slide(\d+)/)?.[1] + ': ' + text);
        }
        parts.push({ text: 'PowerPoint source "' + name + '". Extracted slide text:\n' + slideTexts.join('\n') });
        // Also send embedded slide images so visual diagrams can be interpreted, not just slide text.
        const mediaPaths = [...zipEntries.keys()].filter(p => /^ppt\/media\/.+\.(png|jpe?g|webp)$/i.test(p)).slice(0, 8);
        for (const mediaPath of mediaPaths) {
          const mediaBytes = await Promise.resolve(zipEntries.get(mediaPath) || Buffer.alloc(0));
          if (mediaBytes.length > 0 && mediaBytes.length <= 4 * 1024 * 1024) {
            const extension = mediaPath.split('.').pop()?.toLowerCase();
            const imageMime = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : extension === 'webp' ? 'image/webp' : 'image/png';
            parts.push({ text: 'Embedded figure from presentation "' + name + '" (' + mediaPath + '). Describe only what is visibly present; associate it with the nearest slide if the relationship is clear.' });
            parts.push({ inlineData: { mimeType: imageMime, data: mediaBytes.toString('base64') } });
          }
        }
      } else if (mimeType === 'application/pdf' || mimeType.startsWith('image/') || mimeType.startsWith('video/')) {
        if (mimeType.startsWith('video/') && bytes.length > 18 * 1024 * 1024) return res.status(413).json({ error: 'Video is too large for inline processing: ' + name });
        parts.push({ text: 'Analyze source file "' + name + '". Only report page, figure, slide, or timestamp locations supported by the supplied content.' });
        parts.push({ inlineData: { mimeType, data: bytes.toString('base64') } });
      } else if (mimeType.startsWith('text/')) {
        parts.push({ text: 'Source file "' + name + '":\n' + bytes.toString('utf8').slice(0, 120000) });
      } else {
        return res.status(415).json({ error: 'Unsupported file type: ' + name + '. Use PDF, PPTX, MP4/MOV, PNG/JPG, or text files.' });
      }
      sourceNames.push(name);
      sourceTypes.set(name, name.toLowerCase().endsWith('.pptx') ? 'slide' : mimeType === 'application/pdf' ? 'pdf' : mimeType.startsWith('image/') ? 'slide' : mimeType.startsWith('video/') ? 'video' : 'pdf');
    }

    for (const urlValue of youtubeUrls) {
      const url = String(urlValue).trim();
      if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url)) return res.status(400).json({ error: 'Not a valid YouTube URL: ' + url });
      const videoId = url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/)?.[1];
      let transcriptAdded = false;
      if (videoId) {
        try {
          const transcriptResponse = await fetch('https://www.youtube.com/api/timedtext?lang=en&v=' + videoId);
          if (transcriptResponse.ok) {
            const xml = await transcriptResponse.text();
            const entries = [...xml.matchAll(/<text[^>]*start="([0-9.]+)"[^>]*>([\s\S]*?)<\/text>/g)];
            const transcript = entries.map(match => {
              const seconds = Number(match[1]);
              const stamp = Math.floor(seconds / 60) + ':' + String(Math.floor(seconds % 60)).padStart(2, '0');
              const text = match[2].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
              return '[' + stamp + '] ' + text;
            }).join('\n');
            if (transcript.trim()) {
              parts.push({ text: 'Actual English caption transcript for YouTube video ' + url + '. Timestamps come from the caption track.\n' + transcript.slice(0, 100000) });
              transcriptAdded = true;
            }
          }
        } catch (transcriptError) {
          console.warn('YouTube caption retrieval failed for', url, transcriptError);
        }
      }
      if (!transcriptAdded) ingestionWarnings.push('Could not retrieve an available English caption track for ' + url + '. No transcript-based content was generated for this link; upload a transcript or video file to ingest it.');
      sourceNames.push(url);
      if (transcriptAdded) sourceTypes.set(url, 'youtube');
    }

    const systemInstruction = 'You are StudyPilot, a source-faithful course material ingestion engine. Analyze only supplied materials; never invent facts, page numbers, slide numbers, timestamps, or diagrams. Return only valid JSON: {"topics":[{"id":"topic-slug","title":"...","description":"...","subtopics":["..."],"concepts":["..."],"estimated_study_minutes":15,"prerequisite_ids":[]}],"units":[{"id":"unique-id","title":"...","summary":"...","full_text_excerpt":"...","topic_id":"matching topic id","topic_name":"...","subtopic":"...","concept_tags":["..."],"difficulty":"easy|medium|hard","source_type":"pdf|slide|video|youtube","source_file":"exact filename or URL","source_location":"grounded Page N, Slide N, or timestamp","video_timestamp_seconds":0,"youtube_video_id":"if known","is_figure":false,"figure_caption":""}],"warnings":[]} Create up to 12 meaningful units per source and 1-8 topics. Keep each excerpt grounded in the actual material. Do not create units for inaccessible URLs.';
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ role: 'user', parts: [...parts, { text: 'Ingest these sources: ' + sourceNames.join(', ') + '. Return structured, grounded units and topics.' }] }],
      config: { systemInstruction, responseMimeType: 'application/json', temperature: 0.1 },
    });
    const parsed = JSON.parse(response.text || '{}');
    const topics = Array.isArray(parsed.topics) ? parsed.topics : [];
    const units = Array.isArray(parsed.units) ? parsed.units : [];
    const warnings = [...ingestionWarnings, ...(Array.isArray(parsed.warnings) ? parsed.warnings.map(String) : [])];
    if (!units.length) return res.status(422).json({ error: 'No grounded content units could be extracted from these sources.', warnings });

    const safeTopics = topics.map((t: any, i: number) => ({
      id: String(t.id || ('ingested-topic-' + Date.now() + '-' + i)),
      title: String(t.title || 'Untitled topic'),
      description: String(t.description || ''),
      subtopics: Array.isArray(t.subtopics) ? t.subtopics.map(String) : [],
      concepts: Array.isArray(t.concepts) ? t.concepts.map(String) : [],
      estimated_study_minutes: Number(t.estimated_study_minutes) || 15,
      prerequisite_ids: Array.isArray(t.prerequisite_ids) ? t.prerequisite_ids.map(String) : [],
      unit_count: 0,
    }));
    const topicNames = new Map(safeTopics.map((t: any) => [t.id, t.title]));
    const safeUnits = units.filter((u: any) => sourceTypes.has(String(u.source_file || ''))).map((u: any, i: number) => {
      const topicId = String(u.topic_id || safeTopics[0]?.id || 'ingested-topic');
      const unit: any = {
        id: String(u.id || ('ingested-unit-' + Date.now() + '-' + i)),
        title: String(u.title || 'Untitled content'),
        summary: String(u.summary || ''),
        full_text_excerpt: String(u.full_text_excerpt || ''),
        topic_id: topicId,
        topic_name: String(u.topic_name || topicNames.get(topicId) || 'Course material'),
        subtopic: String(u.subtopic || ''),
        concept_tags: Array.isArray(u.concept_tags) ? u.concept_tags.map(String) : [],
        difficulty: ['easy', 'medium', 'hard'].includes(u.difficulty) ? u.difficulty : 'medium',
        source_type: sourceTypes.get(String(u.source_file || '')) || 'pdf',
        source_file: String(u.source_file),
        source_location: String(u.source_location || 'Location not identified'),
      };
      if (Number.isFinite(Number(u.video_timestamp_seconds))) unit.video_timestamp_seconds = Number(u.video_timestamp_seconds);
      else {
        const stamp = unit.source_location.match(/(?:^|\\s)(?:(\\d+):)?(\\d{1,2}):(\\d{2})(?:$|\\s)/);
        if (stamp) unit.video_timestamp_seconds = (Number(stamp[1] || 0) * 3600) + (Number(stamp[2]) * 60) + Number(stamp[3]);
      }
      const sourceVideoId = unit.source_type === 'youtube' ? unit.source_file.match(/(?:v=|youtu\\.be\\/|shorts\\/)([A-Za-z0-9_-]{11})/)?.[1] : undefined;
      if (sourceVideoId) unit.youtube_video_id = sourceVideoId;
      else if (u.youtube_video_id) unit.youtube_video_id = String(u.youtube_video_id);
      if (u.is_figure) { unit.is_figure = true; unit.figure_caption = String(u.figure_caption || ''); }
      return unit;
    });
    if (!safeUnits.length) return res.status(422).json({ error: 'The model did not return units tied to a readable supplied source. No unsupported units were added.', warnings });
    for (const topic of safeTopics) topic.unit_count = safeUnits.filter((u: any) => u.topic_id === topic.id).length;
    return res.json({ topics: safeTopics, units: safeUnits, warnings, sourceCount: sourceNames.length });
  } catch (err: any) {
    console.error('Ingestion API Error:', err);
    return res.status(500).json({ error: err.message || 'Error processing course materials' });
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`StudyPilot full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
