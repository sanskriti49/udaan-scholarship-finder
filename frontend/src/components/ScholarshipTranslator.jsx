import { useState, useId, useRef, useEffect } from "react";
import { Languages, ChevronDown, LoaderCircle, ExternalLink } from "lucide-react";
import { SUPPORTED_LANGUAGES, getLanguageName, getTranslationLink, getTranslationErrorMessage } from "../utils/translator";
import { translateScholarshipTitle } from "../services/scholarshipService";
import "./scholarship-translator.css";

export default function ScholarshipTranslator(props) {
	if (!props.title?.trim()) return null;
	return <TitleTranslation key={JSON.stringify([props.scholarshipId, props.title])} {...props} />;
}

function TitleTranslation({ title, scholarshipId, compact = false, className = "" }) {
	const [open, setOpen] = useState(false);
	const [target, setTarget] = useState("en");
	const [source, setSource] = useState("auto");
	const [state, setState] = useState({ status: "idle" });
	const controllerRef = useRef(null);
	const id = useId();
	useEffect(() => () => controllerRef.current?.abort(), []);

	async function translate(targetLanguage = target, sourceLanguage = source) {
		controllerRef.current?.abort();
		const controller = new AbortController();
		controllerRef.current = controller;
		setState({ status: "loading" });
		try {
			const result = await translateScholarshipTitle({ scholarshipId, title, targetLanguage, sourceLanguage, signal: controller.signal });
			if (!controller.signal.aborted) setState({ status: "ready", result });
		} catch (error) {
			if (!controller.signal.aborted) setState({ status: "error", message: getTranslationErrorMessage(error) });
		}
	}

	function toggle() {
		if (open) { controllerRef.current?.abort(); setOpen(false); }
		else { setOpen(true); if (state.status !== "ready") translate(); }
	}

	const result = state.result;
	return <div className={`sch-translation ${compact ? "is-compact" : ""} ${className}`}>
		<button type="button" className="sch-translation-toggle" aria-expanded={open} aria-controls={`${id}-panel`} onClick={toggle}>
			<Languages size={14} aria-hidden="true" /> Translate title <ChevronDown size={12} aria-hidden="true" className={open ? "is-open" : ""} />
		</button>
		{open && <section id={`${id}-panel`} className="sch-translation-panel" aria-label="Title translation">
			<div className="sch-translation-controls">
				<label htmlFor={`${id}-target`}>Read in</label>
				<select id={`${id}-target`} value={target} onChange={event => { setTarget(event.target.value); translate(event.target.value, source); }}>
					{SUPPORTED_LANGUAGES.map(language => <option key={language.code} value={language.code}>{language.native === language.name ? language.name : `${language.name} · ${language.native}`}</option>)}
				</select>
			</div>
			<div aria-live="polite" aria-atomic="true" className="sch-translation-result" aria-busy={state.status === "loading"}>
				{state.status === "loading" && <p className="sch-translation-note"><LoaderCircle size={14} className="animate-spin" aria-hidden="true" /> Translating title…</p>}
				{state.status === "ready" && <>
					<p className="sch-translation-label">{result.status === "same-language" ? `Already in ${getLanguageName(target)}` : `Machine translation · ${getLanguageName(target)}`}</p>
					<p className="sch-translated-title" lang={target} dir="auto">{result.translatedText}</p>
					{result.status === "unchanged" && <p className="sch-translation-note">The service returned the same wording. Proper names may stay unchanged.</p>}
					<p className="sch-translation-note">{source === "auto" ? `Detected: ${getLanguageName(result.sourceLanguage)}` : `Source: ${getLanguageName(source)}`}. Check the original title when applying.</p>
				</>}
			</div>
			{state.status === "error" && <div role="alert" className="sch-translation-error"><p>{state.message}</p><button type="button" onClick={() => translate()}>Try again</button></div>}
			<details className="sch-translation-source">
				<summary>Choose the source language</summary>
				<label htmlFor={`${id}-source`}>Source language</label>
				<select id={`${id}-source`} value={source} onChange={event => { setSource(event.target.value); translate(target, event.target.value); }}>
					<option value="auto">Detect automatically</option>
					{SUPPORTED_LANGUAGES.map(language => <option key={language.code} value={language.code}>{language.name}</option>)}
				</select>
				<p className="sch-translation-note">Short or Romanized names can be ambiguous. Choose a source language if detection is wrong.</p>
			</details>
			<p className="sch-translation-note">Only the public scholarship title is sent to Google Translate when you use this control.</p>
			{state.status === "error" && <a className="sch-translation-external" href={getTranslationLink(title, target, source)} target="_blank" rel="noopener noreferrer">Open in Google Translate <ExternalLink size={12} aria-hidden="true" /></a>}
		</section>}
	</div>;
}
