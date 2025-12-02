#!/bin/bash
# GitLab Let's Encrypt Diagnostic Script
# Run this script on your GitLab server to diagnose ACME challenge issues

echo "=========================================="
echo "GitLab Let's Encrypt Diagnostic Script"
echo "=========================================="
echo ""

DOMAIN="dev.reqtec.com"
EXPECTED_IP="5.78.41.66"

echo "1. Checking DNS Resolution..."
RESOLVED_IP=$(dig +short $DOMAIN | head -n1)
if [ "$RESOLVED_IP" = "$EXPECTED_IP" ]; then
    echo "   ✓ DNS resolves correctly: $DOMAIN -> $RESOLVED_IP"
else
    echo "   ✗ DNS mismatch! Expected: $EXPECTED_IP, Got: $RESOLVED_IP"
    echo "   This could cause Let's Encrypt validation to fail."
fi
echo ""

echo "2. Checking Port 80 Accessibility..."
HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://$DOMAIN)
if [ "$HTTP_RESPONSE" = "200" ] || [ "$HTTP_RESPONSE" = "301" ] || [ "$HTTP_RESPONSE" = "302" ]; then
    echo "   ✓ Port 80 is accessible (HTTP $HTTP_RESPONSE)"
else
    echo "   ✗ Port 80 not accessible (HTTP $HTTP_RESPONSE)"
    echo "   Check Hetzner firewall rules and ensure port 80 is open."
fi
echo ""

echo "3. Checking Local Port 80 Listener..."
if netstat -tlnp 2>/dev/null | grep -q ":80 "; then
    echo "   ✓ Port 80 is listening locally"
    netstat -tlnp 2>/dev/null | grep ":80 " | head -n1
else
    echo "   ✗ Port 80 is not listening locally"
    echo "   GitLab nginx may not be running or configured correctly."
fi
echo ""

echo "4. Checking GitLab Nginx Status..."
if sudo gitlab-ctl status nginx 2>/dev/null | grep -q "run: nginx"; then
    echo "   ✓ GitLab nginx is running"
else
    echo "   ✗ GitLab nginx is not running"
    echo "   Run: sudo gitlab-ctl restart nginx"
fi
echo ""

echo "5. Checking GitLab Configuration..."
EXTERNAL_URL=$(sudo grep "^external_url" /etc/gitlab/gitlab.rb 2>/dev/null | head -n1)
if echo "$EXTERNAL_URL" | grep -q "https://$DOMAIN"; then
    echo "   ✓ external_url is set correctly: $EXTERNAL_URL"
elif echo "$EXTERNAL_URL" | grep -q "http://$DOMAIN"; then
    echo "   ⚠ external_url is set to HTTP: $EXTERNAL_URL"
    echo "   This is correct for initial Let's Encrypt setup, but should change to HTTPS after."
else
    echo "   ✗ external_url not found or incorrect: $EXTERNAL_URL"
fi
echo ""

echo "6. Checking Let's Encrypt Configuration..."
LETSENCRYPT_ENABLED=$(sudo grep "^letsencrypt\['enable'\]" /etc/gitlab/gitlab.rb 2>/dev/null | head -n1)
if echo "$LETSENCRYPT_ENABLED" | grep -q "true"; then
    echo "   ✓ Let's Encrypt is enabled: $LETSENCRYPT_ENABLED"
else
    echo "   ⚠ Let's Encrypt setting: $LETSENCRYPT_ENABLED"
    echo "   Should be: letsencrypt['enable'] = true"
fi
echo ""

echo "7. Checking ACME Challenge Directory..."
if [ -d "/var/opt/gitlab/nginx/www/.well-known/acme-challenge" ]; then
    echo "   ✓ ACME challenge directory exists"
    ls -la /var/opt/gitlab/nginx/www/.well-known/acme-challenge/ 2>/dev/null | head -n5
else
    echo "   ✗ ACME challenge directory does not exist"
    echo "   This will be created during gitlab-ctl reconfigure"
fi
echo ""

echo "8. Testing ACME Challenge Path..."
TEST_CHALLENGE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://$DOMAIN/.well-known/acme-challenge/test" 2>/dev/null)
if [ "$TEST_CHALLENGE" = "404" ]; then
    echo "   ✓ ACME challenge path is accessible (404 is expected for non-existent files)"
elif [ "$TEST_CHALLENGE" = "200" ]; then
    echo "   ✓ ACME challenge path is accessible"
else
    echo "   ✗ ACME challenge path not accessible (HTTP $TEST_CHALLENGE)"
    echo "   This is likely the root cause of your issue."
fi
echo ""

echo "9. Checking Cloudflare Proxy Status..."
# This requires curl and assumes Cloudflare API access
echo "   ℹ Check manually in Cloudflare dashboard:"
echo "      - DNS record 'dev' should have proxy OFF (grey cloud)"
echo "      - If proxy is ON (orange cloud), Let's Encrypt will fail"
echo ""

echo "10. Checking Firewall Status..."
if command -v ufw >/dev/null 2>&1; then
    UFW_STATUS=$(sudo ufw status 2>/dev/null | head -n1)
    echo "   UFW Status: $UFW_STATUS"
    if echo "$UFW_STATUS" | grep -q "Status: active"; then
        echo "   ⚠ UFW is active - check if port 80 is allowed:"
        sudo ufw status | grep "80/tcp" || echo "      Port 80 not found in UFW rules"
    fi
fi
echo ""

echo "=========================================="
echo "Diagnostic Complete"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Fix any issues marked with ✗"
echo "2. Ensure Cloudflare proxy is OFF (grey cloud)"
echo "3. Ensure Hetzner firewall allows port 80"
echo "4. Run: sudo gitlab-ctl reconfigure"
echo ""

