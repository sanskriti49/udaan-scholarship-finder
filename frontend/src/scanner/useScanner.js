import { useEffect, useRef, useState } from "react";
import { emptyFields, extract, editField } from "./extract";
import { processDocument } from "./process";
export function useScanner(type) {
  const [fields, setFields] = useState(() => emptyFields(type));
  const [stage, setStage] = useState("choose");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [pages, setPages] = useState([]);
  const active = useRef(null);
  const version = useRef(0);
  function reset() {
    version.current++;
    active.current?.abort();
    active.current = null;
    setFields(emptyFields(type));
    setPages([]);
    setStage("choose");
    setStatus("");
    setError("");
  }
  useEffect(() => {
    const leave = () => {
      version.current++;
      active.current?.abort();
      active.current = null;
      setFields(emptyFields(type));
      setPages([]);
      setStage("choose");
      setError("");
      setStatus("");
    };
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [type]);
  async function scan(file, options = {}) {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    const current = ++version.current;
    const timeout = setTimeout(() => controller.abort(), 120000);
    setError("");
    setFields(emptyFields(type));
    setPages([]);
    setStage("processing");
    setStatus("Checking file…");
    try {
      const pages = await processDocument(file, {
        signal: controller.signal,
        language: options.language,
        forceOCR: options.forceOCR,
        progress: (message) => {
          if (current === version.current) setStatus(message);
        },
      });
      if (current !== version.current) return;
      setPages(pages);
      setFields(extract(type, pages));
      setStage("review");
      if (!pages.some((p) => p.text.trim()))
        setError(
          "No readable text found. This does not mean your certificate is invalid. Enter the details manually.",
        );
    } catch (e) {
      if (current !== version.current) return;
      setError(
        e.name === "AbortError"
          ? "Processing timed out. Try a smaller file or enter details manually."
          : e.message,
      );
      setStage("choose");
    } finally {
      clearTimeout(timeout);
      if (current === version.current) active.current = null;
    }
  }
  function manual() {
    reset();
    setStage("review");
  }
  function edit(key, value) {
    setFields((prev) => ({ ...prev, [key]: editField(prev[key], value) }));
    setStage("review");
  }
  return {
    fields,
    stage,
    status,
    error,
    pages,
    scan,
    reset,
    manual,
    edit,
    validate: () => setStage("results"),
    review: () => setStage("review"),
  };
}
