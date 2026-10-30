const titles = { educationLevel: 'Course level', state: 'Location', incomeCeiling: 'Family income', studyYear: 'Year of study',
  applicationType: 'New application or renewal', academicYear: 'Academic year', category: 'Category', gender: 'Gender', stream: 'Course', other: 'Funding need' };
export function studentCondition(condition, requirements = []) {
  const requirement = requirements.find(r => r.id === (condition.requirementId ?? condition.id));
  if (!requirement) return condition.label;
  if (requirement.field === 'question') return requirement.text || requirement.label;
  const title = requirement.role === 'applicant_qualification' ? 'What you have completed'
    : requirement.role === 'applicant_schooling' ? 'Where you studied'
      : requirement.role === 'applicant_domicile' ? 'Domicile' : requirement.role === 'funding_location' ? 'Where you want to study'
        : titles[requirement.field] ?? 'Your question';
  const value = requirement.field === 'incomeCeiling' && Number.isSafeInteger(requirement.value) ? `₹${new Intl.NumberFormat('en-IN').format(requirement.value)}` : Array.isArray(requirement.value) ? requirement.value.join(' or ') : requirement.value;
  const bound = { lt: 'below ', lte: 'at most ', gt: 'above ', gte: 'at least ' }[requirement.operator] ?? '';
  return `${requirement.operator === 'exclude' ? 'Exclude ' : ''}${title}${value != null ? `: ${bound}${value}` : ''}`;
}

// A useful explanation must already have survived the server's source/rule
// checks. This module formats findings; it never derives eligibility from prose.
export function studentFindings(entry, requirements = []) {
  const conditions = entry.answer?.conditions ?? [];
  const questions = new Set(requirements.filter(r => r.field === 'question').map(r => r.id));
  const questionFirst = (a, b) => Number(questions.has(b.requirementId)) - Number(questions.has(a.requirementId));
  const established = conditions.filter(c => c.status !== 'unknown' && (c.basis === 'recorded_check' || c.evidence.length))
    .sort(questionFirst);
  const explained = conditions.filter(c => c.status === 'unknown' && c.evidence.length).sort(questionFirst);
  const unanswered = conditions.filter(c => c.status === 'unknown' && !c.evidence.length);
  // Keep a source-backed explanation of an open condition visible even when
  // several easier recorded checks already passed.
  const importantUnknown = [...unanswered].sort(questionFirst).slice(0, 1);
  const open = [...explained.slice(0, 1), ...importantUnknown];
  return { established, explained, unanswered, visible: [...established.slice(0, Math.max(1, 3 - open.length)), ...open].sort(questionFirst),
    hasFindings: established.length > 0 || explained.length > 0 };
}
