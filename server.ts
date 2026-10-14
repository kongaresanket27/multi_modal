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
import JSZip from 'jszip';

dotenv.config();

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

    if (!ai) {
      return res.status(503).json({ error: 'GEMINI_API_KEY not configured on server' });
    }

    const citationsText = (citations || [])
      .map((c: any, i: number) => `[Source ${i + 1}] (${c.source_file}, ${c.source_location})\nTitle: ${c.source_title}\nExcerpt: "${c.excerpt}"`)
      .join('\n\n');

    let modePrompt = 'Provide an authoritative, source-grounded academic explanation with step-by-step logic.';
    if (mode === 'eli5') modePrompt = 'Explain in simple everyday intuitive terms without heavy jargon.';
    if (mode === 'step_by_step') modePrompt = 'Explain in numbered sequential logical steps.';
    if (mode === 'socratic') modePrompt = 'Ask guiding questions to help the student derive the answer from the excerpts.';

    let langPrompt = '';
    if (language === 'hi') langPrompt = 'Respond in formal Hindi (Devanagari script) with technical English terms preserved.';
    if (language === 'hinglish') langPrompt = 'Respond in natural conversational Hinglish (Hindi in Latin script with English academic terms).';

    const systemInstruction = `You are StudyPilot, an elite university tutor.
CRITICAL GROUNDING RULES:
1. Base your answer EXCLUSIVELY on the provided course sources below.
2. Every claim must have an inline bracket citation like [1] or [2] matching the source index.
3. If the sources do NOT contain enough information to answer, state clearly that it is not covered in the course syllabus.
4. Adapt to the student's mastery level: ${learnerMasteryLevel}.
5. Style: ${modePrompt}
${langPrompt}`;

    const prompt = `Course Sources:\n${citationsText}\n\nStudent Question: "${message}"`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2, // low temperature for high grounding fidelity
      },
    });

    const answerText = response.text || '';

    res.json({
      answer: answerText,
      citations: citations || [],
      isOutsideMaterial: false,
      suggestedFollowUps: [
        'How does this connect to previous topics?',
        'Can you show a mathematical edge case?',
        'Quiz me on this concept',
      ],
      learnerAdaptationNote: `Adapted for ${learnerMasteryLevel} mastery.`,
    });
  } catch (err: any) {
    console.error('Chat API Error:', err);
    res.status(500).json({ error: err.message || 'Error processing chat request' });
  }
});

// Adaptive Quiz Generation Endpoint
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const { topicIds, count, difficulty, pastQuestionIds } = req.body;

    if (!ai) {
      return res.status(503).json({ error: 'GEMINI_API_KEY not configured on server' });
    }

    const systemInstruction = `You are an expert exam author. Generate ${count || 3} challenging, strictly source-grounded academic exam questions for difficulty "${difficulty || 'medium'}".
Return a JSON array of question objects adhering to this schema:
[
  {
    "id": "q-gen-unique-id",
    "type": "mcq",
    "question": "Clear problem statement",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "0", // 0-indexed string
    "worked_solution": "Step-by-step rigorous derivation",
    "topic_id": "${topicIds?.[0] || 'topic-1'}",
    "topic_name": "Course Topic",
    "concept_tags": ["Concept1", "Concept2"],
    "difficulty": "${difficulty || 'medium'}",
    "source_location": "Slide 14",
    "source_file": "Lecture14.pdf",
    "source_type": "slide",
    "is_verified": true,
    "misconceptions": [
      {
        "option_index": 1,
        "misconception_label": "Common error description",
        "explanation": "Why this option is mathematically flawed",
        "cited_source_location": "Slide 14"
      }
    ]
  }
]`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Generate ${count || 3} high quality questions for topics: ${JSON.stringify(topicIds)}. Do NOT repeat any question IDs: ${JSON.stringify(pastQuestionIds || [])}. Output pure JSON only.`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const parsed = JSON.parse(response.text || '[]');
    res.json({ questions: parsed });
  } catch (err: any) {
    console.error('Quiz Generation Error:', err);
    res.status(500).json({ error: err.message || 'Error generating quiz' });
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
    for (const file of files) {
      if (!file?.name || !file?.mimeType || !file?.data) return res.status(400).json({ error: 'A file is missing its name, MIME type, or content.' });
      const name = String(file.name).slice(0, 200);
      const mimeType = String(file.mimeType);
      const bytes = Buffer.from(String(file.data).replace(/^data:[^;]+;base64,/, ''), 'base64');
      if (!bytes.length) return res.status(400).json({ error: 'Could not read ' + name + '.' });
      if (bytes.length > 18 * 1024 * 1024) return res.status(413).json({ error: name + ' exceeds the 18 MB per-file inline ingestion limit. Compress or split it.' });

      if (mimeType.includes('presentation') || name.toLowerCase().endsWith('.pptx')) {
        const zip = await JSZip.loadAsync(bytes);
        const slidePaths = Object.keys(zip.files).filter(p => /^ppt\/slides\/slide\d+\.xml$/.test(p))
          .sort((a, b) => Number(a.match(/slide(\d+)/)?.[1]) - Number(b.match(/slide(\d+)/)?.[1]));
        const slideTexts: string[] = [];
        for (const p of slidePaths) {
          const xml = await zip.files[p].async('text');
          const text = [...xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map(m => m[1]
            .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")).join(' ');
          if (text.trim()) slideTexts.push('Slide ' + p.match(/slide(\d+)/)?.[1] + ': ' + text);
        }
        parts.push({ text: 'PowerPoint source "' + name + '". Extracted slide text:\n' + slideTexts.join('\n') });
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
    }

    for (const urlValue of youtubeUrls) {
      const url = String(urlValue).trim();
      if (!/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(url)) return res.status(400).json({ error: 'Not a valid YouTube URL: ' + url });
      parts.push({ text: 'YouTube lecture source URL: ' + url + '. If the video or transcript is not available to you, do not invent its content or timestamps; report it as inaccessible in warnings.' });
      sourceNames.push(url);
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
    const warnings = Array.isArray(parsed.warnings) ? parsed.warnings : [];
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
    const safeUnits = units.map((u: any, i: number) => {
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
        source_type: ['pdf', 'slide', 'video', 'youtube'].includes(u.source_type) ? u.source_type : 'pdf',
        source_file: String(u.source_file || sourceNames[0] || 'Uploaded material'),
        source_location: String(u.source_location || 'Location not identified'),
      };
      if (Number.isFinite(Number(u.video_timestamp_seconds))) unit.video_timestamp_seconds = Number(u.video_timestamp_seconds);
      if (u.youtube_video_id) unit.youtube_video_id = String(u.youtube_video_id);
      if (u.is_figure) { unit.is_figure = true; unit.figure_caption = String(u.figure_caption || ''); }
      return unit;
    });
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
