# DNS Configuration Guide for dropmagic.so

## Quick Reference

**Domain:** dropmagic.so  
**Target:** Railway deployment  
**Railway URL:** https://web-production-90446.up.railway.app  
**Issue:** DNS not configured (NXDOMAIN)

## Method 1: Railway Custom Domains (Recommended)

### Steps:
1. Go to https://railway.app
2. Navigate to DropMagic project/service
3. Click **Settings** → **Domains**
4. Click **"+ Add Custom Domain"**
5. Enter: `dropmagic.so`
6. Railway will show DNS records to configure
7. Copy those records to your DNS provider
8. Click "Verify" once DNS propagates

### Expected Railway Instructions:
Railway will likely provide something like:
```
Add these records to your DNS provider:

Type: CNAME
Name: @ (or dropmagic.so)
Value: <custom-railway-domain>.up.railway.app
```

## Method 2: Manual DNS Configuration

If not using Railway's custom domain feature:

### DNS Records to Configure

**Primary Domain:**
```
Type: CNAME
Name: @ (or root / dropmagic.so)
Value: web-production-90446.up.railway.app
TTL: 300
```

**WWW Subdomain:**
```
Type: CNAME
Name: www
Value: web-production-90446.up.railway.app
TTL: 300
```

### If Your DNS Provider Doesn't Support Root CNAME

Some providers (like traditional DNS) don't allow CNAME at root. Use A record instead:

1. Get Railway's IP address:
   ```bash
   dig web-production-90446.up.railway.app +short
   ```

2. Configure:
   ```
   Type: A
   Name: @ (or root)
   Value: <IP from step 1>
   TTL: 300
   ```

## DNS Provider-Specific Instructions

### Cloudflare
1. Log into Cloudflare dashboard
2. Select dropmagic.so domain
3. Go to DNS → Records
4. Click "Add record"
5. Enter:
   - Type: CNAME
   - Name: @ (or dropmagic.so)
   - Target: web-production-90446.up.railway.app
   - Proxy status: ON (orange cloud) or OFF (gray cloud) - try OFF first
   - TTL: Auto
6. Click Save
7. Wait 2-5 minutes for propagation

### AWS Route53
1. Open Route 53 console
2. Navigate to Hosted zones
3. Select dropmagic.so
4. Click "Create record"
5. Record details:
   - Record name: (leave empty for root)
   - Record type: CNAME
   - Value: web-production-90446.up.railway.app
   - TTL: 300
6. Click "Create records"

### Namecheap
1. Log into Namecheap
2. Domain List → Manage for dropmagic.so
3. Advanced DNS tab
4. Add New Record:
   - Type: CNAME Record
   - Host: @
   - Value: web-production-90446.up.railway.app
   - TTL: Automatic
5. Save

### Google Domains
1. Log into Google Domains
2. Select dropmagic.so
3. DNS → Custom records
4. Create new record:
   - Host name: @ (leave empty)
   - Type: CNAME
   - TTL: 5 minutes
   - Data: web-production-90446.up.railway.app
5. Save

## Verification Commands

Run these after configuring DNS:

```bash
# 1. Check if DNS is propagating
dig dropmagic.so +short
# Should return IP address or CNAME

# 2. Check NS records
dig dropmagic.so NS +short
# Should show your DNS provider's nameservers

# 3. Test HTTP access
curl -I https://dropmagic.so
# Should return HTTP 200 (may take time for SSL)

# 4. Verify SSL certificate
curl -v https://dropmagic.so 2>&1 | grep "subject:"
# Should show valid certificate for dropmagic.so

# 5. Check from multiple locations
# Use online tools:
# - https://dnschecker.org (enter dropmagic.so)
# - https://www.whatsmydns.net (enter dropmagic.so)
```

## Propagation Timeline

| Time | Expected Status |
|------|-----------------|
| 0-5 min | DNS records visible in provider dashboard |
| 5-30 min | DNS starts resolving in some locations |
| 30 min-2 hr | DNS resolves globally (typical) |
| 2-24 hr | DNS fully propagated (worst case) |
| +30 min | Railway provisions SSL certificate (after DNS resolves) |

## Troubleshooting

### DNS Still Not Resolving After 1 Hour

1. **Check nameservers:**
   ```bash
   whois dropmagic.so | grep "Name Server"
   ```
   Verify they match your DNS provider.

2. **Clear local DNS cache:**
   ```bash
   # macOS
   sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder
   
   # Linux
   sudo systemd-resolve --flush-caches
   
   # Windows
   ipconfig /flushdns
   ```

3. **Test from external server:**
   ```bash
   # Use Google's DNS
   dig @8.8.8.8 dropmagic.so +short
   ```

### SSL Certificate Error

If DNS resolves but SSL fails:
- Wait 30-60 minutes for Railway to provision certificate
- Check Railway dashboard → Domains for cert status
- Ensure DNS is fully propagated before Railway provisions

### Railway Shows "Waiting for DNS"

- Verify CNAME/A record is correctly configured
- Check TTL is not too high (use 300 seconds)
- Wait for propagation (15-30 minutes typical)
- Click "Refresh" or "Verify" in Railway

## After DNS Works

### Update Database
```sql
UPDATE products 
SET landing_url = 'https://dropmagic.so',
    custom_domain_configured = 1,
    updated_at = NOW()
WHERE slug = 'dropmagic';
```

### Update App Config (if needed)
Check if app has hardcoded URLs that need updating:
- Environment variables
- Config files
- CORS settings

### Test Full Functionality
1. Visit https://dropmagic.so
2. Verify page loads with DropMagic branding
3. Test key features (countdown, email capture)
4. Check SSL certificate is valid (padlock icon)
5. Test on mobile devices

## Support

If issues persist:
- **Railway Support:** https://railway.app/help
- **DNS Provider Support:** Check your provider's docs
- **OpenClaw Workspace:** This guide is at `dropmagic/DNS_CONFIGURATION_GUIDE.md`

---

**Last Updated:** 2026-03-05  
**Task:** #8887  
**Status:** DNS not configured (requires manual setup)
