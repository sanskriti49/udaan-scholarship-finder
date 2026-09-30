import { useEffect } from "react";

let lockCount = 0;

export function lockBodyScroll() {
	if (typeof document === "undefined") return;
	if (lockCount === 0) {
		document.body.style.overflow = "hidden";
	}
	lockCount++;
}

export function unlockBodyScroll() {
	if (typeof document === "undefined") return;
	lockCount = Math.max(0, lockCount - 1);
	if (lockCount === 0) {
		document.body.style.removeProperty("overflow");
	}
}

export function forceUnlockBodyScroll() {
	if (typeof document === "undefined") return;
	lockCount = 0;
	document.body.style.removeProperty("overflow");
}

export default function useBodyScrollLock(isLocked) {
	useEffect(() => {
		if (!isLocked) return;
		lockBodyScroll();
		return () => {
			unlockBodyScroll();
		};
	}, [isLocked]);
}
