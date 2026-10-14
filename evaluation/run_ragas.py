import json
import os
from pathlib import Path

from datasets import Dataset
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from ragas import evaluate
from ragas.metrics import answer_relevancy, context_precision, context_recall, faithfulness

ROOT = Path(__file__).resolve().parent
INPUT = ROOT / "ragas-input.json"
OUTPUT = ROOT / "ragas-results.json"
API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

if not API_KEY:
    raise SystemExit("Set GEMINI_API_KEY or GOOGLE_API_KEY before running RAGAS.")
if not INPUT.exists():
    raise SystemExit("Missing evaluation/ragas-input.json. Start StudyPilot and run npm run evaluate:ragas:collect first.")

rows = json.loads(INPUT.read_text(encoding="utf-8"))
if len(rows) < 4:
    raise SystemExit("Expected at least four labeled in-scope evaluation examples.")

dataset = Dataset.from_list([
    {
        "question": row["question"],
        "answer": row["answer"],
        "contexts": row["contexts"],
        "ground_truth": row["ground_truth"],
    }
    for row in rows
])

judge = ChatGoogleGenerativeAI(model="gemini-2.5-flash", google_api_key=API_KEY, temperature=0)
embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001", google_api_key=API_KEY)

result = evaluate(
    dataset=dataset,
    metrics=[faithfulness, answer_relevancy, context_precision, context_recall],
    llm=judge,
    embeddings=embeddings,
)
frame = result.to_pandas()
scores = {}
for metric in ["faithfulness", "answer_relevancy", "context_precision", "context_recall"]:
    if metric in frame.columns:
        values = [float(value) for value in frame[metric].dropna().tolist()]
        scores[metric] = {
            "mean": round(sum(values) / len(values), 4) if values else None,
            "sample_count": len(values),
        }

payload = {
    "framework": "RAGAS",
    "dataset": "StudyPilot self-authored labeled fixture corpus v1",
    "note": "These results measure the included self-authored fixture only; they are not evidence from real student data or an external textbook corpus.",
    "sample_count": len(rows),
    "metrics": scores,
    "per_example": frame.to_dict(orient="records"),
}
OUTPUT.write_text(json.dumps(payload, indent=2, default=str) + "\n", encoding="utf-8")
print(json.dumps(payload, indent=2, default=str))
print(f"Saved results to {OUTPUT}")
