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
import { INITIAL_COURSE, INITIAL_TOPIC_MASTERY_STATES, INITIAL_LEARNER_PROFILE } from '../data/initialState';
import { updateBKT, applyConversationalNudge, getMasteryStatus } from '../learner/bkt';
import { updateStabilityAfterReview, calculateRetrievability, calculateReviewDueTimestamp } from '../learner/spacedRepetition';

const STORAGE_KEYS = {
  ACTIVE_COURSE: 'studypilot_active_course_v2',
  TOPIC_MASTERY: 'studypilot_topic_mastery_v2',
  LEARNER_PROFILE: 'studypilot_learner_profile_v2',
  QUIZ_HISTORY: 'studypilot_quiz_history_v2',
  CHAT_HISTORY: 'studypilot_chat_history_v2',
  THEME: 'studypilot_theme_v1',
  LANGUAGE: 'studypilot_language_v1',
};

export function useAppStore() {
  // Course State
  const [course, setCourse] = useState<Course>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_COURSE);
      return stored ? JSON.parse(stored) : INITIAL_COURSE;
    } catch {
      return INITIAL_COURSE;
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
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
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
        content: 'Welcome to **StudyPilot**! Upload a textbook PDF, slide deck, lecture video, or a YouTube lecture with captions to build your own source-cited knowledge base. I will answer from your uploaded material and flag questions the sources do not cover.',
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
      diagnostic_completed: true,
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
      const existingTopicIds = new Set(prev.topics.map(topic => topic.id));
      const mergedTopics = [...prev.topics];
      for (const topic of newTopics) {
        if (!existingTopicIds.has(topic.id)) mergedTopics.push(topic);
      }
      const mergedPrerequisites = [...prev.prerequisites];
      const edgeKey = (from: string, to: string) => from + '->' + to;
      const existingEdges = new Set(mergedPrerequisites.map(edge => edgeKey(edge.fromTopicId, edge.toTopicId)));
      const hasPath = (start: string, target: string): boolean => {
        const visited = new Set<string>();
        const stack = [start];
        while (stack.length) {
          const current = stack.pop()!;
          if (current === target) return true;
          if (visited.has(current)) continue;
          visited.add(current);
          for (const edge of mergedPrerequisites) if (edge.fromTopicId === current) stack.push(edge.toTopicId);
        }
        return false;
      };
      for (const topic of newTopics) {
        for (const prerequisiteId of topic.prerequisite_ids || []) {
          const key = edgeKey(prerequisiteId, topic.id);
          if (prerequisiteId === topic.id || !mergedTopics.some(item => item.id === prerequisiteId) || existingEdges.has(key)) continue;
          // Preserve a DAG even if the model proposes cyclic prerequisite links.
          if (hasPath(topic.id, prerequisiteId)) continue;
          mergedPrerequisites.push({ fromTopicId: prerequisiteId, toTopicId: topic.id, relationship: 'builds_upon', concept: topic.title });
          existingEdges.add(key);
        }
      }
      const existingUnitIds = new Set(prev.content_units.map(unit => unit.id));
      const mergedUnits = [...prev.content_units];
      for (const unit of newUnits) {
        if (!existingUnitIds.has(unit.id)) mergedUnits.unshift(unit);
      }
      const isFirstIngestion = prev.content_units.length === 0;
      return {
        ...prev,
        title: isFirstIngestion ? 'Uploaded Course Material' : prev.title,
        institution: isFirstIngestion ? 'Your uploaded sources' : prev.institution,
        description: isFirstIngestion ? 'Knowledge base built from your uploaded course sources.' : prev.description,
        topics: mergedTopics,
        prerequisites: mergedPrerequisites,
        content_units: mergedUnits,
      };
    });

    setTopicMastery(prev => {
      const existingTopicIds = new Set(prev.map(state => state.topic_id));
      const now = Date.now();
      const newStates: TopicMasteryState[] = newTopics
        .filter(topic => !existingTopicIds.has(topic.id))
        .map(topic => ({
          topic_id: topic.id,
          mastery: 0.25,
          confidence_interval: 0.25,
          attempts_count: 0,
          correct_count: 0,
          last_practiced_timestamp: 0,
          stability_days: 1,
          retrievability: 1,
          review_due_timestamp: now,
          status: 'needs_review',
        }));
      return [...prev, ...newStates];
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
    applyQuizResultsToMastery,
    applyChatNudge,
    addIngestedContent,
  };
}
