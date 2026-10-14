import { ContentUnit } from '../src/types';

export interface RetrievalBenchmarkCase {
  id: string;
  question: string;
  goldUnitIds: string[];
  shouldRefuse: boolean;
  groundTruth: string;
}

/**
 * Self-authored, reproducible fixture corpus. It is intentionally separate from
 * learner data and is not presented as a real student's course history.
 */
export const benchmarkUnits: ContentUnit[] = [
  {
    id: 'eval-gradient-descent', title: 'Gradient Descent Parameter Updates',
    summary: 'Gradient descent updates model parameters in the direction opposite the gradient of the loss.',
    full_text_excerpt: 'Gradient descent minimizes a differentiable loss by repeatedly updating each parameter: theta_next = theta_current - learning_rate * gradient(loss, theta). The learning rate controls the step size.',
    topic_id: 'eval-optimization', topic_name: 'Optimization', subtopic: 'Gradient descent',
    concept_tags: ['gradient descent', 'parameter update', 'learning rate'], difficulty: 'easy',
    source_type: 'text', source_file: 'evaluation-fixture.md', source_location: 'Lines 1-4',
  },
  {
    id: 'eval-mse-mae', title: 'Mean Squared Error and Mean Absolute Error',
    summary: 'MSE squares residuals and penalizes large errors more strongly than MAE.',
    full_text_excerpt: 'Mean Squared Error is the average of squared differences between target and prediction. Mean Absolute Error is the average absolute difference. Squaring makes MSE more sensitive to large residuals than MAE.',
    topic_id: 'eval-regression', topic_name: 'Regression Metrics', subtopic: 'Regression loss',
    concept_tags: ['mean squared error', 'MSE', 'mean absolute error', 'MAE', 'residuals'], difficulty: 'easy',
    source_type: 'text', source_file: 'evaluation-fixture.md', source_location: 'Lines 6-9',
  },
  {
    id: 'eval-bkt', title: 'Bayesian Knowledge Tracing',
    summary: 'BKT estimates the probability that a learner has mastered a skill from observed answers.',
    full_text_excerpt: 'Bayesian Knowledge Tracing maintains a probability of mastery for a skill. It updates that estimate after each correct or incorrect response using prior mastery, learning transition, guess, and slip probabilities.',
    topic_id: 'eval-personalization', topic_name: 'Learner Modeling', subtopic: 'Mastery estimation',
    concept_tags: ['Bayesian knowledge tracing', 'BKT', 'mastery', 'guess', 'slip'], difficulty: 'medium',
    source_type: 'text', source_file: 'evaluation-fixture.md', source_location: 'Lines 11-14',
  },
  {
    id: 'eval-attention', title: 'Scaled Dot-Product Attention',
    summary: 'Scaled dot-product attention divides query-key dot products by the square root of key dimension before softmax.',
    full_text_excerpt: 'Scaled dot-product attention computes QK-transpose divided by sqrt(d_k), applies softmax to the scaled scores, and multiplies the resulting weights by V. The scale helps keep dot-product magnitudes from growing too large as key dimension increases.',
    topic_id: 'eval-transformers', topic_name: 'Transformers', subtopic: 'Attention',
    concept_tags: ['scaled dot-product attention', 'query', 'key', 'value', 'softmax'], difficulty: 'medium',
    source_type: 'text', source_file: 'evaluation-fixture.md', source_location: 'Lines 16-20',
  },
];

export const retrievalBenchmarkCases: RetrievalBenchmarkCase[] = [
  {
    id: 'in-scope-gradient-descent',
    question: 'How does gradient descent update parameters?',
    goldUnitIds: ['eval-gradient-descent'],
    shouldRefuse: false,
    groundTruth: 'It subtracts the learning rate multiplied by the loss gradient from the current parameter values.',
  },
  {
    id: 'in-scope-mse',
    question: 'Why does MSE penalize large residuals more than MAE?',
    goldUnitIds: ['eval-mse-mae'],
    shouldRefuse: false,
    groundTruth: 'MSE squares the residuals, so large errors contribute disproportionately compared with absolute error in MAE.',
  },
  {
    id: 'in-scope-bkt',
    question: 'Which probabilities does Bayesian Knowledge Tracing use to estimate mastery?',
    goldUnitIds: ['eval-bkt'],
    shouldRefuse: false,
    groundTruth: 'BKT uses prior mastery, learning transition, guess, and slip probabilities to update mastery after responses.',
  },
  {
    id: 'in-scope-attention',
    question: 'Why is the query-key dot product divided by the square root of key dimension?',
    goldUnitIds: ['eval-attention'],
    shouldRefuse: false,
    groundTruth: 'The scale keeps dot-product magnitudes from growing too large as the key dimension increases before softmax.',
  },
  {
    id: 'out-of-scope-mercury',
    question: 'What is the boiling point of mercury?',
    goldUnitIds: [],
    shouldRefuse: true,
    groundTruth: '',
  },
  {
    id: 'out-of-scope-world-cup',
    question: 'Which country won the 2026 FIFA World Cup?',
    goldUnitIds: [],
    shouldRefuse: true,
    groundTruth: '',
  },
];
