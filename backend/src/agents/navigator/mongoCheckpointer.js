import { BaseCheckpointSaver, WRITES_IDX_MAP, compareWritesSortKeys, writesSortKey } from "@langchain/langgraph-checkpoint";
import { NavigatorError } from "./contracts.js";

/** MongoDB-backed, run-owned checkpointer. Each write is fenced in the SAME run document. */
export class NavigatorMongoCheckpointer extends BaseCheckpointSaver {
	constructor({ store, lease, signal }) { super(); this.store = store; this.lease = lease; this.signal = signal; }
	config(checkpointId) { return { configurable: { thread_id: this.lease.runId, checkpoint_ns: "", ...(checkpointId ? { checkpoint_id: checkpointId } : {}) } }; }
	validate(config) {
		if (this.signal?.aborted) throw new NavigatorError("CANCELLED", "This execution has stopped.");
		if (config.configurable?.thread_id !== this.lease.runId || (config.configurable?.checkpoint_ns ?? "") !== "") throw new NavigatorError("CHECKPOINT_SCOPE", "The checkpoint does not belong to this execution.");
	}
	async encode(value) { const [type, bytes] = await this.serde.dumpsTyped(value); return { type, data: Buffer.from(bytes).toString("base64") }; }
	async decode(value) { return this.serde.loadsTyped(value.type, Buffer.from(value.data, "base64")); }
	async tuple(record) {
		const writes = [...record.writes].sort((a, b) => compareWritesSortKeys(writesSortKey(a.path, a.taskId, a.index), writesSortKey(b.path, b.taskId, b.index)));
		return { config: this.config(record.id), checkpoint: await this.decode(record.checkpoint), metadata: await this.decode(record.metadata),
			...(record.parentId ? { parentConfig: this.config(record.parentId) } : {}),
			pendingWrites: await Promise.all(writes.map(async write => [write.taskId, write.channel, await this.decode(write.value)])) };
	}
	async getTuple(config) {
		this.validate(config);
		const run = await this.store.readLease(this.lease);
		const id = config.configurable?.checkpoint_id;
		const record = id ? run.checkpoints.find(item => item.id === id) : run.checkpoints[0];
		return record ? this.tuple(record) : undefined;
	}
	async *list(config, options = {}) {
		this.validate(config);
		const run = await this.store.readLease(this.lease);
		let records = run.checkpoints;
		if (options.before?.configurable?.checkpoint_id) {
			const position = records.findIndex(record => record.id === options.before.configurable.checkpoint_id);
			records = position < 0 ? [] : records.slice(position + 1);
		}
		for (const record of records.slice(0, Math.min(options.limit ?? 3, 3))) {
			const tuple = await this.tuple(record);
			if (options.filter && Object.entries(options.filter).some(([key, value]) => tuple.metadata?.[key] !== value)) continue;
			yield tuple;
		}
	}
	async put(config, checkpoint, metadata) {
		this.validate(config);
		const [encoded, encodedMetadata] = await Promise.all([this.encode(checkpoint), this.encode(metadata)]);
		const parentId = config.configurable?.checkpoint_id ?? null;
		await this.store.mutate(this.lease, run => {
			this.validate(config);
			const existing = run.checkpoints.find(record => record.id === checkpoint.id);
			if (existing) {
				if (existing.checkpoint.data !== encoded.data) throw new NavigatorError("CHECKPOINT_CONFLICT", "A checkpoint cannot be overwritten with different state.");
				return { checkpoints: run.checkpoints };
			}
			if ((run.checkpoints[0]?.id ?? null) !== parentId) throw new NavigatorError("CHECKPOINT_CONFLICT", "The graph must advance from its current checkpoint.");
			const record = { id: checkpoint.id, parentId, checkpoint: encoded, metadata: encodedMetadata,
				writes: run.pendingCheckpointWrites.find(item => item.id === checkpoint.id)?.writes ?? [] };
			// Latest state plus two predecessors; no unbounded history or delta channels.
			return { checkpoints: [record, ...run.checkpoints].slice(0, 3), pendingCheckpointWrites: run.pendingCheckpointWrites.filter(item => item.id !== checkpoint.id),
				collectedPassageCount: checkpoint.channel_values?.session?.context?.passages?.length ?? 0 };
		});
		return this.config(checkpoint.id);
	}
	async putWrites(config, writes, taskId, taskPath = "") {
		this.validate(config);
		const values = await Promise.all(writes.map(async ([channel, value], index) => ({ taskId, channel, index: WRITES_IDX_MAP[channel] ?? index, path: taskPath, value: await this.encode(value) })));
		await this.store.mutate(this.lease, run => {
			this.validate(config);
			const id = config.configurable?.checkpoint_id;
			if (!id) throw new NavigatorError("CHECKPOINT_CONFLICT", "A checkpoint ID is required for pending writes.");
			let record = run.checkpoints.find(item => item.id === id) ?? run.pendingCheckpointWrites.find(item => item.id === id);
			// LangGraph can persist task writes before put() creates their checkpoint.
			// Buffer these in the same fenced document; acquire discards uncommitted
			// buffers from a previous worker, while retained checkpoint writes survive.
			if (!record) {
				if (run.pendingCheckpointWrites.length >= 3) throw new NavigatorError("CHECKPOINT_LIMIT", "Too many uncommitted checkpoints.");
				record = { id, writes: [] }; run.pendingCheckpointWrites.push(record);
			}
			for (const value of values) {
				const index = record.writes.findIndex(write => write.taskId === value.taskId && write.index === value.index);
				if (index < 0) record.writes.push(value);
				else if (value.index < 0) record.writes[index] = value;
			}
			if (record.writes.length > 64) throw new NavigatorError("CHECKPOINT_LIMIT", "Too many pending checkpoint writes.");
			return { checkpoints: run.checkpoints, pendingCheckpointWrites: run.pendingCheckpointWrites };
		});
	}
	async deleteThread(threadId) {
		this.validate({ configurable: { thread_id: threadId } });
		await this.store.mutate(this.lease, () => ({ checkpoints: [], pendingCheckpointWrites: [] }));
	}
}
