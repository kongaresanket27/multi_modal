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
6. **System Evaluation & Benchmarking:** The evaluation dashboard lists RAGAS-style metrics and target thresholds, but **no benchmark results are currently claimed**. Scores remain “Not measured” until a labeled test set is run and reproducible results are recorded. The dashboard can run a deterministic synthetic BKT learner simulation; those outcomes are illustrative simulations, not evidence from real students.

---

## 🚀 Live Demo Mode

StudyPilot includes a built-in **"Demo Course"** button in the top bar that instantly populates:
- **Stanford / MIT CS229: Deep Learning & Neural Architectures**
- A preloaded illustrative sample course for exploring the UI (not a verified external-source corpus)
- Example topics, content units, and prerequisite edges for demonstration
- Example learner progress and quiz history to preview dashboard behavior

**Important:** demo citations and learner histories are illustrative. Upload real course sources before relying on citations or reporting academic evaluation results.

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
- Node.js &ge; 20.19 (or 22.12+)
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


## Implemented ingestion and grounding behavior

- The ingestion screen now sends selected files to `POST /api/ingest`; it no longer invents progress logs or fixed extraction counts.
- PDF and image content is sent to the server-side Gemini model. PPTX slide text is extracted from the presentation XML, and embedded slide images are also passed for visual interpretation. MP4/MOV files are passed to Gemini when under the inline upload limit.
- Each file is limited to 18 MB and batches support up to 8 files. The Express JSON body limit is 50 MB, so keep combined uploads comfortably below that limit.
- YouTube ingestion attempts to retrieve an English caption track. If no captions are available, the system warns and does not fabricate transcript-based units; upload a transcript or video file instead.
- Ingestion output is accepted only when its source filename/URL matches a readable source supplied in that request. Page/slide/timestamp values are still model-extracted metadata and should be checked against the original material before high-stakes use.
- Quiz generation uses selected course excerpts and independently re-solves generated questions in a second model pass without providing the proposed answer key. Questions that fail source or answer checks are dropped. Stable question IDs help prevent repeats across subsequent generated assessments.
- Tutor responses refuse when retrieval finds no sufficiently relevant excerpt. If the AI service is unavailable, the fallback displays retrieved excerpts instead of inventing an explanation.

## Architecture and learner model

- **Frontend:** React + TypeScript + Vite.
- **API:** Express + TypeScript server in `server.ts`; Gemini calls remain server-side and use `GEMINI_API_KEY`.
- **Knowledge base:** structured `Topic` and `ContentUnit` objects persisted in browser local storage for the active course.
- **Retrieval and grounding:** BM25-style lexical/concept-tag scoring selects excerpts; the tutor cites retrieved excerpts and declines when retrieval confidence is too low.
- **Assessment:** topic-scoped question generation, source metadata, independent second-pass answer verification, and stable question IDs for novelty checks.
- **Learner model:** the BKT update function uses initial mastery, learn, guess, and slip parameters; spaced-repetition helpers track stability and review timing.

## Evaluation status

The current repository does **not** contain a completed, labeled RAGAS/DeepEval/TruLens evaluation run. The dashboard intentionally displays “Not measured” for faithfulness, answer relevancy, context precision, context recall, and refusal rate instead of presenting unverified percentages. Before submission, create a labeled test set with source locations and off-material questions, run the evaluation, and record the method, sample size, and actual results here.

## Hackathon submission checklist

- [ ] Devpost project description explains the problem, implementation, and grounding approach.
- [ ] Public GitHub repository includes setup instructions and architecture documentation.
- [ ] A 3–10 minute YouTube demo (unlisted is acceptable, private is not) shows the running app, ingestion, cited tutoring, assessments, and architecture; English audio or subtitles are required.
- [ ] All team members are added to the Devpost submission with their real full names.
