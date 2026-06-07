// @cohbit/resource — R14 Authority Budget Layer
// Authority is treated as a limited resource: granted, spent, or blocked.
// Spec: Noetican Resource Layer v0.1 §18

export type AuthorityAction = 'emit_receipt' | 'close_repair' | 'plan_ctrl_route' | 'approve_release' | 'export_public_claim' | 'change_canonical_status' | 'run_high_cost_scan';

export interface AuthorityBudget {
    authorityBudgetId: string; sessionId: string;
    grantedAuthority: AuthorityAction[]; authoritySpent: AuthorityAction[];
    blockedAuthority: AuthorityAction[]; status: 'within_scope' | 'exceeded';
    createdAt: string;
}

let aCounter = 0;

export function createAuthorityBudget(params: {
    sessionId: string; grantedAuthority: AuthorityAction[]; blockedAuthority?: AuthorityAction[];
}): AuthorityBudget {
    aCounter++;
    return {
        authorityBudgetId: `ABUD_${String(aCounter).padStart(6, '0')}`,
        sessionId: params.sessionId, grantedAuthority: params.grantedAuthority,
        authoritySpent: [], blockedAuthority: params.blockedAuthority ?? [],
        status: 'within_scope', createdAt: new Date().toISOString(),
    };
}

export function canSpendAuthority(budget: AuthorityBudget, action: AuthorityAction): boolean {
    if (budget.blockedAuthority.includes(action)) return false;
    if (!budget.grantedAuthority.includes(action)) return false;
    return budget.status !== 'exceeded';
}

export function spendAuthority(budget: AuthorityBudget, action: AuthorityAction): AuthorityBudget {
    if (!canSpendAuthority(budget, action)) {
        budget.status = 'exceeded';
        return budget;
    }
    budget.authoritySpent.push(action);
    budget.grantedAuthority = budget.grantedAuthority.filter(a => a !== action);
    return budget;
}