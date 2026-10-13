import { useState } from "react";
import { haptic } from "../utils/motionPreferences.js";

export function useActionMicrocopy(copies = []) {
	const [count, setCount] = useState(0);
	const trigger = () => {
		setCount((c) => c + 1);
		haptic(12);
	};
	return {
		count,
		currentCopy: copies[Math.min(count, copies.length - 1)] ?? copies[0],
		trigger,
	};
}

