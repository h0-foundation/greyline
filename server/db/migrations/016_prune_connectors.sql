-- Prune orphaned connectors. `gdelt` had a client but zero callers; `ip-api` was
-- HTTP-only on the free tier (a plaintext-IP leak) and already removed from the
-- UI. Drop their toggle rows so the connections list is honest. Idempotent.
DELETE FROM api_toggles WHERE api_id IN ('gdelt', 'ip-api');
