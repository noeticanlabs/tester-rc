// @cohbit/tlt-atlas v0.9.0 — L6–L9 Registry Tests
import { describe, it, expect } from 'vitest';
import { TONE_PROFILES } from '../src/L6_tone_register.js';
import { DOMAIN_PROFILES } from '../src/L7_domain_context.js';
import { BILINGUAL_PROJECTIONS, getAcceptedProjections } from '../src/L8_bilingual_projection.js';
import { AMBIGUITY_RISKS, listBySeverity } from '../src/L9_ambiguity_risk.js';

describe('v0.9 — L6 Tone Profiles', () => { it('has 13 tone profiles', () => { expect(TONE_PROFILES.size).toBe(13); }); });
describe('v0.9 — L7 Domain Context', () => { it('has 9 domain profiles', () => { expect(DOMAIN_PROFILES.size).toBe(9); }); });
describe('v0.9 — L8 Bilingual Projections', () => { it('has 3 projections', () => { expect(BILINGUAL_PROJECTIONS).toHaveLength(3); }); it('2 are accepted', () => { expect(getAcceptedProjections()).toHaveLength(2); }); });
describe('v0.9 — L9 Ambiguity Risks', () => { it('has 8 risk entries', () => { expect(AMBIGUITY_RISKS.size).toBe(8); }); it('4 are high severity', () => { expect(listBySeverity('high')).toHaveLength(4); }); });