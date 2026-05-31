# SSL/TLS Setup for Production

Your application requires HTTPS. Choose **one** of the following methods:

## Option A: Cloudflare Origin Certificate (Recommended for Cloudflare users)

### Step 1: Create Cloudflare Origin Certificate

1. Log in to Cloudflare Dashboard
2. Select your domain (`devready.ng`)
3. Navigate to **SSL/TLS** → **Origin Server**
4. Click **Create Certificate**
5. Select **RSA** (or ECDSA for newer systems)
6. Add hostnames: `hospital1000.devready.ng` (or leave auto-filled)
7. Copy the certificate and private key into files on your server:

```bash
# Run on your server
sudo mkdir -p /etc/ssl/certs /etc/ssl/private

# Create cert file (paste Cloudflare certificate)
sudo nano /etc/ssl/certs/hospital_origin.pem

# Create key file (paste Cloudflare private key)
sudo nano /etc/ssl/private/hospital_origin.key

# Set proper permissions
sudo chmod 600 /etc/ssl/private/hospital_origin.key
sudo chmod 644 /etc/ssl/certs/hospital_origin.pem
```

### Step 2: Configure Cloudflare SSL/TLS Settings

1. In Cloudflare Dashboard → **SSL/TLS**
2. Set **SSL/TLS encryption mode** to **Full (strict)**
   - This ensures Cloudflare validates your origin certificate
3. Optionally enable:
   - **Always Use HTTPS** (redirect all HTTP to HTTPS)
   - **HSTS** (HTTP Strict Transport Security)

### Step 3: Deploy Nginx Config

```bash
sudo cp deploy/nginx/hospital.conf /etc/nginx/sites-available/hospital.conf
sudo ln -sf /etc/nginx/sites-available/hospital.conf /etc/nginx/sites-enabled/hospital.conf
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: Test
```bash
# Test certificate validity
openssl x509 -in /etc/ssl/certs/hospital_origin.pem -text -noout | head -20

# Reload Nginx
sudo systemctl reload nginx
```

---

## Option B: Let's Encrypt (Free, auto-renewing)

### Step 1: Install Certbot

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

### Step 2: Generate Certificate

```bash
sudo certbot certonly --nginx -d hospital1000.devready.ng
```

This will:
- Generate certificate at `/etc/letsencrypt/live/hospital1000.devready.ng/`
- Output cert and key paths

### Step 3: Update Nginx Config

Update `/etc/nginx/sites-available/hospital.conf` with Let's Encrypt paths:

```nginx
ssl_certificate /etc/letsencrypt/live/hospital1000.devready.ng/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/hospital1000.devready.ng/privkey.pem;
```

Then reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: Set Up Auto-Renewal

```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## Verify Setup

After deploying SSL, test the configuration:

```bash
# Check Nginx syntax
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Test HTTPS connection
curl -v https://hospital1000.devready.ng/
# Should return 200 OK with HTML content

# Test API endpoint
curl -v https://hospital1000.devready.ng/api/health
# Should return JSON: {"status":"ok"}

# Check certificate
echo | openssl s_client -servername hospital1000.devready.ng -connect hospital1000.devready.ng:443 2>/dev/null | openssl x509 -noout -dates
```

---

## Cloudflare DNS Configuration (Step 5)

1. In Cloudflare Dashboard → **DNS**
2. Add/Update A record:
   - **Name:** `hospital1000`
   - **Type:** A
   - **IPv4 address:** `<your-server-ip>`
   - **Proxy status:** Orange cloud (proxied through Cloudflare)
   - **TTL:** Auto

3. Verify Cloudflare SSL/TLS is set to **Full (strict)**

4. (Optional) Enable:
   - **Always Use HTTPS** → Page Rules
   - **Minify CSS/JS** → Speed section
   - **Cache Rules** → bypass cache for `/api/*`

---

## Troubleshooting

### CSS/JS Not Loading
- Check browser DevTools Network tab → verify 200 responses for `.css` and `.js` files
- Verify Nginx is serving correct MIME types (should see `Content-Type: text/css`)
- Clear browser cache (Ctrl+Shift+Delete)

### API Returns HTML Instead of JSON
- Verify `/api/` proxy is configured correctly in Nginx
- Check backend is running: `pm2 status`
- Test directly: `curl http://localhost:4000/api/health`

### Certificate Errors
- Verify certificate path in Nginx config matches actual file
- Check permissions: `sudo ls -la /etc/ssl/certs/ /etc/ssl/private/`
- Restart Nginx: `sudo systemctl restart nginx`
- Check logs: `sudo tail -f /var/log/nginx/error.log`

