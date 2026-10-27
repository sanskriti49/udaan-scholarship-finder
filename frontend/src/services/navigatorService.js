import api from "./api";
import { parseRun, validRunId } from "../navigator/contracts";
import { initialNavigatorRead } from './navigatorReadiness';
import { ADVANCE_REQUEST_TIMEOUT_MS } from './navigatorTiming.js';

const path = id => { if (!validRunId(id)) throw new Error("This investigation link is invalid."); return `/navigator/runs/${id}`; };
const options = signal => ({ signal, timeout: 50000 });
const readOptions = signal => ({ signal, timeout: 8000 });
const read = (get, signal, initial) => initial ? initialNavigatorRead(get, signal) : get();
export const navigatorService = {
	async status(signal, { initial = false } = {}) { return read(async () => { const { data } = await api.get("/navigator/status", readOptions(signal)); if (typeof data?.available !== "boolean") throw new Error("Research availability could not be checked."); return data; }, signal, initial); },
	async list(signal, { initial = false } = {}) { return read(async () => { const { data } = await api.get("/navigator/runs", readOptions(signal)); if (!Array.isArray(data?.runs) || data.runs.length > 12) throw new Error("Saved investigations could not be read."); return data.runs.map(parseRun); }, signal, initial); },
	async start(input, signal) { return parseRun((await api.post("/navigator/runs", input, options(signal))).data.run); },
	async get(id, signal, { initial = false } = {}) { return read(async () => parseRun((await api.get(path(id), readOptions(signal))).data.run), signal, initial); },
	async advance(run, clarification, signal) { return parseRun((await api.post(`${path(run.runId)}/advance`, { revision: run.revision, ...(clarification ? { clarification } : {}) }, { ...options(signal), timeout: ADVANCE_REQUEST_TIMEOUT_MS })).data.run); },
	async prepareNotes(run, signal) { return parseRun((await api.post(`${path(run.runId)}/notes`, { revision: run.revision }, options(signal))).data.run); },
	async researchCatalogue(run, signal) { return parseRun((await api.post(`${path(run.runId)}/catalogue`, { revision: run.revision }, options(signal))).data.run); },
	async cancel(id, signal) { return parseRun((await api.post(`${path(id)}/cancel`, {}, options(signal))).data.run); },
	async forget(id, signal) { await api.delete(path(id), options(signal)); },
};
