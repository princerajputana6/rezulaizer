// Tiny in-memory TTL cache for auth lookups.
// Keyed by JWT (which is unique per session and encodes the userId).
// Trades up to TTL_MS of staleness for ~one round-trip avoided per request.

const TTL_MS = parseInt(process.env.AUTH_CACHE_TTL_MS || '60000', 10);
const MAX_ENTRIES = parseInt(process.env.AUTH_CACHE_MAX || '5000', 10);

const cache = new Map(); // token -> { user, userType, expiresAt }

function get(token) {
  const entry = cache.get(token);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cache.delete(token);
    return null;
  }
  return entry;
}

function set(token, user, userType) {
  if (cache.size >= MAX_ENTRIES) {
    // Drop oldest insertion (Map preserves insertion order)
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(token, { user, userType, expiresAt: Date.now() + TTL_MS });
}

function invalidate(token) {
  if (token) cache.delete(token);
}

function clear() {
  cache.clear();
}

module.exports = { get, set, invalidate, clear, TTL_MS };
