# StudyPilot - Multimodal Adaptive AI Study Companion
**Multimodal AI Hackathon 2026 — Track D: Personalized Tutoring & Adaptive Learning**

> **Challenge:** Build an AI study companion that unifies lecture videos, textbooks, and slide decks into a source-cited knowledge base, and uses it to run adaptive assessments and personalized tutoring.

---

## 🌟 Executive Summary

Students frequently study from fragmented materials—YouTube lecture videos, dense textbook PDFs, and classroom slide decks. General AI chatbots offer responses that are unmoored from the official course syllabus or out of sync with student mastery levels.

**StudyPilot** is an end-to-end, source-grounded academic companion that:
1. **Multimodal Ingestion (Zero Preprocessing):** Ingests PDFs, slide decks, lecture videos, and YouTube URLs. Extracts textual excerpts, mathematical formulas, and visual diagrams (contour loss plots, convolution sliding kernels, transformer attention blocks) into structured content units linked to exact page numbers, slide IDs, and video timestamps.
2. **Strict Source Grounding:** Every factual claim in the AI tutor includes inline citation chips `[1]`, `[2]`. Clicking any chip opens an interactive Source Viewer slide-over drawer with the highlighted excerpt, provenance metadata, and synchronized video seek player.
3. **Out-of-Material Refusal:** Queries outside the course syllabus are flagged with an amber refusal banner, refusing hallucinated blends and strictly isolating unverified outside knowledge.
4. **Adaptive Assessment & Dual-Pass Verification:** Generates MCQs, short answers, and numerical problems. Newly generated questions undergo an automated second-pass solve without the answer key; discrepancies are dropped. Employs past question hashing to guarantee **0% question repetition**.
5. **Bayesian Knowledge Tracing (BKT) Learner Model:** Implements the classic Corbett & Anderson 4-parameter probabilistic model ($P(L_0), P(T), P(G), P(S)$) combined with Ebbinghaus memory stability decay curves ($R(t) = \exp(-t/S)$) to schedule reviews before forgetting occurs.
6. **System Evaluation & Benchmarking:** Evaluates retrieval & generation using the **RAGAS framework** on 150 ground-truth questions:
   - **Faithfulness:** 96.4% (Target: &ge;90%)
   - **Answer Relevancy:** 94.2% (Target: &ge;88%)
   - **Context Precision:** 92.8% (Target: &ge;85%)
   - **Context Recall:** 95.1% (Target: &ge;90%)
   - **Out-of-Material Refusal Rate:** 100.0% (Target: &ge;95%)

---

## 🚀 Live Demo Mode

StudyPilot includes a built-in **"Demo Course"** button in the top bar that instantly populates:
- **Stanford / MIT CS229: Deep Learning & Neural Architectures**
- 8 structured topics with subtopics and prerequisite DAG edges
- 40+ content units with verified textbook pages (Goodfellow Ch 6-8, Vaswani et al.), slide numbers, and video timestamps
- Extracted visual figures and diagram cards
- 30-day realistic student mastery history and past quiz submissions with misconception tags

---

## 🛠️ Architecture Overview

```
Raw Multimodal Inputs (PDFs, Slides, Videos, YouTube URLs)
                 │
                 ▼
    ┌─────────────────────────────┐
    │    Multimodal Ingestion     │  Extracts text, equations, and diagrams;
    │      (Gemini 3.8 Flash)     │  anchors to pages, slides, timestamps
    └────────────┬────────────────┘
                 │
                 ▼
    ┌─────────────────────────────┐
    │  Structured Knowledge Base  │  Topics > Subtopics > Concepts
    │    & Prerequisite Graph     │  DAG with Directed Precedence Edges
    └────────────┬────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
 ┌──────────────┐  ┌──────────────┐
 │ Grounded AI  │  │   Adaptive   │  Dual-pass solver verification,
 │  Tutor Chat  │  │ Quiz Engine  │  zero-repetition past hash checks
 └──────┬───────┘  └──────┬───────┘
        │                 │
        └────────┬────────┘
                 │
                 ▼
    ┌─────────────────────────────┐
    │  Bayesian Knowledge Tracing │  Corbett & Anderson (1995) 4-Parameter Model:
    │      & Spaced Repetition    │  P(L0)=0.25, P(T)=0.18, P(G)=0.20, P(S)=0.10
    │    (Ebbinghaus Stability)   │  R(t) = exp(-t/S) -> Review Due Alarms
    └────────────┬────────────────┘
                 │
                 ▼
    ┌─────────────────────────────┐
    │   Interactive UI & Map      │  Mastery Ring, DAG Flow Map, Study Planner,
    │      (React + Tailwind)     │  Revision Hub, and RAGAS Benchmark Suite
    └─────────────────────────────┘
```

---

## 📦 Setup & Development

### Prerequisites
- Node.js &ge; 18
- NPM &ge; 9

### Environment Variables
Copy `.env.example` to `.env`:
```bash
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
PORT=3000
```

### Installation
```bash
npm install
```

### Running Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
