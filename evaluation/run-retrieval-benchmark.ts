import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { retrieveContextUnits } from '../src/services/retrieval';
import { benchmarkUnits, retrievalBenchmarkCases } from './benchmarkFixtures';

const cases = retrievalBenchmarkCases.map(testCase => {
  const result = retrieveContextUnits(testCase.question, benchmarkUnits, 4);
  const retrievedIds = result.relevantUnits.map(unit => unit.id);
  const relevantRetrieved = retrievedIds.filter(id => testCase.goldUnitIds.includes(id)).length;
  const precision = retrievedIds.length ? relevantRetrieved / retrievedIds.length : (testCase.goldUnitIds.length ? 0 : 1);
  const recall = testCase.goldUnitIds.length ? relevantRetrieved / testCase.goldUnitIds.length : 1;
  return {
    id: testCase.id,
    question: testCase.question,
    goldUnitIds: testCase.goldUnitIds,
    retrievedUnitIds: retrievedIds,
    precision,
    recall,
    reciprocalRank: testCase.goldUnitIds.length
      ? Math.max(0, ...retrievedIds.map((id, index) => testCase.goldUnitIds.includes(id) ? 1 / (index + 1) : 0))
      : 0,
    expectedRefusal: testCase.shouldRefuse,
    actualRefusal: result.isOutsideCourseMaterial,
    refusalCorrect: result.isOutsideCourseMaterial === testCase.shouldRefuse,
    topRelevanceScore: result.topRelevanceScore,
  };
});

const inScope = cases.filter(testCase => !testCase.expectedRefusal);
const outOfScope = cases.filter(testCase => testCase.expectedRefusal);
const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const metrics = {
  fixtureName: 'StudyPilot self-authored retrieval fixture v1',
  note: 'Deterministic retrieval-only test. These values are not RAGAS generation metrics and are not results from real learner data.',
  testCount: cases.length,
  inScopeCount: inScope.length,
  outOfScopeCount: outOfScope.length,
  hitRateAt4: mean(inScope.map(testCase => testCase.retrievedUnitIds.some(id => testCase.goldUnitIds.includes(id)) ? 1 : 0)),
  meanReciprocalRankAt4: mean(inScope.map(testCase => testCase.reciprocalRank)),
  meanContextPrecisionAt4: mean(inScope.map(testCase => testCase.precision)),
  meanContextRecallAt4: mean(inScope.map(testCase => testCase.recall)),
  refusalAccuracy: mean(cases.map(testCase => testCase.refusalCorrect ? 1 : 0)),
  outOfScopeRefusalRate: mean(outOfScope.map(testCase => testCase.actualRefusal ? 1 : 0)),
  cases,
  generatedAt: new Date().toISOString(),
};

const outputPath = resolve('evaluation/retrieval-benchmark-results.json');
await writeFile(outputPath, JSON.stringify(metrics, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(metrics, null, 2));

if (metrics.hitRateAt4 < 0.75 || metrics.refusalAccuracy < 1 || metrics.outOfScopeRefusalRate < 1) {
  process.exitCode = 1;
}
