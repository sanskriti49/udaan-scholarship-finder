import { safeSource } from "./rules";

// Public metadata only. Never use the authenticated axios client in the scanner.
export async function loadScholarships(signal, selectedId) {
  const base = (import.meta.env.VITE_API_URL || "http://localhost:5000/api")
    .trim()
    .replace(/\/+$/, "");
  const url = `${base.endsWith("/api") ? base : `${base}/api`}/scholarships?limit=100`;
  const options = {
    signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
    credentials: "omit",
    referrerPolicy: "no-referrer",
  };
  const response = await fetch(url, options);
  if (!response.ok) throw new Error("Unavailable");
  const body = await response.json();
  const data = Array.isArray(body.data) ? body.data : [];
  if (
    /^[a-f\d]{24}$/i.test(selectedId || "") &&
    !data.some((s) => s._id === selectedId)
  ) {
    try {
      const selected = await fetch(
        `${url.split("?")[0]}/${encodeURIComponent(selectedId)}`,
        options,
      );
      if (selected.ok) {
        const detail = await selected.json();
        if (detail.data) data.push(detail.data);
      }
    } catch {
      /* General readiness remains usable if this optional lookup fails. */
    }
  }
  return data
    .map((s) => ({
      id: s._id,
      title: s.title,
      url: safeSource(s.officialLinks?.guidelinesUrl || s.sourceUrl),

    }))
    .filter((s) => s.id && s.title);
}

