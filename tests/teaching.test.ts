// CohBit-Copilot v14.5 — Teaching Unit Tests
// Tests the exported pure-function API surface of src/teaching.ts.
//
// Operating law:
//   These tests verify exported function contracts.
//   They do not require filesystem state, external services, or corpus paths.

import { describe, it, expect } from 'vitest';
import {
    listTopics,
    generateQuiz,
    formatQuizOutput,
    formatTeachingOutput,
    formatTeachingReceipt,
    renderTeachingResponse,
    type TeachingAudience,
    type TeachingResponse,
    type TeachingReceipt,
} from '../src/teaching.js';

// ─── listTopics ──────────────────────────────────────────────────

describe('v14.5 — listTopics', () => {
    it('returns a non-empty array of topic strings', () => {
        const topics = listTopics();
        expect(Array.isArray(topics)).toBe(true);
        expect(topics.length).toBeGreaterThan(0);
    });

    it('each topic is a non-empty string', () => {
        const topics = listTopics();
        for (const topic of topics) {
            expect(typeof topic).toBe('string');
            expect(topic.length).toBeGreaterThan(0);
        }
    });

    it('includes known core topics', () => {
        const topics = listTopics();
        expect(topics).toContain('proposal vs authority');
        expect(topics).toContain('detection is not repair authority');
        expect(topics).toContain('surface detected vs verified');
        expect(topics).toContain('why receipts matter');
    });

    it('includes curriculum modules', () => {
        const topics = listTopics();
        expect(topics).toContain('module 0: code as state transition');
        expect(topics).toContain('module 1: python safe file tool');
        expect(topics).toContain('module 8: rust high-integrity verifier');
    });
});

// ─── generateQuiz ────────────────────────────────────────────────

describe('v14.5 — generateQuiz', () => {
    it('returns a QuizQuestion for a known topic', () => {
        const quiz = generateQuiz('proposal vs authority');
        expect(quiz).not.toBeNull();
        expect(quiz!.topic).toBe('proposal vs authority');
        expect(quiz!.question.length).toBeGreaterThan(0);
        expect(quiz!.hint.length).toBeGreaterThan(0);
        expect(quiz!.answerConcept.length).toBeGreaterThan(0);
    });

    it('returns a QuizQuestion for an alias', () => {
        const quiz = generateQuiz('proposal');
        expect(quiz).not.toBeNull();
        expect(quiz!.topic).toBe('proposal vs authority');
    });

    it('returns null for an unknown topic', () => {
        const quiz = generateQuiz('nonexistent topic xyz');
        expect(quiz).toBeNull();
    });

    it('each quiz question has required fields', () => {
        const topics = listTopics().slice(0, 5);
        for (const topic of topics) {
            const quiz = generateQuiz(topic);
            expect(quiz).not.toBeNull();
            expect(typeof quiz!.question).toBe('string');
            expect(typeof quiz!.hint).toBe('string');
            expect(typeof quiz!.answerConcept).toBe('string');
            expect(quiz!.topic).toBe(topic);
        }
    });
});

// ─── formatQuizOutput ────────────────────────────────────────────

describe('v14.5 — formatQuizOutput', () => {
    it('renders a quiz question as a string', () => {
        const quiz = generateQuiz('why receipts matter');
        expect(quiz).not.toBeNull();
        const output = formatQuizOutput(quiz!);
        expect(typeof output).toBe('string');
        expect(output.length).toBeGreaterThan(0);
        expect(output).toContain('CohBit-Copilot Quiz');
        expect(output).toContain(quiz!.topic);
    });

    it('includes topic, question, hint, and key concept', () => {
        const quiz = generateQuiz('obligation vs defect');
        expect(quiz).not.toBeNull();
        const output = formatQuizOutput(quiz!);
        expect(output).toContain(quiz!.question);
        expect(output).toContain(quiz!.hint);
        expect(output).toContain(quiz!.answerConcept);
    });
});

// ─── formatTeachingOutput ────────────────────────────────────────

describe('v14.5 — formatTeachingOutput', () => {
    it('renders a TeachingResponse as a formatted string', () => {
        const response: TeachingResponse = {
            doctrine: 'Test doctrine text',
            plainExplanation: 'Test plain explanation',
            workflowExample: 'Test workflow example',
            evidenceBoundary: 'Test evidence boundary',
            commonMistake: 'Test common mistake',
            refusalRationale: 'Test refusal rationale',
            reflectionQuestion: 'Test reflection question?',
            sources: {
                nodesUsed: 5,
                evidenceCeiling: 'corpus_extracted',
                limitationsIncluded: true,
                canonSafe: true,
                audience: 'internal' as TeachingAudience,
            },
            generatedAt: new Date().toISOString(),
        };

        const output = formatTeachingOutput(response);
        expect(typeof output).toBe('string');
        expect(output).toContain('CohBit-Copilot Teaching Mode');
        expect(output).toContain('Test doctrine text');
        expect(output).toContain('Test plain explanation');
        expect(output).toContain('── 7. Reflection Question ──');
        expect(output).toContain('Evidence ceiling: corpus_extracted');
        expect(output).toContain('Canon safety: passed');
    });
});

// ─── formatTeachingReceipt ───────────────────────────────────────

describe('v14.5 — formatTeachingReceipt', () => {
    it('renders a TeachingReceipt as a formatted string', () => {
        const receipt: TeachingReceipt = {
            receiptId: 'TCH_abc123',
            command: 'teach',
            topic: 'proposal vs authority',
            audience: 'internal',
            evidenceCeiling: 'corpus_extracted',
            limitationsIncluded: true,
            canonSafe: true,
            claimGuardPassed: true,
            boundaryGuardPassed: true,
            sourceRecordIds: [],
            outputHash: 'abc1234567890def',
            outputLength: 500,
            quizGenerated: false,
            generatedAt: new Date().toISOString(),
            doesNotCertifyUnderstanding: true,
            doesNotPromoteCanon: true,
            doesNotClaimTraining: true,
        };

        const output = formatTeachingReceipt(receipt);
        expect(typeof output).toBe('string');
        expect(output).toContain('TCH_abc123');
        expect(output).toContain('teach');
        expect(output).toContain('proposal vs authority');
        expect(output).toContain('500 chars');
    });
});

// ─── renderTeachingResponse ──────────────────────────────────────

describe('v14.5 — renderTeachingResponse', () => {
    it('returns a valid TeachingResponse from a TopicEntry-like object', () => {
        // renderTeachingResponse is used internally but exported;
        // we test with a mock entry matching the internal TopicEntry shape
        const mockEntry = {
            topic: 'test topic',
            aliases: ['test'],
            doctrine: 'Mock doctrine for testing',
            plainExplanation: 'Mock plain explanation for testing purposes',
            workflowExample: 'Mock workflow example',
            evidenceBoundary: 'Mock evidence boundary information',
            commonMistake: 'Mock common mistake description',
            refusalRationale: 'Mock refusal rationale explanation',
            reflectionQuestion: 'Mock reflection question for learners?',
        };

        const response = renderTeachingResponse(mockEntry as any, 'internal');
        expect(response.doctrine).toBe(mockEntry.doctrine);
        expect(response.plainExplanation).toBe(mockEntry.plainExplanation);
        expect(response.sources.audience).toBe('internal');
        expect(response.sources.limitationsIncluded).toBe(true);
        expect(response.sources.canonSafe).toBe(true);
    });

    it('sets audience correctly for different modes', () => {
        const mockEntry = {
            topic: 'test',
            aliases: [],
            doctrine: 'd', plainExplanation: 'p', workflowExample: 'w',
            evidenceBoundary: 'e', commonMistake: 'c',
            refusalRationale: 'r', reflectionQuestion: 'q?',
        };

        const internalResp = renderTeachingResponse(mockEntry as any, 'internal');
        expect(internalResp.sources.audience).toBe('internal');

        const publicResp = renderTeachingResponse(mockEntry as any, 'public');
        expect(publicResp.sources.audience).toBe('public');

        const linkedinResp = renderTeachingResponse(mockEntry as any, 'linkedin');
        expect(linkedinResp.sources.audience).toBe('linkedin');
    });
});