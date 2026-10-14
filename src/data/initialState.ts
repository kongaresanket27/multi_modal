import { Course, LearnerProfile, TopicMasteryState } from '../types';

/**
 * Empty first-run state. The app must not present synthetic citations, quiz history,
 * or mastery progress as if they came from a learner's real course.
 */
export const INITIAL_COURSE: Course = {
  id: 'personal-study-space',
  title: 'My Study Space',
  code: '',
  institution: 'Personal knowledge base',
  description: 'Upload course material to create a source-cited knowledge base.',
  topics: [],
  content_units: [],
  prerequisites: [],
  exam_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  target_weekly_hours: 5,
};

export const INITIAL_TOPIC_MASTERY_STATES: TopicMasteryState[] = [];

export const INITIAL_LEARNER_PROFILE: LearnerProfile = {
  student_name: 'Learner',
  avatar_url: '',
  current_streak_days: 0,
  last_active_date: new Date().toISOString().slice(0, 10),
  weekly_goal_hours: 5,
  completed_hours_this_week: 0,
  total_quizzes_taken: 0,
  total_questions_answered: 0,
  diagnostic_completed: false,
};
