import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { updateBKT } from '../src/learner/bkt';

type Profile = { id: string; initialMastery: number; ability: number };
const profiles: Profile[] = [
  { id: 'novice', initialMastery: 0.15, ability: 0.28 },
  { id: 'intermediate', initialMastery: 0.48, ability: 0.52 },
  { id: 'advanced', initialMastery: 0.78, ability: 0.76 },
];
const topics = ['attention', 'gradient-descent', 'bkt'];
const sessions = 4;
const questionsPerSession = 6;
const questionBank = topics.flatMap(topic =>
  (['easy', 'medium', 'hard'] as const).flatMap((difficulty, level) =>
    Array.from({ length: 8 }, (_, variant) => ({
      id: topic + '-' + difficulty + '-' + variant,
      topic,
      difficulty,
      level,
    }))
  )
);
function stableNoise(seed: number): number {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}
function difficultyFor(mastery: number): number {
  return mastery < 0.4 ? 0 : mastery < 0.7 ? 1 : 2;
}

const results = profiles.map((profile, profileIndex) => {
  const mastery = Object.fromEntries(topics.map(topic => [topic, profile.initialMastery])) as Record<string, number>;
  const initial = { ...mastery };
  const seen = new Set<string>();
  let attempts = 0;
  let repeats = 0;
  const sessionResults: Array<{ session: number; averageMastery: number; correctRate: number; questionIds: string[] }> = [];

  for (let session = 0; session < sessions; session++) {
    let correct = 0;
    const selectedIds: string[] = [];
    for (let q = 0; q < questionsPerSession; q++) {
      const topic = topics
        .map((id, index) => ({ id, index, mastery: mastery[id] }))
        .sort((a, b) => a.mastery - b.mastery || a.index - b.index)[q % topics.length].id;
      const targetLevel = difficultyFor(mastery[topic]);
      const candidates = questionBank
        .filter(question => question.topic === topic && question.level === targetLevel && !seen.has(question.id))
        .sort((a, b) => a.id.localeCompare(b.id));
      const question = candidates[0] ?? questionBank
        .filter(item => item.topic === topic)
        .sort((a, b) => a.level - b.level || a.id.localeCompare(b.id))[session % 8];
      if (seen.has(question.id)) repeats++;
      seen.add(question.id);
      selectedIds.push(question.id);
      const responseProbability = Math.max(0.08, Math.min(0.95,
        0.15 + profile.ability * 0.62 + mastery[topic] * 0.30 - question.level * 0.20
      ));
      const isCorrect = stableNoise((profileIndex + 1) * 10000 + session * 100 + q) < responseProbability;
      if (isCorrect) correct++;
      mastery[topic] = updateBKT(mastery[topic], isCorrect).newMastery;
      attempts++;
    }
    sessionResults.push({
      session: session + 1,
      averageMastery: Number((topics.reduce((sum, topic) => sum + mastery[topic], 0) / topics.length).toFixed(4)),
      correctRate: Number((correct / questionsPerSession).toFixed(4)),
      questionIds: selectedIds,
    });
  }
  const finalMastery = topics.reduce((sum, topic) => sum + mastery[topic], 0) / topics.length;
  const initialMastery = topics.reduce((sum, topic) => sum + initial[topic], 0) / topics.length;
  return {
    profile: profile.id,
    sessions,
    attempts,
    initialAverageMastery: Number(initialMastery.toFixed(4)),
    finalAverageMastery: Number(finalMastery.toFixed(4)),
    masteryGain: Number((finalMastery - initialMastery).toFixed(4)),
    questionRepetitionRate: Number((repeats / attempts).toFixed(4)),
    uniqueQuestions: seen.size,
    sessionResults,
  };
});
const report = {
  evaluation: 'deterministic-simulated-student-bkt',
  note: 'Synthetic simulation only; not evidence of real learner outcomes or causal improvement.',
  parameters: { sessions, questionsPerSession, topics, questionBankSize: questionBank.length },
  profiles: results,
  aggregate: {
    averageMasteryGain: Number((results.reduce((sum, item) => sum + item.masteryGain, 0) / results.length).toFixed(4)),
    overallQuestionRepetitionRate: Number((results.reduce((sum, item) => sum + item.questionRepetitionRate * item.attempts, 0) / results.reduce((sum, item) => sum + item.attempts, 0)).toFixed(4)),
    totalAttempts: results.reduce((sum, item) => sum + item.attempts, 0),
  },
};
const outputPath = resolve('evaluation/simulated-student-results.json');
await mkdir(resolve('evaluation'), { recursive: true });
await writeFile(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ outputPath, aggregate: report.aggregate, profiles: results.map(({ profile, initialAverageMastery, finalAverageMastery, masteryGain, questionRepetitionRate }) => ({ profile, initialAverageMastery, finalAverageMastery, masteryGain, questionRepetitionRate })) }, null, 2));
