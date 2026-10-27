import { createHash } from 'node:crypto';
import { makeEvidence } from '../src/pipeline/core/evidence.js';
import { researchFixture, FIXTURE_NOW } from './navigatorHelpers.js';

export const admissionBrief = 'I belong to the SC category and got admitted to B.Tech. My family annual income is 5 lakhs. Am I eligible for the Top Class Education Scheme or the Post-Matric SC scholarship?';
export const admissionIntent = {
	objective: 'Compare the two requested schemes for the stated admission, category and income',
	searchQuery: 'Top Class Education Scheme Post-Matric SC scholarship', ambiguities: [], questions: [],
	constraints: [
		{ field: 'category', role: 'applicant_current', operator: 'include', value: 'SC', source: { messageIndex: 0, quote: 'SC category' } },
		{ field: 'educationLevel', role: 'applicant_current', operator: 'include', value: 'UG', source: { messageIndex: 0, quote: 'got admitted to B.Tech' } },
		{ field: 'incomeCeiling', role: 'applicant_current', operator: 'include', value: 500000, source: { messageIndex: 0, quote: 'family annual income is 5 lakhs' } },
		{ field: 'scheme', role: 'investigate', operator: 'include', value: 'Top Class Education Scheme', source: { messageIndex: 0, quote: 'Top Class Education Scheme' } },
		{ field: 'scheme', role: 'investigate', operator: 'include', value: 'Post-Matric SC scholarship', source: { messageIndex: 0, quote: 'Post-Matric SC scholarship' } },
	],
};

/** Synthetic limits deliberately are NOT the actual schemes' policy. This
 * exercises the supplied brief and configurable rules without hardcoding advice. */
export function admissionFixture() {
	const f = researchFixture({ linkedPdf: true });
	const clause = 'SYNTHETIC TEST ONLY: Students admitted to an undergraduate engineering course may apply. Admission to an approved institution must also be confirmed.';
	f.snapshot.text = `### Eligibility\n${clause}\nApplicants must belong to the SC category.\nAnnual family income must not exceed Rs 650000.`;
	f.snapshot.textHash = createHash('sha256').update(f.snapshot.text).digest('hex'); f.snapshot.pages = [];
	Object.assign(f.scheme, { title: 'Synthetic Top Class Education Scheme',
		rules: [{ id: 'category', field: 'casteCategory', operator: 'EQ', targetValue: 'SC' }, { id: 'income', field: 'familyIncome', operator: 'LTE', targetValue: 650000 }],
		dataQuality: { unknownFields: ['eligibility'] }, fieldEvidence: [makeEvidence(f.snapshot, f.snapshot.text, { field: 'eligibility' })] });
	Object.assign(f.other, { title: 'Synthetic Post-Matric SC scholarship',
		rules: [{ id: 'category', field: 'casteCategory', operator: 'EQ', targetValue: 'SC' }, { id: 'income', field: 'familyIncome', operator: 'LTE', targetValue: 350000 }] });
	return { ...f, clause, now: () => FIXTURE_NOW };
}
