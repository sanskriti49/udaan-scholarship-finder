// URLSearchParams already decodes once. Never decode a return URL again.
export function safeReturnPath(value, fallback = '/') {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || [...value].some(character => character.charCodeAt(0) < 32)) return fallback;
  try {
    const target = new URL(value, 'https://udaan.local');
    if (target.origin !== 'https://udaan.local' || ['/login', '/signup'].includes(target.pathname.replace(/\/$/, ''))) return fallback;
    return target.pathname + target.search + target.hash;
  } catch { return fallback; }
}
export function authDestination(page, returnPath) {
  return `${page}?${new URLSearchParams({ redirect: safeReturnPath(returnPath) })}`;
}
