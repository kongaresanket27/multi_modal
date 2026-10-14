/**
 * StudyPilot - Main Application Shell
 * @license Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAppStore } from './store/useStore';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { SourceViewerDrawer } from './components/modals/SourceViewerDrawer';
import { ArchitectureModal } from './components/modals/ArchitectureModal';
import { GlobalSearchModal } from './components/modals/GlobalSearchModal';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { TutorChatPage } from './pages/TutorChatPage';
import { QuizBuilderPage } from './pages/QuizBuilderPage';
import { QuizPlayerPage } from './pages/QuizPlayerPage';
import { QuizResultsPage } from './pages/QuizResultsPage';
import { CourseFlowMapPage } from './pages/CourseFlowMapPage';
import { StudyPlanPage } from './pages/StudyPlanPage';
import { RevisionHubPage } from './pages/RevisionHubPage';
import { IngestionPage } from './pages/IngestionPage';
import { EvaluationBenchPage } from './pages/EvaluationBenchPage';
import { Question, QuizSubmission } from './types';

export default function App() {
  const store = useAppStore();
  const {
    course,
    activeCitation,
    isDrawerOpen,
    closeDrawer,
    isArchModalOpen,
    setIsArchModalOpen,
    isSearchModalOpen,
    setIsSearchModalOpen,
    openCitation,
    applyQuizResultsToMastery,
  } = store;

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Active quiz state
  const [activeQuizQuestions, setActiveQuizQuestions] = useState<Question[] | null>(null);
  const [activeQuizTitle, setActiveQuizTitle] = useState<string>('');
  const [activeQuizIsTimed, setActiveQuizIsTimed] = useState<boolean>(false);
  const [lastSubmission, setLastSubmission] = useState<QuizSubmission | null>(null);
  const [preselectedQuizTopicId, setPreselectedQuizTopicId] = useState<string | undefined>(undefined);

  // Global Keyboard Shortcuts (Cmd+K for search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsSearchModalOpen]);

  // Quiz Navigation Handlers
  const handleStartQuiz = (questions: Question[], quizTitle: string, isTimed: boolean) => {
    setActiveQuizQuestions(questions);
    setActiveQuizTitle(quizTitle);
    setActiveQuizIsTimed(isTimed);
    setLastSubmission(null);
  };

  const handleFinishQuiz = (submission: QuizSubmission) => {
    applyQuizResultsToMastery(submission);
    setLastSubmission(submission);
    setActiveQuizQuestions(null);
  };

  const handleExitQuiz = () => {
    setActiveQuizQuestions(null);
    setLastSubmission(null);
  };

  const handleLaunchQuizForTopic = (topicId?: string) => {
    setPreselectedQuizTopicId(topicId);
    setActiveQuizQuestions(null);
    setLastSubmission(null);
    setActiveTab('quizzes');
  };

  const handleAskTutorWithQuery = (initialQuery?: string) => {
    if (initialQuery) {
      // Add user query to chat and trigger
      store.setChatMessages(prev => [
        ...prev,
        {
          id: `usr-direct-${Date.now()}`,
          role: 'user',
          content: initialQuery,
          timestamp: Date.now(),
        },
      ]);
    }
    setActiveTab('tutor_chat');
  };

  return (
    <div className="h-screen flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200 overflow-hidden">
      {/* Top Navbar */}
      <Navbar
        store={store}
        onOpenSearch={() => setIsSearchModalOpen(true)}
        onOpenArch={() => setIsArchModalOpen(true)}
      />

      {/* Main Workspace: Left Sidebar + Center View */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setActiveQuizQuestions(null);
            setLastSubmission(null);
          }}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          courseTitle={course.title}
        />

        {/* Dynamic Center Page View (Independently Scrollable) */}
        <main className="flex-1 min-w-0 overflow-y-auto h-full">
          {activeTab === 'dashboard' && (
            <DashboardPage
              store={store}
              onNavigateToQuiz={handleLaunchQuizForTopic}
              onNavigateToTutor={handleAskTutorWithQuery}
              onNavigateToCourseMap={() => setActiveTab('course_map')}
              onNavigateToIngestion={() => setActiveTab('ingestion')}
            />
          )}

          {activeTab === 'knowledge_base' && (
            <KnowledgeBasePage
              store={store}
              onNavigateToIngestion={() => setActiveTab('ingestion')}
            />
          )}

          {activeTab === 'tutor_chat' && (
            <TutorChatPage store={store} />
          )}

          {activeTab === 'quizzes' && (
            <>
              {activeQuizQuestions ? (
                <QuizPlayerPage
                  questions={activeQuizQuestions}
                  quizTitle={activeQuizTitle}
                  isTimed={activeQuizIsTimed}
                  store={store}
                  onFinishQuiz={handleFinishQuiz}
                  onExit={handleExitQuiz}
                />
              ) : lastSubmission ? (
                <QuizResultsPage
                  submission={lastSubmission}
                  course={course}
                  onPracticeWeakTopics={(tId) => handleLaunchQuizForTopic(tId)}
                  onRetake={() => handleLaunchQuizForTopic()}
                  onNavigateToRevision={() => setActiveTab('revision')}
                  onNavigateToDashboard={() => setActiveTab('dashboard')}
                />
              ) : (
                <QuizBuilderPage
                  store={store}
                  onStartQuiz={handleStartQuiz}
                  initialTopicId={preselectedQuizTopicId}
                />
              )}
            </>
          )}

          {activeTab === 'course_map' && (
            <CourseFlowMapPage
              store={store}
              onStudyTopic={handleAskTutorWithQuery}
              onQuizTopic={handleLaunchQuizForTopic}
            />
          )}

          {activeTab === 'study_plan' && (
            <StudyPlanPage
              store={store}
              onStartStudySession={handleAskTutorWithQuery}
            />
          )}

          {activeTab === 'revision' && (
            <RevisionHubPage store={store} />
          )}

          {activeTab === 'ingestion' && (
            <IngestionPage
              store={store}
              onExploreKnowledgeBase={() => setActiveTab('knowledge_base')}
            />
          )}

          {activeTab === 'evaluation' && (
            <EvaluationBenchPage />
          )}
        </main>
      </div>

      {/* Reusable Source Viewer Slide-over Drawer */}
      <SourceViewerDrawer
        citation={activeCitation}
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
      />

      {/* Architecture & Methodology Modal for Judges */}
      <ArchitectureModal
        isOpen={isArchModalOpen}
        onClose={() => setIsArchModalOpen(false)}
      />

      {/* Global Cmd+K Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        course={course}
        onSelectUnit={(citation) => openCitation(citation)}
        onSelectTopic={(topicId) => {
          setActiveTab('knowledge_base');
        }}
      />
    </div>
  );
}
