import mongoose from "mongoose";

/**
 * Immutable text snapshot of an official document. Evidence quotes point into
 * `text` by character offset. A snapshot is reused (lastSeenAt bumped) when the
 * same URL returns identical text, so evidence offsets stay valid.
 */
const sourceSnapshotSchema = new mongoose.Schema(
	{
		sourceId: { type: String, index: true },
		url: { type: String, required: true },
		finalUrl: String,
		fetchedAt: Date,
		firstSeenAt: Date,
		lastSeenAt: Date,
		httpStatus: Number,
		contentType: String,
		capturedSourceType: String,
		kind: { type: String, enum: ["html", "pdf", "json", "text"] },
		sha256: String,
		textHash: { type: String, required: true },
		byteLength: Number,
		etag: String,
		lastModified: String,
		text: { type: String, required: true },
		pages: [{ _id: false, page: Number, start: Number }],
		quality: mongoose.Schema.Types.Mixed,
		documentDate: mongoose.Schema.Types.Mixed,
		authorityTier: Number,
	},
	{ timestamps: true },
);

sourceSnapshotSchema.index({ url: 1, textHash: 1 }, { unique: true });
sourceSnapshotSchema.index({ url: 1, lastSeenAt: -1 });

export default mongoose.models.SourceSnapshot || mongoose.model("SourceSnapshot", sourceSnapshotSchema);
