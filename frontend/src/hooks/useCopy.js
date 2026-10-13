import { useState } from "react";

export function useCopy() {
	const [copied, setCopied] = useState(null);
	const copy = async (key, value) => {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(key);
			setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
			return true;
		} catch {
			return false;
		}
	};
	return [copied, copy];
}
