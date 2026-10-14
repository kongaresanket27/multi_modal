/**
 * StudyPilot - Central Application State Management
 * 
 * Manages courses, active knowledge base, BKT learner model,
 * quiz submissions, chat history, and UI drawer states with localStorage persistence.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Course,
  TopicMasteryState,
  LearnerProfile,
  QuizSubmission,
  ChatMessage,
  Citation,
  LanguageMode,
} from '../types';
import {
  SAMPLE_COURSE,
  INITIAL_TOPIC_MASTERY_STATES,
  INITIAL_LEARNER_PROFILE,
  SAMPLE_PAST_QUIZZES,
} from '../demo-data/sampleCourse';
import { updateBKT, applyConversationalNudge, getMasteryStatus } from '../learner/bkt';
import { updateStabilityAfterReview, calculateRetrievability, calculateReviewDueTimestamp } from '../learner/spacedRepetition';

const STORAGE_KEYS = {
  ACTIVE_COURSE: 'studypilot_active_course_v1',
  TOPIC_MASTERY: 'studypilot_topic_mastery_v1',
  LEARNER_PROFILE: 'studypilot_learner_profile_v1',
  QUIZ_HISTORY: 'studypilot_quiz_history_v1',
  CHAT_HISTORY: 'studypilot_chat_history_v1',
  THEME: 'studypilot_theme_v1',
  LANGUAGE: 'studypilot_language_v1',
};

export function useAppStore() {
  // Course State
  const [course, setCourse] = useState<Course>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_COURSE);
      return stored ? JSON.parse(stored) : SAMPLE_COURSE;
    } catch {
      return SAMPLE_COURSE;
    }
  });

  // Learner BKT Mastery States
  const [topicMastery, setTopicMastery] = useState<TopicMasteryState[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TOPIC_MASTERY);
      return stored ? JSON.parse(stored) : INITIAL_TOPIC_MASTERY_STATES;
    } catch {
      return INITIAL_TOPIC_MASTERY_STATES;
    }
  });

  // Learner Profile
  const [learnerProfile, setLearnerProfile] = useState<LearnerProfile>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LEARNER_PROFILE);
      return stored ? JSON.parse(stored) : INITIAL_LEARNER_PROFILE;
    } catch {
      return INITIAL_LEARNER_PROFILE;
    }
  });

  // Past Quiz Submissions
  const [quizHistory, setQuizHistory] = useState<QuizSubmission[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.QUIZ_HISTORY);
      return stored ? JSON.parse(stored) : SAMPLE_PAST_QUIZZES;
    } catch {
      return SAMPLE_PAST_QUIZZES;
    }
  });

  // Chat History
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return [
      {
        id: 'msg-welcome',
        role: 'assistant',
        content: `Welcome to **StudyPilot**! I am your source-grounded academic study companion for **${SAMPLE_COURSE.title}**.\n\nEvery explanation I provide cites exact lecture video timestamps, slide slides, or textbook pages from your course materials. Ask me anything, or pick one of the suggested topics below!`,
        timestamp: Date.now() - 3600000,
        suggested_follow_ups: [
          'Why does attention divide by sqrt(d_k)?',
          'How does Momentum prevent oscillations in ravines?',
          'Explain the double descent phenomenon in deep networks',
          'What is the receptive field formula for 2D convolutions?',
        ],
      },
    ];
  });

  // Theme: default dark
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.THEME);
      return stored ? stored === 'dark' : true;
    } catch {
      return true;
    }
  });

  // Language: English, Hindi, Hinglish
  const [language, setLanguage] = useState<LanguageMode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LANGUAGE) as LanguageMode;
      return stored || 'en';
    } catch {
      return 'en';
    }
  });

  // Active Source Viewer Drawer State
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Architecture Modal
  const [isArchModalOpen, setIsArchModalOpen] = useState<boolean>(false);

  // Global Search Modal
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_COURSE, JSON.stringify(course));
    } catch {}
  }, [course]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TOPIC_MASTERY, JSON.stringify(topicMastery));
    } catch {}
  }, [topicMastery]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LEARNER_PROFILE, JSON.stringify(learnerProfile));
    } catch {}
  }, [learnerProfile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.QUIZ_HISTORY, JSON.stringify(quizHistory));
    } catch {}
  }, [quizHistory]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(chatMessages));
    } catch {}
  }, [chatMessages]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, isDarkMode ? 'dark' : 'light');
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch {}
  }, [isDarkMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
    } catch {}
  }, [language]);

  // Open Citation Viewer
  const openCitation = useCallback((citation: Citation) => {
    setActiveCitation(citation);
    setIsDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  // Reset to Demo Mode
  const resetToDemoMode = useCallback(() => {
    setCourse(SAMPLE_COURSE);
    setTopicMastery(INITIAL_TOPIC_MASTERY_STATES);
    setLearnerProfile(INITIAL_LEARNER_PROFILE);
    setQuizHistory(SAMPLE_PAST_QUIZZES);
    setChatMessages([
      {
        id: 'msg-welcome-reset',
        role: 'assistant',
        content: `Demo Mode activated! Loaded **${SAMPLE_COURSE.title}** with 8 topics, 40+ content units with real textbook pages, slides, and video timestamps, plus realistic 30-day student progress.`,
        timestamp: Date.now(),
        suggested_follow_ups: [
          'Why does attention divide by sqrt(d_k)?',
          'How does Momentum prevent oscillations in ravines?',
          'Explain the double descent phenomenon in deep networks',
          'What is the receptive field formula for 2D convolutions?',
        ],
      },
    ]);
  }, []);

  // Update BKT Mastery after a quiz submission
  const applyQuizResultsToMastery = useCallback((submission: QuizSubmission) => {
    setTopicMastery(prevStates => {
      const updated = prevStates.map(state => {
        const accuracyInfo = submission.topic_accuracies[state.topic_id];
        if (!accuracyInfo || accuracyInfo.total === 0) return state;

        // Apply BKT updates for each question in this topic
        let currentM = state.mastery;
        let stability = state.stability_days;
        const now = Date.now();

        // Fraction of correct answers
        const isOverallTopicPassed = accuracyInfo.percentage >= 65;

        // Step through BKT for each question
        for (let i = 0; i < accuracyInfo.total; i++) {
          const isQCorrect = i < accuracyInfo.correct;
          const bktResult = updateBKT(currentM, isQCorrect);
          currentM = bktResult.newMastery;
        }

        // Update Ebbinghaus stability
        stability = updateStabilityAfterReview(stability, isOverallTopicPassed, currentM);
        const reviewDue = calculateReviewDueTimestamp(now, stability);

        return {
          ...state,
          mastery: currentM,
          attempts_count: state.attempts_count + accuracyInfo.total,
          correct_count: state.correct_count + accuracyInfo.correct,
          last_practiced_timestamp: now,
          stability_days: stability,
          retrievability: 1.0,
          review_due_timestamp: reviewDue,
          status: getMasteryStatus(currentM),
        };
      });
      return updated;
    });

    // Append to quiz history
    setQuizHistory(prev => [submission, ...prev]);

    // Update learner profile stats
    setLearnerProfile(prev => ({
      ...prev,
      total_quizzes_taken: prev.total_quizzes_taken + 1,
      total_questions_answered: prev.total_questions_answered + submission.total_questions,
      completed_hours_this_week: Number((prev.completed_hours_this_week + submission.time_spent_seconds / 3600).toFixed(1)),
    }));
  }, []);

  // Apply conversational nudge to topic mastery
  const applyChatNudge = useCallback((topicId: string, signal: 'asked_basic_help' | 'deep_understanding') => {
    setTopicMastery(prev => prev.map(t => {
      if (t.topic_id === topicId) {
        const newM = applyConversationalNudge(t.mastery, signal);
        return {
          ...t,
          mastery: newM,
          status: getMasteryStatus(newM),
        };
      }
      return t;
    }));
  }, []);

  // Add new content unit from ingestion
  const addIngestedContent = useCallback((newUnits: typeof course.content_units, newTopics: typeof course.topics) => {
    setCourse(prev => {
      // Merge unique topics
      const existingTopicIds = new Set(prev.topics.map(t => t.id));
      const mergedTopics = [...prev.topics];
      for (const t of newTopics) {
        if (!existingTopicIds.has(t.id)) {
          mergedTopics.push(t);
        }
      }
      return {
        ...prev,
        topics: mergedTopics,
        content_units: [...newUnits, ...prev.content_units],
      };
    });
  }, []);

  return {
    course,
    setCourse,
    topicMastery,
    setTopicMastery,
    learnerProfile,
    setLearnerProfile,
    quizHistory,
    chatMessages,
    setChatMessages,
    isDarkMode,
    setIsDarkMode,
    language,
    setLanguage,
    activeCitation,
    isDrawerOpen,
    openCitation,
    closeDrawer,
    isArchModalOpen,
    setIsArchModalOpen,
    isSearchModalOpen,
    setIsSearchModalOpen,
    resetToDemoMode,
    applyQuizResultsToMastery,
    applyChatNudge,
    addIngestedContent,
  };
}
