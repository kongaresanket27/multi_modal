/**
 * StudyPilot - Gemini API Client Service
 * 
 * Provides client-side interface to server-side Gemini endpoints
 * with robust error-handling, fallback reasoning, and schema parsing.
 */

import { Citation, Question, QuizSubmission, EvaluationMetric, SimulatedStudentProfile, ContentUnit } from '../types';

export interface ChatResponsePayload {
  answer: string;
  citations: Citation[];
  isOutsideMaterial: boolean;
  outsideKnowledgeContent?: string;
  suggestedFollowUps: string[];
  learnerAdaptationNote: string;
}

export async function askGroundedTutor(
  question: string,
  citations: Citation[],
  mode: string,
  language: string,
  learnerMasteryLevel: string,
  isOutsideCourseMaterial: boolean
): Promise<ChatResponsePayload> {
  // If definitely outside course material:
  if (isOutsideCourseMaterial) {
    return {
      answer: "I couldn't find coverage of this topic in your uploaded course materials (textbooks, slides, or lecture videos).",
      citations: [],
      isOutsideMaterial: true,
      outsideKnowledgeContent: `This query appears to fall outside your syllabus. To maintain academic rigor and exam fidelity, StudyPilot strictly separates outside concepts from your course sources.\n\nGeneral Knowledge Summary:\n"${question}" is an external concept. If you would like to include it in your course knowledge base, you can upload the relevant textbook chapter or lecture slides in the Knowledge Base tab.`,
      suggestedFollowUps: [
        'Ask about Computational Graphs & Backprop',
        'Ask about Loss Landscapes & Saddle Points',
        'Ask about Transformer Multi-Head Attention',
      ],
      learnerAdaptationNote: 'Query outside course scope - grounded refusal active.',
    };
  }

  // Attempt server-side API call first
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: question,
        citations,
        mode,
        language,
        learnerMasteryLevel,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('Backend /api/chat unavailable, using high-fidelity local grounded engine:', err);
  }

  // Safe offline fallback: quote only retrieved excerpts instead of generating unsupported claims.
  const availableCitations = citations.filter(citation => citation.excerpt && citation.excerpt.trim());
  if (!availableCitations.length) {
    return {
      answer: "I couldn't find a sufficiently relevant excerpt in the uploaded course materials to answer this reliably. Please upload the relevant page, slide, or lecture.",
      citations: [],
      isOutsideMaterial: true,
      outsideKnowledgeContent: '',
      suggestedFollowUps: ['Browse the knowledge base', 'Upload a relevant course source'],
      learnerAdaptationNote: 'Source-grounded refusal applied because no excerpt was available.',
    };
  }
  const quotedSources = availableCitations.slice(0, 3).map((citation, index) =>
    '[' + (index + 1) + '] ' + citation.source_title + ' (' + citation.source_file + ', ' + citation.source_location + ')\n> ' + citation.excerpt
  ).join('\n\n');
  return {
    answer: 'The AI explanation service is currently unavailable, so I will not add an unverified explanation. Here are the relevant excerpts retrieved from your course material:\n\n' + quotedSources,
    citations: availableCitations,
    isOutsideMaterial: false,
    outsideKnowledgeContent: '',
    suggestedFollowUps: ['Try the explanation again when the AI service is available', 'Ask a more specific question about this excerpt'],
    learnerAdaptationNote: 'Offline fallback displays retrieved source excerpts only; no generated claims were added.',
  };
}

export async function generateAdaptiveQuestions(
  topicIds: string[],
  count: number,
  difficulty: 'easy' | 'medium' | 'hard' | 'adaptive',
  pastQuestionIds: Set<string>,
  sourceUnits: ContentUnit[] = []
): Promise<Question[]> {
  const relevantUnits = sourceUnits.filter(unit => topicIds.includes(unit.topic_id));
  if (!relevantUnits.length) throw new Error('No course excerpts are available for the selected topics. Upload course material first.');
  const res = await fetch('/api/generate-quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topicIds,
      count,
      difficulty,
      pastQuestionIds: Array.from(pastQuestionIds),
      sourceUnits: relevantUnits.map(unit => ({
        id: unit.id, title: unit.title, summary: unit.summary,
        excerpt: unit.full_text_excerpt, topic_id: unit.topic_id,
        topic_name: unit.topic_name, source_file: unit.source_file,
        source_location: unit.source_location, source_type: unit.source_type,
        concept_tags: unit.concept_tags,
      })),
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Grounded quiz generation failed.');
  if (!Array.isArray(data.questions) || !data.questions.length) {
    throw new Error('No questions passed independent verification. Try another topic or difficulty.');
  }
  return data.questions as Question[];
}

export async function gradeOpenEndedAnswer(
  question: Question,
  userAnswer: string
): Promise<{ isCorrect: boolean; partialScore: number; feedback: string }> {
  try {
    const res = await fetch('/api/grade-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, userAnswer }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend grading fallback:', err);
  }

  // Standard numerical check
  const cleanUser = userAnswer.trim().toLowerCase();
  const cleanCorrect = question.correct_answer.trim().toLowerCase();
  const isMatch = cleanUser === cleanCorrect || cleanUser.includes(cleanCorrect);

  return {
    isCorrect: isMatch,
    partialScore: isMatch ? 1.0 : 0.0,
    feedback: isMatch
      ? `Correct! Your solution matches the derivation: ${question.worked_solution}`
      : `Incorrect. Expected ${question.correct_answer}. Derivation: ${question.worked_solution}`,
  };
}

// Benchmark values intentionally remain unreported until a reproducible evaluation run is performed.
export const BENCHMARK_EVALUATION_METRICS: EvaluationMetric[] = [
  { metric_name: 'Faithfulness (RAGAS)', description: 'Measures whether generated claims are supported by retrieved excerpts.', score: 0, benchmark_target: 0.90, status: 'below', sample_size: 0, methodology: 'Not measured yet. Run a documented benchmark against a labeled source-grounded test set before reporting a score.' },
  { metric_name: 'Answer Relevancy', description: 'Measures whether answers address the learner question.', score: 0, benchmark_target: 0.88, status: 'below', sample_size: 0, methodology: 'Not measured yet. No reproducible evaluation run is recorded in this repository.' },
  { metric_name: 'Context Precision', description: 'Measures whether retrieved excerpts are relevant to the question.', score: 0, benchmark_target: 0.85, status: 'below', sample_size: 0, methodology: 'Not measured yet. Create a labeled query-to-source benchmark and evaluate retrieval rankings.' },
  { metric_name: 'Context Recall', description: 'Measures whether the retrieved context contains the evidence needed to answer.', score: 0, benchmark_target: 0.90, status: 'below', sample_size: 0, methodology: 'Not measured yet. Requires gold-standard evidence annotations for benchmark questions.' },
  { metric_name: 'Out-of-Material Refusal Rate', description: 'Measures correct refusal on questions not covered by the active course sources.', score: 0, benchmark_target: 0.95, status: 'below', sample_size: 0, methodology: 'Not measured yet. Evaluate with a labeled set of in-scope and out-of-scope queries.' },
];

// Simulated Multi-Session Student Cohorts
export const SIMULATED_STUDENT_PROFILES: SimulatedStudentProfile[] = [
  { id: 'sim-1', name: 'Synthetic Beginner', archetype: 'Struggling Beginner', initial_mastery: 0.22, final_mastery: 0.22, gain_percentage: 0, sessions_simulated: 0, questions_attempted: 0, repetition_rate: 0 },
  { id: 'sim-2', name: 'Synthetic Visual Learner', archetype: 'Visual Thinker', initial_mastery: 0.41, final_mastery: 0.41, gain_percentage: 0, sessions_simulated: 0, questions_attempted: 0, repetition_rate: 0 },
  { id: 'sim-3', name: 'Synthetic Advanced Learner', archetype: 'Advanced Fast-Pacer', initial_mastery: 0.62, final_mastery: 0.62, gain_percentage: 0, sessions_simulated: 0, questions_attempted: 0, repetition_rate: 0 },
];
