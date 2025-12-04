# ProGeoData DNS Setup Guide

## Overview
This guide provides step-by-step instructions for configuring the DNS zone file for `progeodata.com` using Cloudflare.

## Files Created
- [`progeodata.com.zone`](progeodata.com.zone) - BIND format zone file ready for import

## DNS Records Summary

### Critical Records
| Record        | Type  | Name | Content                           | Proxied |
| ------------- | ----- | ---- | --------------------------------- | ------- |
| API Subdomain | CNAME | api  | scraper-api.magicmike.workers.dev | ✅ Yes   |
| WWW Subdomain | CNAME | www  | progeodata.com                    | ✅ Yes   |
| Root Domain   | CNAME | @    | pages-dev.progeodata.pages.dev    | ✅ Yes   |

### Nameservers
- `keira.ns.cloudflare.com`
- `mitchell.ns.cloudflare.com`

## Import Instructions

### Method 1: Cloudflare Dashboard Import
1. Login to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your `progeodata.com` domain
3. Navigate to **DNS** → **Import and Export**
4. Click **Import**
5. Upload the [`progeodata.com.zone`](progeodata.com.zone) file
6. Review and confirm the import

### Method 2: Manual DNS Entry
1. Login to Cloudflare Dashboard
2. Select `progeodata.com` domain
3. Navigate to **DNS** → **Records**
4. Add the following records:

#### API Subdomain (Most Critical)
- **Type**: CNAME
- **Name**: api
- **Target**: scraper-api.magicmike.workers.dev
- **Proxy status**: Proxied (orange cloud)
- **TTL**: Auto

#### WWW Subdomain
- **Type**: CNAME
- **Name**: www
- **Target**: progeodata.com
- **Proxy status**: Proxied (orange cloud)
- **TTL**: Auto

#### Root Domain (Placeholder)
- **Type**: CNAME
- **Name**: @
- **Target**: pages-dev.progeodata.pages.dev
- **Proxy status**: Proxied (orange cloud)
- **TTL**: Auto

## Validation Steps

### 1. DNS Propagation Check
After import, wait 5-30 minutes for DNS propagation, then test:

```bash
# Check API subdomain
dig api.progeodata.com CNAME

# Check WWW subdomain
dig www.progeodata.com CNAME

# Check root domain
dig progeodata.com CNAME
```

### 2. API Endpoint Testing
Once DNS propagates, test the API endpoints:

```bash
# Health check
curl https://api.progeodata.com/health

# Search endpoint
curl https://api.progeodata.com/v1/search \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"state":"FL","profession":"real-estate","zip":"33101"}'
```

### 3. SSL Certificate Verification
Cloudflare will automatically provision SSL certificates. Check:
- Visit `https://api.progeodata.com/health` in browser
- Verify the certificate is valid and shows "ProGeoData" or Cloudflare

## Troubleshooting

### Common Issues

#### DNS Not Propagating
- Wait longer (up to 24 hours for full global propagation)
- Check with multiple DNS lookup tools
- Clear local DNS cache: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (macOS)

#### API Not Accessible
- Verify CNAME record is correct
- Check Cloudflare proxy status (should be orange cloud)
- Ensure worker is deployed and healthy
- Check Cloudflare Firewall rules

#### SSL Certificate Issues
- Ensure proxy is enabled (orange cloud)
- Wait 15-30 minutes for certificate provisioning
- Check SSL/TLS settings in Cloudflare (should be "Full" or "Full (strict)")

#### CORS Errors
- Verify API is deployed with updated CORS configuration
- Check that requests are coming from allowed origins
- Ensure no mixed content warnings in browser console

## Rollback Plan

If issues arise, you can quickly rollback:

1. **DNS Rollback**: Delete the problematic records
2. **API Rollback**: Update frontend to use `scraper-api.magicmike.workers.dev`
3. **Worker Rollback**: Remove custom domain from wrangler.toml and redeploy

## Security Considerations

### Implemented Security
- **CAA Records**: Restrict certificate authorities to Let's Encrypt
- **SPF Record**: Email spoofing protection
- **DMARC**: Email authentication policy
- **Proxy Protection**: Cloudflare DDoS protection

### Recommendations
1. Enable Cloudflare Web Application Firewall (WAF)
2. Configure rate limiting for API endpoints
3. Monitor DNS and API performance
4. Set up alerts for DNS changes

## Next Steps After DNS Setup

1. **Test API Functionality**: Verify all endpoints work with custom domain
2. **Update Monitoring**: Configure monitoring for `api.progeodata.com`
3. **Frontend Deployment**: Deploy frontend changes to production
4. **Performance Testing**: Load test the new domain endpoints
5. **Documentation Update**: Update API documentation with new URLs

## Contact Information

**Technical Lead**: Kilo Code  
**Setup Date**: December 2, 2025  
**Domain**: progeodata.com  
**Provider**: Cloudflare  

---

**Status**: ✅ DNS zone file created and ready for import