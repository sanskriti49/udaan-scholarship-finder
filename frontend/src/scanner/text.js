// Normalize values for parsing only. Original page text remains the evidence.
export function normalizeDigits(value) {
  return String(value).normalize("NFC").replace(/[०-९]/g, digit =>
    String(digit.charCodeAt(0) - 0x0966));
}

export function readableText(text) {
  const letters = text.match(/\p{L}/gu) || [];
  const broken = [...text].filter(character => {
    const code = character.charCodeAt(0);
    return character === "\uFFFD" || code < 9 || (code >= 14 && code < 32) || (code >= 0xe000 && code <= 0xf8ff);
  });
  return letters.length >= 40 && broken.length <= Math.max(2, letters.length * 0.02);
}

export const readingLanguages = {
  mixed: { label: "Hindi + English", codes: ["hin", "eng"] },
  eng: { label: "English", codes: ["eng"] },
  hin: { label: "Hindi", codes: ["hin"] },
};
