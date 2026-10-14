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
