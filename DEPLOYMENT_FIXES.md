# Deployment Fixes for SecurityId Mapping Issues

## Problem
HUDCO and other tickers are failing to map to SecurityId in the deployed version, even though they work locally.

## Root Cause
The deployed version may be using cached old instrument data or the wrong CSV source.

## Solutions Implemented

### 1. Environment Variable for Force Cache Refresh
Add this environment variable to your deployment:

```bash
FORCE_INSTRUMENT_CACHE_REFRESH=true
```

This will force the system to refresh the instrument cache on every startup, ensuring it uses the latest CSV data.

### 2. Enhanced Logging
The system now logs detailed deployment information including:
- Environment (production/development)
- Cache refresh status
- Timestamp of operations
- Detailed error information

### 3. New API Endpoint for Cache Refresh
Use this endpoint to force refresh the cache in production:

```bash
curl "https://your-domain.com/api/instruments?action=force-refresh"
```

This will:
- Clear the instrument cache
- Fetch fresh data from the correct CSV source
- Test with HUDCO to verify it's working
- Return detailed status information

### 4. Deployment Steps

1. **Set Environment Variable**:
   ```bash
   FORCE_INSTRUMENT_CACHE_REFRESH=true
   ```

2. **Deploy the Updated Code**

3. **Verify Cache Refresh**:
   ```bash
   curl "https://your-domain.com/api/instruments?action=force-refresh"
   ```

4. **Test HUDCO Mapping**:
   ```bash
   curl "https://your-domain.com/api/instruments?action=map&ticker=HUDCO"
   ```

### 5. Expected Results

After deployment with the fixes:

- **HUDCO**: Should map to SecurityId `20825`
- **EIEL**: Should map to SecurityId `27213`
- **USHAMART**: Should map to SecurityId `8840`

### 6. Monitoring

Check the logs for these messages:
- `🔄 Force cache refresh enabled - clearing cache...`
- `✅ Successfully mapped HUDCO -> 20825`
- `🚀 SecurityId lookup for HUDCO in production environment`

### 7. Troubleshooting

If issues persist:

1. **Check CSV Source**: Verify the system is fetching from `https://images.dhan.co/api-data/api-scrip-master.csv`

2. **Check Cache**: Look for cache refresh messages in logs

3. **Test API Endpoints**: Use the test endpoints to verify functionality

4. **Check Environment Variables**: Ensure `FORCE_INSTRUMENT_CACHE_REFRESH=true` is set

## Files Modified

- `src/lib/instrumentMapper.ts`: Added force refresh logic
- `src/lib/dhanApi.ts`: Enhanced logging and error handling
- `src/app/api/instruments/route.ts`: Added force-refresh endpoint

## Testing Commands

```bash
# Test HUDCO mapping
curl "https://your-domain.com/api/instruments?action=map&ticker=HUDCO"

# Force cache refresh
curl "https://your-domain.com/api/instruments?action=force-refresh"

# Test retry mechanism
curl "https://your-domain.com/api/instruments?action=test-retry&ticker=HUDCO"

# Find similar tickers
curl "https://your-domain.com/api/instruments?action=find-similar&ticker=HUDCO"
```
