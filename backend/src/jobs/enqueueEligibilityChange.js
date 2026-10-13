export async function enqueueEligibilityJob(data, { queue, available }) {
	if (!available()) return null;
	const jobId = `eligibility_${data.scholarshipId}_${data.currentVersionId}`;
	const existing = await queue.getJob(jobId);
	if (existing) {
		const state = await existing.getState();
		if (state === "failed") await existing.retry("failed", { resetAttemptsMade: true });
		return existing;
	}
	return queue.add("handleEligibilityChangeAlert", data, { jobId, attempts: 5,
		backoff: { type: "exponential", delay: 5000 }, removeOnComplete: { age: 86400, count: 1000 } });
}
