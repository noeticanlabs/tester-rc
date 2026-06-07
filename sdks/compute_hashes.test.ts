// Quick script to compute canonical hashes for shared test vectors
import { hashReceipt } from '../src/receipt.js';
import type { CohBitReceipt } from '../src/types.js';
import * as fs from 'node:fs';

function r(
    vPre: number, vPost: number,
    spend: number, defect: number, authority: number,
    fromState?: string, toState?: string,
): CohBitReceipt {
    return {
        bitId: '',
        valuationPre: { numer: vPre, denom: 1 },
        valuationPost: { numer: vPost, denom: 1 },
        wedge: {
            version: '1',
            domainId: '0'.repeat(64),
            policyHash: '0'.repeat(64),
            fromState: fromState ?? '0'.repeat(64),
            toState: toState ?? '0'.repeat(64),
            actionHash: '0'.repeat(64),
            spend: { numer: spend, denom: 1 },
            defect: { numer: defect, denom: 1 },
            prescribedEnvelope: { numer: 1, denom: 10 },
            authority: { numer: authority, denom: 1 },
            certificateHash: '0'.repeat(64),
        },
    };
}

const vectors = [
    { name: 'identity', receipt: r(10, 10, 0, 0, 0) },
    { name: 'exact_boundary', receipt: r(10, 11, 0, 1, 0) },
    { name: 'basic_spend', receipt: r(10, 9, 1, 0, 0) },
    { name: 'fractional_spend', receipt: r(10, 5, 0, 0, 0, 'a'.repeat(64), 'a'.repeat(64)) },
    { name: 'with_authority', receipt: r(10, 12, 0, 0, 2) },
    { name: 'full_wedge', receipt: r(100, 95, 5, 1, 1, 'f'.repeat(64), 'e'.repeat(64)) },
    { name: 'large_values', receipt: r(1000, 900, 100, 10, 0) },
    { name: 'negative_spend', receipt: r(10, 9, -1, 0, 0) },
];

const output = vectors.map(v => {
    const canonical = `pre:${v.receipt.valuationPre.numer}/${v.receipt.valuationPre.denom}|post:${v.receipt.valuationPost.numer}/${v.receipt.valuationPost.denom}|w:[v:${v.receipt.wedge.version}|(canonical wedge fields)...]`;
    return {
        name: v.name,
        canonical: canonical, // placeholder — will be computed by each SDK
        hash_expected: hashReceipt(v.receipt),
    };
});

console.log(JSON.stringify(output, null, 2));