import test from 'node:test';
import assert from 'node:assert/strict';
import { quotationSpan } from '../../src/agents/navigator/quotationSpan.js';
import { loadStudentCorpus, policyFacts, PRAGATI } from '../../evaluations/studentQuestions.js';
import { findPassages } from '../../src/agents/navigator/passages.js';
import { verifyEvidence } from '../../src/pipeline/core/evidence.js';
import { ANSWER_PROMPT } from '../../src/agents/navigator/evidenceAnswer.js';

test('whitespace-only alignment returns original Unicode text and UTF-16 offsets', () => {
 const source = 'Heading\nOnly SC/ST 😀 applicants\r\n\twith income ≤ ₹3,00,000 may apply; exceptions remain applicable.\nOther';
 const original = source.slice(source.indexOf('Only'), source.indexOf('\nOther'));
 const proposed = original.replace(/\s+/gu, ' ');
 const result = quotationSpan(source, proposed, 100);
 assert.equal(result.ok, true); assert.equal(result.quote, original);
 assert.equal(source.slice(result.span.charStart - 100, result.span.charEnd - 100), original);
 for (const changed of [proposed.replace('3,00,000', '8,00,000'), proposed.replace('SC/ST', 'OBC'), proposed.replace('; exceptions remain applicable', ''), proposed.replace('may apply', 'may not apply')]) {
  assert.equal(quotationSpan(source, changed).ok, false, changed);
 }
 assert.equal(quotationSpan(source, proposed, 100, { startComplete: false }).ok, true); // Heading precedes this intact clause.
 assert.equal(quotationSpan(original, proposed, 0, { endComplete: false }).ok, false);
 assert.equal(quotationSpan(`${original}\n\n${original}`, proposed).code, 'QUOTE_AMBIGUOUS');
});

test('Pragati duration retains its verified original cross-page continuation within the passage cap', () => {
 const corpus = loadStudentCorpus(), scheme = corpus.schemes.find(s => s._id === PRAGATI);
 const snapshot = corpus.snapshots.find(s => s._id === policyFacts.duration.snapshotId);
 const passages = findPassages(scheme, [snapshot], 'duration', { includeContext: true,
  targets: [{ id: 'duration', topics: ['duration'], terms: [], topicOnly: true }] });
 const passage = passages.find(p => p.evidence.quote.includes(policyFacts.duration.quote));
 assert.ok(passage); assert.ok(passage.evidence.quote.includes('lateral entry as lump sum'));
 assert.ok(passage.evidence.quote.includes('No other additional grant'));
 assert.ok(passage.evidence.quote.length <= 1400);
 assert.match(passage.evidence.locator, /^Pages \d+–\d+$/u);
 assert.equal(verifyEvidence(passage.evidence, { ...snapshot, id: snapshot._id }).ok, true);
});

test('concise answer instructions preserve exceptions, uncertainty and renewal progression', () => {
 assert.match(ANSWER_PROMPT, /one or two short sentences/);
 assert.match(ANSWER_PROMPT, /progression\/forfeiture/);
 assert.match(ANSWER_PROMPT, /Never omit a restriction/);
});
