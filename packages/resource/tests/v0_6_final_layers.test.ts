import { describe, it, expect } from 'vitest';
import { createResourceHealth } from '../src/R19_dashboard.js';
import { createResourceForecast } from '../src/R20_forecast.js';

describe('R19 — Resource Health Dashboard', () => {
    it('creates dashboard with all panels healthy by default', () => {
        const h = createResourceHealth({ workspaceId: 'w1' });
        expect(h.computeHealth).toBe('healthy');
        expect(h.overallResourceHealth).toBe('healthy');
    });
    it('overall health reflects worst panel', () => {
        const h = createResourceHealth({ workspaceId: 'w1', panels: { repairBacklogHealth: 'scarce', humanReviewHealth: 'limited' } });
        expect(h.overallResourceHealth).toBe('critical');
    });
    it('mixed panels get degraded', () => {
        const h = createResourceHealth({ workspaceId: 'w1', panels: { receiptStorageHealth: 'limited' } });
        expect(h.overallResourceHealth).toBe('degraded');
    });
    it('watch status gives usable_with_limits', () => {
        const h = createResourceHealth({ workspaceId: 'w1', panels: { riskBudgetHealth: 'watch' } });
        expect(h.overallResourceHealth).toBe('usable_with_limits');
    });
});
describe('R20 — Resource Forecast', () => {
    it('creates forecast with default window of 30 days', () => {
        const f = createResourceForecast({ workspaceId: 'w1' });
        expect(f.forecastWindowDays).toBe(30);
        expect(f.predictedBottleneck).toBe('none_predicted');
    });
    it('accepts custom predictions', () => {
        const f = createResourceForecast({ workspaceId: 'w1', predictedOpenRepairs: 78, predictedBottleneck: 'human_review', recommendedAction: 'Batch public-claim reviews.' });
        expect(f.predictedOpenRepairs).toBe(78);
        expect(f.predictedBottleneck).toBe('human_review');
        expect(f.recommendedAction).toBe('Batch public-claim reviews.');
    });
});