/** Register before API throttling/authentication. Probes are read-only, avoid
 * Redis and database queries, and must never be cached as a healthy response. */
export function registerHealthRoutes(app, getStatus) {
  app.get(['/health', '/api/health'], (req, res) => {
    const health = getStatus();
    res.set('Cache-Control', 'no-store');
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  });
}
