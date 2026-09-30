/**
 * Utilities for cross-component bookmark state synchronization
 * and post-authentication intent fulfillment.
 */

const PENDING_BOOKMARK_KEY = "udaan_pending_bookmark";
const BOOKMARKS_CHANGED_EVENT = "udaan_bookmarks_changed";

export function getPendingBookmark() {
	try {
		return sessionStorage.getItem(PENDING_BOOKMARK_KEY) || null;
	} catch (_) {
		return null;
	}
}

export function setPendingBookmark(scholarshipId) {
	try {
		if (scholarshipId) {
			sessionStorage.setItem(PENDING_BOOKMARK_KEY, String(scholarshipId));
		}
	} catch (_) {}
}

export function clearPendingBookmark() {
	try {
		sessionStorage.removeItem(PENDING_BOOKMARK_KEY);
	} catch (_) {}
}

/**
 * Broadcasts a bookmark change to all components and pages listening
 */
export function emitBookmarkChanged(scholarshipId, isBookmarked) {
	try {
		const event = new CustomEvent(BOOKMARKS_CHANGED_EVENT, {
			detail: {
				scholarshipId: String(scholarshipId),
				isBookmarked: Boolean(isBookmarked),
			},
		});
		window.dispatchEvent(event);
	} catch (_) {}
}

/**
 * Subscribes a listener to global bookmark changes
 */
export function onBookmarkChanged(callback) {
	const handler = (event) => {
		if (event?.detail && typeof callback === "function") {
			callback(event.detail);
		}
	};
	window.addEventListener(BOOKMARKS_CHANGED_EVENT, handler);
	return () => window.removeEventListener(BOOKMARKS_CHANGED_EVENT, handler);
}

/**
 * Fulfills any pending bookmark intent queued before authentication
 * and redirects the user back to their original page context.
 */
export async function fulfillPendingBookmarkAndRedirect(navigate, toggleBookmarkFn, toastFn) {
	const params = new URLSearchParams(window.location.search);
	const rawRedirect = params.get("redirect");
	const redirectUrl = rawRedirect ? decodeURIComponent(rawRedirect) : "/";

	const pendingId = getPendingBookmark();
	if (pendingId) {
		clearPendingBookmark();
		if (typeof toggleBookmarkFn === "function") {
			try {
				await toggleBookmarkFn(pendingId);
				emitBookmarkChanged(pendingId, true);
				if (toastFn?.success) {
					toastFn.success("Scholarship saved to your bookmarks!");
				}
			} catch (err) {
				console.warn("[Bookmark] Could not auto-save pending scholarship:", err.message);
			}
		}
	}

	navigate(redirectUrl, { replace: true });
}
