import { useEffect, useRef } from "react";

const dialogs = [];
const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]';

// Only the top dialog owns focus when a sign-in prompt opens over a file.
export default function useDialogFocus(open, returnFocusRef) {
	const ref = useRef(null);
	useEffect(() => {
		if (!open || !ref.current) return;
		const panel = ref.current;
		const previous = document.activeElement;
		const fallbackFocus = returnFocusRef?.current;
		dialogs.push(panel);
		const controls = () => [...panel.querySelectorAll(focusableSelector)].filter((el) => el.getClientRects().length);
		const focusFirst = () => (controls()[0] || panel).focus({ preventScroll: true });
		focusFirst();
		const onKey = (event) => {
			if (dialogs.at(-1) !== panel || event.key !== "Tab") return;
			const items = controls();
			const first = items[0];
			const last = items.at(-1);
			if (!first) {
				event.preventDefault();
				panel.focus();
			} else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		};
		const onFocus = (event) => {
			if (dialogs.at(-1) === panel && !panel.contains(event.target)) focusFirst();
		};
		document.addEventListener("keydown", onKey);
		document.addEventListener("focusin", onFocus);
		return () => {
			dialogs.splice(dialogs.indexOf(panel), 1);
			document.removeEventListener("keydown", onKey);
			document.removeEventListener("focusin", onFocus);
			const restore = previous?.isConnected ? previous : fallbackFocus;
			if (restore?.isConnected) restore.focus({ preventScroll: true });
		};
	}, [open, returnFocusRef]);
	return ref;
}
