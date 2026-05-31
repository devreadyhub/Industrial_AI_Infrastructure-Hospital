Cloudflare Checklist — Steps to ensure `/api/*` reaches origin and is not cached

1. DNS
- In Cloudflare Dashboard → DNS, set the A (and/or AAAA) record for `hospital1000.devready.ng` to your server's public IP.
- For testing, set the proxy status to **DNS only** (grey cloud) so the hostname resolves directly to the origin IP.

2. SSL
- If using Cloudflare proxy (orange cloud), set `SSL/TLS` → `Overview` to `Full (strict)`.
- Obtain an origin certificate from Cloudflare (Origin CA) OR install a Let's Encrypt cert on the server.
  - Cloudflare Origin CA is fine when Cloudflare is proxying; it must be installed at `/etc/ssl/certs/hospital_origin.pem` and `/etc/ssl/private/hospital_origin.key` (update nginx accordingly).

3. Cache rules
- Create a Page Rule (Rules → Page Rules):
  - Pattern: `*hospital1000.devready.ng/api/*`
  - Settings: `Cache Level: Bypass`
  - Optionally: `Origin Cache Control: On` and `Edge Cache TTL: Respect Existing Headers`
- Alternatively, create a Cloudflare Transform Rule / Cache rule to bypass for paths starting with `/api/`.
- Purge Cloudflare cache after changes (Caching → Purge → Purge Everything).

4. Firewall / Access
- Optionally restrict origin to Cloudflare IPs (see `scripts/lock_origin_to_cloudflare.sh`).

5. Verification
- While DNS is `DNS only`, run `scripts/verify_public.sh` locally on the server to confirm origin returns JSON.
- After enabling proxying (if desired), run the same check from an external machine.

6. Notes
- If Cloudflare returns HTML for `/api/*`, it either served a cached `index.html` or a Cloudflare Worker/Page Rule is rewriting the path. Ensure no Worker/Page Rule rewrites API paths to the SPA.
- If you cannot change Cloudflare, use a direct-origin `VITE_API_URL` (e.g., `https://<origin-ip>/api`) in the frontend build as a temporary workaround.
