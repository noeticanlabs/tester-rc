// @cohbit/tlt-atlas — L14 Copilot Retrieval Layer
export interface BilingualRetrievalResult { recommendedTranslation: string; literalTranslation: string; preferred: 'meaning_preserving' | 'literal'; warning: string; receiptStatus: string; }
export function createRetrievalResult(params: BilingualRetrievalResult): BilingualRetrievalResult { return params; }