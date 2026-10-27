import express from "express";
import { z } from "zod";
import { protect } from "../../middlewares/authMiddleware.js";
import { NavigatorError } from "./contracts.js";
import { parseContract, advanceRunSchema, runIdSchema } from "./durableContracts.js";

const advanceBody = advanceRunSchema.omit({ runId: true });
const statuses = { RUN_NOT_FOUND: 404, INVALID_RUN_INPUT: 400, INVALID_CLARIFICATION: 400, RUN_CONFLICT: 409, ACTIVE_RUN_EXISTS: 409,
	IDEMPOTENCY_CONFLICT: 409, RUN_FINISHED: 409, MODEL_CHANGED: 409, CLARIFICATION_REQUIRED: 409, LEASE_LOST: 409, NO_COLLECTED_EVIDENCE: 409, REQUEST_LIMIT: 429 };

/** No body-supplied owner IDs, model switches, URLs or arbitrary tool execution. */
export function createNavigatorRouter({ getRuntime, getReadiness, authenticate = protect }) {
	const router = express.Router();
	const readiness = () => { const runtime = getRuntime(), available = Boolean(runtime?.service && runtime.ready()); return getReadiness?.() ?? { available, state: available ? 'ready' : 'unavailable', retryable: false, retentionDays: 7 }; };
	const unavailable = () => {
		const ready = readiness(), runtime = getRuntime();
		if (ready.available && runtime?.service && runtime.ready()) return null;
		if (ready.state === 'initializing') return new NavigatorError('NAVIGATOR_INITIALIZING', 'Research is starting. Saved investigations will be available when initialization finishes.', { retryAfterSeconds: 1 });
		if (ready.state === 'failed') return new NavigatorError('NAVIGATOR_INITIALIZATION_FAILED', 'Research could not initialize. The backend configuration or database needs attention.');
		if (ready.state === 'disabled') return new NavigatorError('NAVIGATOR_DISABLED', 'Research is disabled in this deployment.');
		return new NavigatorError('NAVIGATOR_UNAVAILABLE', 'Research is temporarily unavailable. Your saved progress can be opened when it returns.');
	};
	router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
	router.get("/status", (req, res) => {
		res.json(readiness());
	});
	// Authentication reads MongoDB too. Gate startup before invoking it, and check
	// readiness again after authentication in case the connection was lost.
	router.use((req, res, next) => { const error = unavailable(); if (!error) return next(); if (error.retryAfterSeconds != null) res.set('Retry-After', String(error.retryAfterSeconds)); res.status(503).json({ error: { code: error.code, message: error.message } }); });
	router.use(authenticate);
	router.use(express.json({ limit: "12kb" }));
	const handle = (kind, action) => async (req, res) => {
		try {
			const runtime = getRuntime();
			const unavailableError = unavailable(); if (unavailableError) throw unavailableError;
			const ownerId = String(req.user._id);
			await runtime.store.consumeRequest(ownerId, kind);
			await action(req, res, runtime.service, ownerId);
		} catch (error) {
			if (res.destroyed || res.headersSent) return;
			const known = error instanceof NavigatorError;
			if (known && error.retryAfterSeconds != null) res.set("Retry-After", String(error.retryAfterSeconds));
			res.status(known ? statuses[error.code] ?? 503 : 503).json({ error: { code: known ? error.code : "NAVIGATOR_UNAVAILABLE",
				message: known ? error.message : "Research is temporarily unavailable. Try again later." } });
		}
	};
	router.get("/runs", handle("read", async (req, res, service, owner) => res.json({ runs: await service.list(owner) })));
	router.post("/runs", handle("start", async (req, res, service, owner) => res.status(201).json({ run: await service.start(owner, req.body) })));
	router.get("/runs/:runId", handle("read", async (req, res, service, owner) => res.json({ run: await service.get(owner, req.params.runId) })));
	router.post("/runs/:runId/advance", handle("write", async (req, res, service, owner) => {
		const body = parseContract(advanceBody, req.body), runId = parseContract(runIdSchema, req.params.runId);
		const controller = new AbortController();
		const disconnect = () => { if (!res.writableEnded) controller.abort(); };
		res.once("close", disconnect);
		try { const run = await service.advance(owner, { ...body, runId }, { signal: controller.signal }); if (!res.destroyed) res.json({ run }); }
		finally { res.removeListener("close", disconnect); }
	}));
	router.post("/runs/:runId/notes", handle("write", async (req, res, service, owner) => {
		const body = parseContract(advanceBody.omit({ clarification: true }), req.body), runId = parseContract(runIdSchema, req.params.runId);
		const controller = new AbortController();
		const disconnect = () => { if (!res.writableEnded) controller.abort(); };
		res.once("close", disconnect);
		try { const run = await service.prepareNotes(owner, { ...body, runId }, { signal: controller.signal }); if (!res.destroyed) res.json({ run }); }
		finally { res.removeListener("close", disconnect); }
	}));
	router.post("/runs/:runId/cancel", handle("write", async (req, res, service, owner) => {
		parseContract(z.strictObject({}), req.body ?? {});
		res.json({ run: await service.cancel(owner, req.params.runId) });
	}));
	router.post("/runs/:runId/catalogue", handle("write", async (req, res, service, owner) => {
		const body = parseContract(advanceBody.omit({ clarification: true }), req.body), runId = parseContract(runIdSchema, req.params.runId);
		const controller = new AbortController();
		const disconnect = () => { if (!res.writableEnded) controller.abort(); };
		res.once("close", disconnect);
		try { const run = await service.researchCatalogue(owner, { ...body, runId }, { signal: controller.signal }); if (!res.destroyed) res.json({ run }); }
		finally { res.removeListener("close", disconnect); }
	}));
	router.delete("/runs/:runId", handle("write", async (req, res, service, owner) => { await service.forget(owner, req.params.runId); res.status(204).end(); }));
	// Parser errors can carry request bodies. Never forward or log them in the global handler.
	router.use((error, req, res, next) => { res.status(error.status === 413 ? 413 : 400).json({ error: { code: "INVALID_RUN_INPUT", message: "Use a valid JSON research request under 12 KB." } }); });
	return router;
}
