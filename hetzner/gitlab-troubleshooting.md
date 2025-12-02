# GitLab Let's Encrypt Troubleshooting Guide

## Issue: Let's Encrypt validation failing with 404 error

The error indicates that Let's Encrypt cannot access the ACME challenge file at:
`http://dev.reqtec.com/.well-known/acme-challenge/[token]`

## Step-by-Step Troubleshooting

### 1. Verify DNS Resolution

Check if DNS is resolving correctly:

```bash
# From your local machine
dig dev.reqtec.com +short
# Should return: 5.78.41.66

# Or use nslookup
nslookup dev.reqtec.com
# Should return: 5.78.41.66
```

### 2. Check Port 80 Accessibility

Verify that port 80 is accessible from the internet:

```bash
# From your local machine
curl -I http://dev.reqtec.com
# Should return HTTP headers, not a connection error

# Or test from the server itself
curl -I http://localhost
```

### 3. Check Hetzner Firewall

Hetzner Cloud has a firewall that might be blocking port 80. Check:

1. Go to Hetzner Cloud Console → Your Server → Firewalls
2. Ensure port 80 (HTTP) is allowed from `0.0.0.0/0` (all IPs)
3. Ensure port 443 (HTTPS) is allowed from `0.0.0.0/0`

Or via CLI:
```bash
# List firewall rules
hcloud firewall list

# Check if your server has a firewall attached
hcloud server describe <your-server-name>
```

### 4. Verify GitLab Configuration

SSH into your GitLab server and check the configuration:

```bash
# Check external_url setting
sudo grep external_url /etc/gitlab/gitlab.rb

# It should be:
# external_url 'https://dev.reqtec.com'

# If it's set to http://, change it to https://
sudo nano /etc/gitlab/gitlab.rb
# Change: external_url 'http://dev.reqtec.com'
# To:     external_url 'https://dev.reqtec.com'
```

### 5. Check GitLab Nginx Status

Verify that GitLab's nginx is running and listening on port 80:

```bash
# Check if nginx is running
sudo gitlab-ctl status nginx

# Check what ports are listening
sudo netstat -tlnp | grep :80
# or
sudo ss -tlnp | grep :80

# Should show nginx listening on 0.0.0.0:80
```

### 6. Verify Cloudflare Settings

Ensure Cloudflare is NOT proxying (should be grey cloud, not orange):

1. Go to Cloudflare Dashboard → DNS
2. Find the `dev` A record for `reqtec.com`
3. Ensure the proxy status is OFF (grey cloud icon)
4. If it's ON (orange cloud), turn it off

### 7. Test ACME Challenge Path Manually

Try accessing the challenge path directly:

```bash
# From your local machine
curl http://dev.reqtec.com/.well-known/acme-challenge/test

# Or check if the directory exists on the server
ssh into your server and run:
ls -la /var/opt/gitlab/nginx/www/.well-known/acme-challenge/
```

### 8. Check GitLab Logs

Review GitLab logs for more details:

```bash
sudo gitlab-ctl tail nginx
# Look for any errors related to ACME challenges
```

## Common Solutions

### Solution 1: Open Port 80 in Hetzner Firewall

If port 80 is blocked:

1. Hetzner Console → Your Server → Firewalls
2. Create or edit firewall rules:
   - Allow TCP port 80 from 0.0.0.0/0
   - Allow TCP port 443 from 0.0.0.0/0
3. Apply firewall to your server

### Solution 2: Ensure DNS is Not Proxied

If Cloudflare is proxying (orange cloud):
- Turn off proxying for the `dev` A record
- Wait for DNS propagation (can take a few minutes)
- Try `gitlab-ctl reconfigure` again

### Solution 3: Manual Certificate Setup

If automatic Let's Encrypt continues to fail, you can manually configure:

```bash
# Edit GitLab config
sudo nano /etc/gitlab/gitlab.rb

# Add these lines:
letsencrypt['enable'] = true
letsencrypt['contact_emails'] = ['your-email@example.com']
letsencrypt['auto_renew'] = true
letsencrypt['auto_renew_hour'] = 0
letsencrypt['auto_renew_minute'] = 0
letsencrypt['auto_renew_day_of_month'] = "*/4"

# Reconfigure
sudo gitlab-ctl reconfigure
```

### Solution 4: Use HTTP-01 Challenge Instead

If DNS-01 challenge is failing, ensure HTTP-01 is enabled:

```bash
sudo nano /etc/gitlab/gitlab.rb

# Ensure this is set:
letsencrypt['enable'] = true
nginx['redirect_http_to_https'] = false  # Important: must be false during setup

# Reconfigure
sudo gitlab-ctl reconfigure
```

## After Fixing

Once you've resolved the issue:

1. Run `sudo gitlab-ctl reconfigure` again
2. Wait for the certificate to be issued
3. Verify SSL certificate:
   ```bash
   curl -I https://dev.reqtec.com
   ```
4. Check certificate details:
   ```bash
   echo | openssl s_client -servername dev.reqtec.com -connect dev.reqtec.com:443 2>/dev/null | openssl x509 -noout -dates
   ```

## Additional Resources

- [GitLab Let's Encrypt Documentation](https://docs.gitlab.com/omnibus/settings/ssl.html#lets-encrypt-integration)
- [Hetzner Firewall Documentation](https://docs.hetzner.com/cloud/firewalls/)
- [Cloudflare DNS Settings](https://developers.cloudflare.com/dns/manage-dns-records/)

