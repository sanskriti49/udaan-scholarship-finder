import { parseMoney } from './extract.js';
// Only explicit, unambiguous details can be offered to the eligibility form.
export function eligiblePrefill(type, fields) {
  const value = key => !fields[key]?.ambiguous ? String(fields[key]?.value || '').trim() : '';
  if (type === 'income') {
    const income = parseMoney(value('annualIncome'));
    return income === null ? {} : {familyIncome: income};
  }
  if (type === 'caste') {
    const category = value('casteCategory').toUpperCase();
    return ['OBC','SC','ST','EWS','GENERAL'].includes(category) ? {casteCategory:category === 'GENERAL' ? 'General' : category} : {};
  }
  if (fields.course?.ambiguous || fields.study?.ambiguous) return {};
  const study = [value('course'), value('study')].join(' ');
  const options = [
    ['PhD', /\b(ph\.?d|doctorate)\b/i], ['PG', /\b(pg|postgraduate|post graduate|master|m\.?tech|m\.?sc|mba)\b/i],
    ['Diploma', /\bdiploma\b/i], ['Class 12', /\b(class 12|twelfth)\b/i], ['Class 10', /\b(class 10|tenth)\b/i],
    ['UG', /\b(ug|undergraduate|under graduate|bachelor|b\.?tech|b\.?sc|b\.?com)\b/i],
  ].filter(([,pattern])=>pattern.test(study));
  return options.length === 1 ? {educationLevel:options[0][0]} : {};
}
