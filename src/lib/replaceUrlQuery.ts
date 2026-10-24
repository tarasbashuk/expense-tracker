// Next's native history integration updates useSearchParams without a server navigation.
export function replaceUrlQuery(query: string) {
  const url = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  const state = { ...window.history.state };
  // Passing these private flags back would bypass Next's URL synchronization.
  delete state.__NA;
  delete state._N;

  window.history.replaceState(state, '', url);
}
