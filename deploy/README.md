Production deployment guide — best-practice setup

Overview
- Serve the compiled frontend as static files via Nginx.
- Run the Node/Express backend under PM2 (production mode) on localhost:4000.
- Use Nginx to proxy `/api` requests to the backend and serve frontend on 80/443.
- Protect traffic with TLS. Recommended: Cloudflare Origin Certificate + Cloudflare SSL set to Full (strict).

Steps (copy-paste on your server)

1) Build frontend

```bash
# from repo root
npm run client:build
```

2) Prepare web root and copy files

```bash
sudo mkdir -p /var/www/hospital
sudo rm -rf /var/www/hospital/*
sudo cp -r client/dist/* /var/www/hospital/
sudo chown -R www-data:www-data /var/www/hospital
```

3) Install Nginx (if not installed)

```bash
sudo apt update
sudo apt install -y nginx
```

4) Place the Nginx config

```bash
# copy deploy/nginx/hospital.conf -> /etc/nginx/sites-available/hospital.conf
sudo cp deploy/nginx/hospital.conf /etc/nginx/sites-available/hospital.conf
sudo ln -s /etc/nginx/sites-available/hospital.conf /etc/nginx/sites-enabled/hospital.conf
sudo nginx -t
sudo systemctl reload nginx
```

5) TLS: Cloudflare Origin Certificate (recommended)
- In Cloudflare Dashboard → SSL/TLS → Origin Server → Create Certificate (RSA or ECDSA).
- Save cert/key files on server, e.g.:
  - `/etc/ssl/certs/hospital_origin.pem`
  - `/etc/ssl/private/hospital_origin.key` (restrict permissions)
- Set Cloudflare SSL to **Full (strict)**

Alternative: use Let's Encrypt and Certbot:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d hospital1000.devready.ng
```

6) Backend with PM2 (production)

```bash
# Build backend into dist (if using TypeScript compiled output)
npm run build

# Start via PM2 using ecosystem file
pm2 start deploy/pm2/ecosystem.config.js --env production
pm2 save
pm2 startup
```

Notes:
- The ecosystem file runs `dist/server.js`. Ensure `npm run build` produces `dist/` and the correct production entry.
- The PM2 ecosystem file now loads `.env` automatically, so your `OLLAMA_API_URL`, `JWT_SECRET`, and admin credentials are injected when the process starts.
- You can also use the helper script `./deploy/pm2/start-prod.sh` to export `.env` and start production safely.

7) Firewall

```bash
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

8) Cloudflare DNS and Settings
- Create an A record for `hospital1000.devready.ng` pointing at your server IP; enable proxy (orange cloud).
- SSL/TLS → set to **Full (strict)**.
- (Optional) Page Rules: disable caching for `*/api/*` and enable Always Online for frontend.
- Purge cache after deploy.
- If using `cloudflared`, use `deploy/cloudflared/config.yml` as the ingress config and ensure API requests for `hospital1000.devready.ng/api/*` route to `http://localhost:4000` while the frontend remains on `http://localhost:3001`.

9) Verify
- Visit: https://hospital1000.devready.ng
- Check `/api/health` returns JSON
- Login using your admin credentials from `.env` (or env variables provided to PM2)

Troubleshooting
- If you see HTML instead of JSON for an API call, inspect Network tab for redirect or proxy mismatch (requests being routed to frontend Nginx root).
- Ensure `location /api/` proxy_pass includes the trailing slash and points to `http://127.0.0.1:4000/api/` to preserve paths.
- Check Nginx error log: `/var/log/nginx/error.log` and access log: `/var/log/nginx/access.log`.

Security recommendations
- Use Cloudflare Origin Certificate + Full (strict) for best security and performance.
- Store secrets as environment variables in PM2 ecosystem or a secrets manager; do not commit `.env` to source control.
- Set appropriate file permissions for certs and web root.

If you want, I can:
- Copy these files into `/etc/nginx/...` and reload Nginx (requires sudo on your server).
- Update the PM2 process using the ecosystem file and set env vars from your `.env`.
Which action should I perform next?

---

Additional security best-practices (recommended):

- Do NOT store production secrets in the repository. Keep `.env` on the server only and add `.env` to `.gitignore` (already present).
- Use Cloudflare Origin Certificates and set Cloudflare SSL mode to **Full (strict)**.
- Rotate `JWT_SECRET` and admin credentials before making the server public.
- Consider creating a real `Admin` user in the database and deprecate env-based admin credentials so credentials can be changed at runtime through the app.

If you want, I can add a small admin-management migration and an endpoint to change admin credentials (it will require a safe migration and credentials migration plan).  