/**
 * Auth middleware — stub ready for Auth0 activation at deployment
 *
 * TO ACTIVATE Auth0:
 * 1. npm install express-oauth2-jwt-bearer
 * 2. Set in .env:
 *      AUTH0_DOMAIN=your-tenant.auth0.com
 *      AUTH0_AUDIENCE=https://your-api-identifier
 *      AUTH_ENABLED=true
 *
 * Machine-to-machine (agent) access:
 * - Set HEYBUDDY_API_KEY in .env on the server
 * - Caller sends header: X-HeyBuddy-Key: <key>
 * - Works regardless of AUTH_ENABLED — always checked first
 */

// import { auth } from 'express-oauth2-jwt-bearer'  // uncomment at activation

const AUTH_ENABLED = process.env.AUTH_ENABLED === 'true'
const API_KEY = process.env.HEYBUDDY_API_KEY

// requireAuth: checked on every protected route
// Priority: 1) API key header  2) Auth0 JWT (when enabled)  3) pass-through (dev)
export const requireAuth = (req, res, next) => {
  // 1. Machine-to-machine API key — if header present, validate strictly (no fallthrough)
  const incomingKey = req.headers['x-heybuddy-key']
  if (incomingKey) {
    if (API_KEY && incomingKey === API_KEY) {
      req.user = { sub: req.headers['x-heybuddy-agent-id'] || 'agent', isAgent: true }
      return next()
    }
    return res.status(401).json({ error: 'Invalid API key' })
  }

  // 2. Auth0 JWT (production)
  if (AUTH_ENABLED) {
    // auth({
    //   audience: process.env.AUTH0_AUDIENCE,
    //   issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}`,
    // })(req, res, next)
    //
    // Placeholder until express-oauth2-jwt-bearer is installed:
    console.warn('AUTH_ENABLED=true but auth library not installed — run: npm install express-oauth2-jwt-bearer')
    return res.status(501).json({ error: 'Auth not fully configured. Install express-oauth2-jwt-bearer.' })
  }

  // 3. Pass-through (local dev)
  next()
}

// Optional: extract user identity from verified JWT (for audit logging etc.)
export function getAuthUser(req) {
  if (req.user?.isAgent) return { id: req.user.sub, email: null, isAgent: true }
  if (!AUTH_ENABLED) return { id: 'local-dev', email: 'dev@local' }
  return req.auth?.payload ?? null
}
