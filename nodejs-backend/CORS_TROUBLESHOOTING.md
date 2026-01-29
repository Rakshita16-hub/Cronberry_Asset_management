# CORS Troubleshooting Guide

## Quick Fix Checklist

### 1. **Verify Environment Variable is Set**

On your production server, check your `.env` file:

```bash
# Should include:
CORS_ORIGIN=https://assetmanagement.cronberry.com
```

Or if you want multiple origins:
```bash
CORS_ORIGIN=https://assetmanagement.cronberry.com,http://localhost:3000
```

### 2. **Restart Your Server**

After updating code or `.env`, restart your Node.js server:

```bash
# If using PM2:
pm2 restart your-app-name
pm2 logs your-app-name  # Check logs

# If using systemd:
sudo systemctl restart your-service-name
sudo journalctl -u your-service-name -f  # Check logs

# If running directly:
# Stop (Ctrl+C) and restart:
node server.js
```

### 3. **Check Server Startup Logs**

When the server starts, you should see:
```
🌐 CORS enabled for origins: [ 'http://localhost:3000', 'https://assetmanagement.cronberry.com', ... ]
📝 CORS_ORIGIN env: https://assetmanagement.cronberry.com
```

### 4. **Test CORS with curl**

Test if CORS is working:

```bash
# Test OPTIONS preflight request
curl -X OPTIONS 'https://api.assetmanagement.cronberry.com/api/auth/login' \
  -H 'Origin: https://assetmanagement.cronberry.com' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: Content-Type' \
  -v

# Should return:
# < Access-Control-Allow-Origin: https://assetmanagement.cronberry.com
# < Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
# < Access-Control-Allow-Credentials: true
```

### 5. **Test CORS Test Endpoint**

```bash
curl 'https://api.assetmanagement.cronberry.com/api/cors-test' \
  -H 'Origin: https://assetmanagement.cronberry.com' \
  -v
```

### 6. **Check Browser Console**

In your browser's Developer Tools → Network tab:
1. Look at the failed request
2. Check the **Request Headers** → `Origin` header
3. Check the **Response Headers** → `Access-Control-Allow-Origin` header
4. The origin must **exactly match** (including `https://` vs `http://`)

## Common Issues

### Issue 1: Reverse Proxy (nginx/Apache/Cloudflare)

If you have nginx or another reverse proxy in front of your Node.js server, you might need to configure CORS there too, OR make sure it's not interfering.

**nginx example:**
```nginx
location /api {
    proxy_pass http://localhost:8001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Don't add CORS headers here - let Node.js handle it
    # Or remove CORS from Node.js and handle it in nginx
}
```

### Issue 2: Trailing Slash

The origin `https://assetmanagement.cronberry.com/` (with trailing slash) is different from `https://assetmanagement.cronberry.com` (without). The code now handles this automatically.

### Issue 3: Environment Variable Not Loaded

Make sure your `.env` file is in the same directory as `server.js` and that `dotenv.config()` is called before CORS configuration.

### Issue 4: Server Not Restarted

After code changes, **always restart** your server for changes to take effect.

## Debugging Steps

1. **Check server logs** when a request comes in:
   ```
   [OPTIONS] /api/auth/login - Origin: https://assetmanagement.cronberry.com
   [POST] /api/auth/login - Origin: https://assetmanagement.cronberry.com
   ```

2. **If you see "CORS: Rejected origin"** in logs:
   - Check what origin is being sent (from logs)
   - Verify it's in the `allowedOrigins` array
   - Check for typos or protocol mismatches (`http://` vs `https://`)

3. **Test with the CORS test endpoint:**
   ```bash
   curl 'https://api.assetmanagement.cronberry.com/api/cors-test' \
     -H 'Origin: https://assetmanagement.cronberry.com'
   ```

## Production Deployment Checklist

- [ ] Code updated with latest CORS configuration
- [ ] `.env` file has `CORS_ORIGIN=https://assetmanagement.cronberry.com`
- [ ] Server restarted after changes
- [ ] Startup logs show correct allowed origins
- [ ] Test endpoint `/api/cors-test` works
- [ ] Browser Network tab shows `Access-Control-Allow-Origin` header
- [ ] No reverse proxy interfering with CORS headers
