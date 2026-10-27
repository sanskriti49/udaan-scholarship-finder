import { INDIAN_STATES, UNION_TERRITORIES } from "../utils/indianStates";

export default function HomeStateSelect({ placeholder = "Not provided", ...props }) {
	return <select {...props}><option value="">{placeholder}</option><optgroup label="States">{INDIAN_STATES.map(state => <option key={state.code} value={state.value}>{state.label}</option>)}</optgroup><optgroup label="Union territories">{UNION_TERRITORIES.map(state => <option key={state.code} value={state.value}>{state.label}</option>)}</optgroup></select>;
}
