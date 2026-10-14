import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { retrieveContextUnits } from '../src/services/retrieval';
import { benchmarkUnits, retrievalBenchmarkCases } from './benchmarkFixtures';

const baseUrl = (process.env.STUDYPILOT_API_URL || 'http://localhost:3000').replace(/\/$/, '');
const rows: Array<{ question: string; answer: string; contexts: string[]; ground_truth: string; retrieved_unit_ids: string[] }> = [];

for (const testCase of retrievalBenchmarkCases.filter(testCase => !testCase.shouldRefuse)) {
  const retrieval = retrieveContextUnits(testCase.question, benchmarkUnits, 4);
  if (!retrieval.relevantUnits.length) {
    throw new Error('No context retrieved for in-scope RAGAS case: ' + testCase.id);
  }
  const response = await fetch(baseUrl + '/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: testCase.question,
      citations: retrieval.citations,
      mode: 'explain',
      language: 'en',
      learnerMasteryLevel: 'Intermediate',
    }),
  });
  if (!response.ok) throw new Error('Tutor API returned HTTP ' + response.status + '. Start StudyPilot with GEMINI_API_KEY before collecting RAGAS inputs.');
  const data = await response.json() as { answer?: string };
  if (!data.answer) throw new Error('Tutor API returned no answer for ' + testCase.id);
  rows.push({
    question: testCase.question,
    answer: data.answer,
    contexts: retrieval.relevantUnits.map(unit => unit.full_text_excerpt),
    ground_truth: testCase.groundTruth,
    retrieved_unit_ids: retrieval.relevantUnits.map(unit => unit.id),
  });
}

const outputPath = resolve('evaluation/ragas-input.json');
await writeFile(outputPath, JSON.stringify(rows, null, 2) + '\n', 'utf8');
console.log('Collected ' + rows.length + ' grounded tutor answers at ' + outputPath);
console.log('Next run: python -m pip install -r evaluation/requirements.txt && python evaluation/run_ragas.py');
