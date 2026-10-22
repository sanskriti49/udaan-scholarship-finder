import { schemas } from "./extract.js";
import { MAX_COMPARISON_DOCUMENTS } from "./documentAudit.js";

// Deliberately excludes bytes, filenames, full fields, OCR text and evidence.
export function rememberName(documents, { id, type, field }) {
  const name = field?.value?.trim();
  if (!schemas[type] || !id || !name || name.length > 200 || field.ambiguous) return documents;
  if (!documents.some(doc => doc.id === id) && documents.length >= MAX_COMPARISON_DOCUMENTS) return documents;
  const entry = { id, name, label: schemas[type].label, source: ["pdf", "ocr", "manual"].includes(field.source) ? field.source : "manual" };
  return documents.some(doc => doc.id === id) ? documents.map(doc => doc.id === id ? entry : doc) : [...documents, entry];
}
