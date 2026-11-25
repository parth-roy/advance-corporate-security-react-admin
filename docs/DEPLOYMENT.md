# ACS Admin Deployment Guide (`admin.advancecorporatesecurity.com`)

ACS Admin runs on the **same DigitalOcean Droplet** alongside `acs-web` (port `3000`) and `acs-backend` (port `4000`).

- **Production app (`main` branch):** `/var/www/acs-admin` — PM2 process `acs-admin` on port **`7967`**
- **Staging app (`test` branch):** `/var/www/test-acs-admin` — PM2 process `test-acs-admin` on port **`7968`**
- **Domain:** `https://admin.advancecorporatesecurity.com`
- **Backend API:** `https://api.advancecorporatesecurity.com/api/admin` (or local Droplet backend on port `4000`)

---

## 1. DNS Configuration

Add the following DNS record in your DNS provider (e.g., Cloudflare / DigitalOcean DNS / GoDaddy) for `advancecorporatesecurity.com`:

| Type | Name / Host | Value / Target | TTL | Proxy (if Cloudflare) |
| :--- | :--- | :--- | :--- | :--- |
| `A` | `admin` | `<YOUR_DROPLET_PUBLIC_IP>` | Auto / 300s | Proxied (Full Strict SSL) or DNS Only (for Certbot first run) |
| `A` *(optional staging)* | `test-admin` | `<YOUR_DROPLET_PUBLIC_IP>` | Auto / 300s | DNS Only / Proxied |

Verify DNS propagation before running Certbot:

```sh
dig +short admin.advancecorporatesecurity.com A
```

---

## 2. Initial Droplet Setup (One-Time)

SSH into the DigitalOcean Droplet and clone/build the repo:

```sh
# Load nvm / Node >= 22
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

sudo mkdir -p /var/www/acs-admin /var/log/pm2
sudo chown -R $USER:$USER /var/www/acs-admin /var/log/pm2

git clone https://github.com/parth-roy/advance-corporate-security-react-admin.git /var/www/acs-admin
cd /var/www/acs-admin
npm install
npm run build

pm2 start ecosystem.config.cjs --only acs-admin
pm2 save
```

Verify the Nitro server responds locally on port `7967`:

```sh
curl -I http://127.0.0.1:7967/
```

---

## 3. Nginx & SSL Setup

Copy the included Nginx configuration ([deploy/nginx/admin.advancecorporatesecurity.com.conf](../deploy/nginx/admin.advancecorporatesecurity.com.conf)) and enable HTTPS with Certbot:

```sh
sudo cp /var/www/acs-admin/deploy/nginx/admin.advancecorporatesecurity.com.conf /etc/nginx/sites-available/admin.advancecorporatesecurity.com
sudo ln -sf /etc/nginx/sites-available/admin.advancecorporatesecurity.com /etc/nginx/sites-enabled/admin.advancecorporatesecurity.com

sudo nginx -t
sudo systemctl reload nginx

# Issue Let's Encrypt TLS certificate and auto-configure HTTPS redirect
sudo certbot --nginx -d admin.advancecorporatesecurity.com
```

---

## 4. GitHub Actions Secrets

In **GitHub → `parth-roy/advance-corporate-security-react-admin` → Settings → Secrets and variables → Actions**, add the same Droplet secrets used by `acs-web` and `acs-backend`:

- `SERVER_HOST`
- `SSH_USERNAME`
- `SSH_PRIVATE_KEY`
- `SSH_PASSPHRASE` *(if your SSH key has a passphrase)*

Workflows:
- [.github/workflows/deploy.yml](../.github/workflows/deploy.yml) deploys `main` → `/var/www/acs-admin` (PM2 `acs-admin`, port `7967`).
- [.github/workflows/deploy-test.yml](../.github/workflows/deploy-test.yml) deploys `test` → `/var/www/test-acs-admin` (PM2 `test-acs-admin`, port `7968`).
