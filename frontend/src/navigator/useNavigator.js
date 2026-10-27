import { useCallback, useEffect, useRef, useState } from "react";
import { navigatorService as api } from "../services/navigatorService";
import { validRunId } from "./contracts";
import { navigatorErrorMessage as message } from './navigatorErrors.js';


/** One client advancement at a time; mounting/reloading never authorizes new inference. */
export default function useNavigator({ signedIn, runId }) {
	const [run, setRun] = useState(null), [history, setHistory] = useState([]), [available, setAvailable] = useState(null);
	const [connectionState, setConnectionState] = useState('checking');
	const [provider, setProvider] = useState(null);
	const [error, setError] = useState(""), [busy, setBusy] = useState(false), [loading, setLoading] = useState(Boolean(runId));
	const life = useRef(null), operation = useRef(null), paused = useRef(false), version = useRef(0), startIntent = useRef(null);
	const accept = useCallback(next => {
		setRun(current => current?.runId === next.runId && current.revision > next.revision ? current : next);
		setHistory(current => [next, ...current.filter(item => item.runId !== next.runId)].slice(0, 12));
	}, []);
	useEffect(() => {
		const controller = new AbortController(); life.current = controller;
		api.status(controller.signal, { initial: true }).then(s => { if (!controller.signal.aborted) { setProvider(['groq', 'gemini'].includes(s.provider) ? s.provider : null); setAvailable(s.available); setConnectionState(s.state || (s.available ? 'ready' : 'unavailable')); } }).catch(e => { if (!controller.signal.aborted) { setAvailable(false); setConnectionState('unavailable'); setError(message(e)); } });
		if (signedIn) api.list(controller.signal, { initial: true }).then(items => { if (!controller.signal.aborted) setHistory(items); }).catch(e => { if (!controller.signal.aborted) setError(message(e)); });
		return () => { controller.abort(); operation.current?.abort(); paused.current = true; };
	}, [signedIn]);
	// Startup recovery observes readiness only. It never starts or advances an
	// investigation. Sixteen checks cover the bounded database startup window;
	// a slower startup needs an explicit reconnect rather than endless polling.
	useEffect(() => {
		if (connectionState !== 'initializing') return;
		const controller = new AbortController(); let timer, checks = 0;
		const pollReady = async () => {
			try {
				const status = await api.status(controller.signal);
				if (controller.signal.aborted) return;
				setAvailable(status.available);
				setProvider(['groq', 'gemini'].includes(status.provider) ? status.provider : null);
				if (status.available) {
					setError('');
					if (signedIn) { const items = await api.list(controller.signal); if (!controller.signal.aborted) setHistory(items); }
					if (signedIn && runId) { const next = await api.get(runId, controller.signal); if (!controller.signal.aborted) accept(next); }
					if (!controller.signal.aborted) setConnectionState('ready');
					return;
				}
				setConnectionState(status.state || 'unavailable');
				if (status.state !== 'initializing') return;
			} catch (error) { if (!controller.signal.aborted) { setConnectionState('unavailable'); setError(message(error)); } return; }
			if (++checks < 16) timer = setTimeout(pollReady, 2000);
			else { setConnectionState('waiting'); setError('Connecting is taking longer than usual. Reconnect to check again. Your question is still here.'); }
		};
		timer = setTimeout(pollReady, 2000);
		return () => { controller.abort(); clearTimeout(timer); };
	}, [connectionState, signedIn, runId, accept]);
	useEffect(() => {
		if (!runId || !signedIn) return;
		const controller = new AbortController();
		Promise.resolve().then(() => { if (!controller.signal.aborted) setLoading(true); });
		if (!validRunId(runId)) { Promise.resolve().then(() => { if (!controller.signal.aborted) { setError("This investigation link is invalid."); setLoading(false); } }); return () => controller.abort(); }
		api.get(runId, controller.signal, { initial: true }).then(next => { if (!controller.signal.aborted) { accept(next); setError(""); } }).catch(e => { if (!controller.signal.aborted) setError(message(e)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
		return () => controller.abort();
	}, [runId, signedIn, accept]);
	// Also observes work continuing in another tab or a still-live server lease.
	const pollId = run?.runId, pollStatus = run?.status;
	useEffect(() => {
		if (!pollId || (runId && runId !== pollId) || (!busy && pollStatus !== "running")) return;
		const controller = new AbortController(); let timer;
		const poll = async () => {
			try { const next = await api.get(pollId, controller.signal); if (!controller.signal.aborted) accept(next); }
			catch { /* The active request supplies actionable errors; polling must not hide progress. */ }
			if (!controller.signal.aborted) timer = setTimeout(poll, 2500);
		};
		timer = setTimeout(poll, 2500);
		return () => { controller.abort(); clearTimeout(timer); };
	}, [busy, pollId, pollStatus, runId, accept]);

	const drive = async (initial, clarification) => {
		if (operation.current || !life.current || life.current.signal.aborted) return;
		const controller = new AbortController(), stamp = ++version.current;
		operation.current = controller; paused.current = false; setBusy(true); setError("");
		let next = initial;
		try {
			do {
				next = await api.advance(next, clarification, controller.signal); clarification = undefined;
				if (controller.signal.aborted || stamp !== version.current) return;
				accept(next);
			} while (next.status === "ready" && !paused.current);
			return next;
		} catch (e) {
			if (!controller.signal.aborted && stamp === version.current) {
				setError(message(e));
				// Resolve ambiguous timeouts/conflicts by reading. Never blindly repeat a chargeable request.
				try { const current = await api.get(next.runId, controller.signal); if (!controller.signal.aborted && stamp === version.current) accept(current); } catch { /* Keep the original error. */ }
			}
		} finally { if (operation.current === controller) { operation.current = null; if (!life.current.signal.aborted) setBusy(false); } }
	};
	const start = async input => {
		if (operation.current || !signedIn) return null;
		const controller = new AbortController(); operation.current = controller; setBusy(true); setError("");
		// An uncertain start retries the same intention; an edited brief receives a new ID.
		const hash = JSON.stringify(input);
		if (startIntent.current?.hash !== hash) startIntent.current = { hash, requestId: crypto.randomUUID() };
		try {
			const next = await api.start({ ...input, requestId: startIntent.current.requestId }, controller.signal);
			if (controller.signal.aborted) return null;
			accept(next); startIntent.current = null; return next;
		} catch (e) {
			if (!controller.signal.aborted) { setError(message(e)); api.list(life.current.signal).then(setHistory).catch(() => {}); }
			return null;
		} finally { if (operation.current === controller) { operation.current = null; if (!life.current.signal.aborted) setBusy(false); } }
	};
	const cancel = async () => {
		if (!run) return null;
		paused.current = true; const stamp = ++version.current; setError("");
		try { const next = await api.cancel(run.runId, life.current.signal); if (stamp === version.current && !life.current.signal.aborted) { accept(next); return next; } return null; }
		catch (e) { if (!life.current.signal.aborted) setError(message(e)); return null; }
	};
	const prepareNotes = async () => {
		if (!run || operation.current || !life.current || life.current.signal.aborted) return null;
		const controller = new AbortController(), stamp = ++version.current;
		operation.current = controller; paused.current = true; setBusy(true); setError("");
		try {
			const next = await api.prepareNotes(run, controller.signal);
			if (controller.signal.aborted || stamp !== version.current) return null;
			accept(next); return next;
		} catch (e) { if (!controller.signal.aborted) setError(message(e)); return null; }
		finally { if (operation.current === controller) { operation.current = null; if (!life.current.signal.aborted) setBusy(false); } }
	};
	const researchCatalogue = async () => {
		if (!run || operation.current || !life.current || life.current.signal.aborted) return null;
		const controller = new AbortController(), stamp = ++version.current;
		operation.current = controller; paused.current = true; setBusy(true); setError("");
		let next = null;
		try {
			next = await api.researchCatalogue(run, controller.signal);
			if (controller.signal.aborted || stamp !== version.current) return null;
			accept(next);
		} catch (e) { if (!controller.signal.aborted) setError(message(e)); }
		finally { if (operation.current === controller) { operation.current = null; if (!life.current.signal.aborted) setBusy(false); } }
		if (controller.signal.aborted || stamp !== version.current) return null;
		return next?.status === "ready" ? drive(next) : next;
	};
	const forget = async id => {
		if (operation.current) return false;
		setError("");
		try { await api.forget(id, life.current.signal); if (!life.current.signal.aborted) { setHistory(items => items.filter(item => item.runId !== id)); setRun(current => current?.runId === id ? null : current); } return true; }
		catch (e) { if (!life.current.signal.aborted) setError(message(e)); return false; }
	};
	const checkAvailability = async () => {
		setAvailable(null); setError("");
		try {
			const result = await api.status(life.current.signal, { initial: true });
			if (!life.current.signal.aborted) { setProvider(['groq', 'gemini'].includes(result.provider) ? result.provider : null); setAvailable(result.available); setConnectionState(result.state || (result.available ? 'ready' : 'unavailable')); }
			if (result.available && signedIn) {
				const items = await api.list(life.current.signal, { initial: true });
				if (!life.current.signal.aborted) setHistory(items);
				if (runId) { const next = await api.get(runId, life.current.signal, { initial: true }); if (!life.current.signal.aborted) accept(next); }
			}
		}
		catch (e) { if (!life.current.signal.aborted) { setAvailable(false); setConnectionState('unavailable'); setError(message(e)); } }
	};
	return { run: runId && run?.runId !== runId ? null : run, history, available, provider, connectionState, error, busy, loading, start, drive, cancel, forget, prepareNotes, researchCatalogue, checkAvailability, pause: () => { paused.current = true; },
		refresh: async () => { if (run) { try { accept(await api.get(run.runId, life.current.signal)); setError(""); } catch (e) { if (!life.current.signal.aborted) setError(message(e)); } } } };
}
