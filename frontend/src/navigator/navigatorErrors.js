export function navigatorErrorMessage(error) {
  const code = error.response?.data?.error?.code;
  if (code === 'NAVIGATOR_INITIALIZING' || code === 'DATABASE_INITIALIZING') return 'Udaan is reconnecting. Your question can stay here while it gets ready.';
  if (['NAVIGATOR_INITIALIZATION_FAILED', 'DATABASE_UNAVAILABLE', 'NAVIGATOR_UNAVAILABLE'].includes(code)) return 'Research is unavailable right now. Your saved questions have not been deleted. Check availability again in a moment.';
  if (code === 'NAVIGATOR_DISABLED') return 'Research is not enabled here. You can still browse scholarships when the catalogue is available.';
  if (error.code === 'ECONNABORTED') return 'This is taking longer than expected. Check saved progress before continuing.';
  if (error.message?.startsWith('The server returned an unsupported research result.')) return 'The saved result could not be opened safely. Refresh saved progress before continuing.';
  if (error.message === 'This investigation link is invalid.') return 'This research link is invalid. Open a saved search or start with a new question.';
  if (!error.response) return 'We cannot reach Udaan right now. Keep this page open to retain your question, check your connection, then try again.';
  return error.response?.data?.error?.message || 'We could not open research. Please try again shortly.';
}
