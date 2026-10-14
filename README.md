# StudyPilot - Multimodal Adaptive AI Study Companion
**Multimodal AI Hackathon 2026 — Track D: Personalized Tutoring & Adaptive Learning**

> **Challenge:** Build an AI study companion that unifies lecture videos, textbooks, and slide decks into a source-cited knowledge base, and uses it to run adaptive assessments and personalized tutoring.

---

## 🌟 Executive Summary

Students frequently study from fragmented materials—YouTube lecture videos, dense textbook PDFs, and classroom slide decks. General AI chatbots offer responses that are unmoored from the official course syllabus or out of sync with student mastery levels.

**StudyPilot** is an end-to-end, source-grounded academic companion that:
1. **Multimodal Ingestion (Zero Preprocessing):** Ingests PDFs, slide decks, lecture videos, and YouTube URLs. Extracts textual excerpts, mathematical formulas, and visual diagrams (contour loss plots, convolution sliding kernels, transformer attention blocks) into structured content units linked to exact page numbers, slide IDs, and video timestamps.
2. **Strict Source Grounding:** The tutor is instructed to cite retrieved excerpts using `[1]`, `[2]` source markers. The Source Viewer displays the retrieved excerpt and opens session-local PDFs at cited pages, uploaded videos at cited timestamps, and YouTube videos at caption timestamps when available.
3. **Out-of-Material Refusal:** Queries outside the course syllabus are flagged with an amber refusal banner, refusing hallucinated blends and strictly isolating unverified outside knowledge.
4. **Adaptive Assessment & Dual-Pass Verification:** Generates MCQs, short answers, and numerical problems. Newly generated questions undergo an automated second-pass solve without the answer key; discrepancies are dropped. Hashes normalized question text and rejects exact normalized repeats from completed assessments; semantically similar rewordings may still require review.
5. **Bayesian Knowledge Tracing (BKT) Learner Model:** Implements the classic Corbett & Anderson 4-parameter probabilistic model ($P(L_0), P(T), P(G), P(S)$) combined with Ebbinghaus memory stability decay curves ($R(t) = \exp(-t/S)$) to schedule reviews before forgetting occurs.
6. **System Evaluation & Benchmarking:** The evaluation dashboard lists RAGAS-style metrics and target thresholds, but **no benchmark results are currently claimed**. Scores remain “Not measured” until a labeled test set is run and reproducible results are recorded. The dashboard can run a deterministic synthetic BKT learner simulation; those outcomes are illustrative simulations, not evidence from real students.

---

## First Run

StudyPilot starts with an empty course and no synthetic quiz history or mastery scores. Upload your own course sources first. This avoids displaying illustrative citations or invented learner progress as if they were real. The first assessment is labeled as a diagnostic baseline for the new learner.

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
- Each file is limited to 18 MB and each batch to 8 files / 32 MB combined raw file size. YouTube batches are limited to 5 URLs. The Express JSON body limit is 50 MB.
- YouTube ingestion attempts to retrieve an English caption track. If no captions are available, the system warns and does not fabricate transcript-based units; upload a transcript or video file instead.
- Ingestion output is accepted only when its source filename/URL matches a readable source supplied in that request. PDF page numbers are checked against a detected page count when available; PPTX slide numbers are checked against the slide archive; text citations are checked against line counts; YouTube timestamps are snapped to retrieved caption timestamps. Video timestamps are syntax-checked but not checked against the uploaded video's exact duration. Always review source excerpts before high-stakes use.
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

The repository includes a small **self-authored labeled fixture corpus** with four in-scope questions and two off-material questions. It is a reproducible smoke-test fixture, not a substitute for evaluation on your actual uploaded course corpus.

Run the deterministic retrieval/refusal benchmark:

```bash
npm run evaluate:retrieval
```

For RAGAS generation metrics, start the StudyPilot server with `GEMINI_API_KEY` configured, then run:

```bash
npm run evaluate:ragas:collect
python -m pip install -r evaluation/requirements.txt
python evaluation/run_ragas.py
```

The RAGAS runner records faithfulness, answer relevancy, context precision, and context recall for the included labeled fixture. Results are written to ignored local JSON files under `evaluation/`. The app dashboard deliberately continues to show “Not measured” until a benchmark result is explicitly imported/recorded; running a script does not automatically prove performance on a user's own course material. For submission, run the same evaluation with a larger labeled test set derived from the actual course sources and preserve the generated result files as evidence.

## Hackathon submission checklist

- [ ] Devpost project description explains the problem, implementation, and grounding approach.
- [ ] Public GitHub repository includes setup instructions and architecture documentation.
- [ ] A 3–10 minute YouTube demo (unlisted is acceptable, private is not) shows the running app, ingestion, cited tutoring, assessments, and architecture; English audio or subtitles are required.
- [ ] All team members are added to the Devpost submission with their real full names.
