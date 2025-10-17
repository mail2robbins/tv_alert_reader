# Rebase TP/SL Socket Error Fix

## 🚨 Problem Identified

The production logs showed consistent `UND_ERR_SOCKET: other side closed` errors when the rebase functionality tried to fetch order details from the Dhan API. This was causing all TP/SL rebase operations to fail.

### Root Cause Analysis

1. **Network Connection Issues**: Socket connections to Dhan API (`3.7.198.25:443`) were being closed unexpectedly
2. **No Timeout Configuration**: Fetch requests had no timeout, causing them to hang until socket closure
3. **Poor Error Handling**: Network errors weren't being handled gracefully
4. **Serverless Environment**: Network connections can be unstable in serverless deployments

### Evidence from Production Logs

```
❌ Error fetching order details: TypeError: fetch failed
[cause]: [Error [SocketError]: other side closed] {
  code: 'UND_ERR_SOCKET',
  socket: {
    localAddress: '169.254.100.6',
    localPort: 37996,
    remoteAddress: '3.7.198.25',
    remotePort: 443,
    remoteFamily: 'IPv4',
    timeout: undefined,  // ← No timeout configured!
    bytesWritten: 2388,
    bytesRead: 584
  }
}
```

## 🛠️ Solution Implemented

### 1. Added Timeout Configuration

**File**: `src/lib/dhanApi.ts`

- Added `AbortController` with configurable timeout
- Default timeout: 10 seconds (configurable via `DHAN_API_TIMEOUT_MS`)
- Added `keepalive: true` for better connection management

```typescript
// Create AbortController for timeout handling
const controller = new AbortController();
const timeoutMs = parseInt(process.env.DHAN_API_TIMEOUT_MS || '10000');
const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

const response = await fetch(`https://api.dhan.co/v2/orders/${orderId}`, {
  method: 'GET',
  headers: {
    'Accept': 'application/json',
    'access-token': accessToken
  },
  signal: controller.signal,
  keepalive: true
});
```

### 2. Enhanced Error Handling

**File**: `src/lib/dhanApi.ts`

- Specific error messages for different failure types
- Better error categorization for debugging

```typescript
// Handle specific network errors
if (error instanceof Error) {
  if (error.name === 'AbortError') {
    throw new Error('Request timeout: Order details fetch took too long');
  } else if (error.message.includes('fetch failed') || error.message.includes('UND_ERR_SOCKET')) {
    throw new Error('Network connection failed: Unable to connect to Dhan API');
  } else if (error.message.includes('other side closed')) {
    throw new Error('Connection closed by server: Dhan API connection was terminated');
  }
}
```

### 3. Improved Retry Logic with Exponential Backoff

**File**: `src/lib/dhanApi.ts`

- Exponential backoff for network errors
- Configurable retry settings
- Better error detection and handling

```typescript
// Handle network errors more gracefully
if (error instanceof Error) {
  if (error.message.includes('Network connection failed') || 
      error.message.includes('Connection closed by server') ||
      error.message.includes('Request timeout')) {
    console.log(`🌐 Network error detected on attempt ${attempt}, will retry with exponential backoff`);
    if (attempt < maxRetries) {
      // Use exponential backoff for network errors
      const backoffDelay = retryDelay * Math.pow(2, attempt - 1);
      console.log(`⏳ Retrying in ${backoffDelay}ms due to network error...`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      continue;
    }
  }
}
```

### 4. Environment Configuration

**File**: `env.example`

Added new configuration options:

```env
# Network and Timeout Configuration
# API request timeout in milliseconds (default: 10000 = 10 seconds)
DHAN_API_TIMEOUT_MS=10000
# Rebase retry delay in milliseconds (default: 3000 = 3 seconds)
REBASE_RETRY_DELAY_MS=3000
# Maximum rebase retry attempts (default: 5)
REBASE_MAX_RETRIES=5
# Fallback to original alert price if entry price unavailable (default: false)
REBASE_FALLBACK_TO_ALERT_PRICE=false
```

## 🎯 Benefits of the Fix

### 1. **Reliability**
- Timeout prevents hanging requests
- Exponential backoff reduces server load
- Better error recovery

### 2. **Configurability**
- All timeout and retry settings are configurable
- Can be tuned for different environments
- Easy to adjust based on network conditions

### 3. **Monitoring**
- Better error messages for debugging
- Clear distinction between timeout, network, and API errors
- Detailed logging for troubleshooting

### 4. **Performance**
- Faster failure detection with timeouts
- Reduced resource usage with proper connection management
- Optimized retry patterns

## 📊 Expected Results

After deploying this fix:

1. **Reduced Socket Errors**: Timeout configuration will prevent hanging connections
2. **Better Recovery**: Exponential backoff will handle temporary network issues
3. **Improved Success Rate**: More robust retry logic should increase rebase success
4. **Better Monitoring**: Clear error messages will help identify remaining issues

## 🔧 Configuration Recommendations

### For Production Environment

```env
# Conservative settings for production
DHAN_API_TIMEOUT_MS=15000        # 15 seconds timeout
REBASE_RETRY_DELAY_MS=5000       # 5 seconds between retries
REBASE_MAX_RETRIES=3             # Fewer retries to avoid long delays
REBASE_FALLBACK_TO_ALERT_PRICE=true  # Enable fallback for reliability
```

### For Development Environment

```env
# More aggressive settings for development
DHAN_API_TIMEOUT_MS=5000         # 5 seconds timeout
REBASE_RETRY_DELAY_MS=2000       # 2 seconds between retries
REBASE_MAX_RETRIES=5             # More retries for testing
REBASE_FALLBACK_TO_ALERT_PRICE=false  # Strict mode for testing
```

## 🚀 Deployment Steps

1. **Update Environment Variables**: Add the new timeout and retry configuration
2. **Deploy Code Changes**: The enhanced error handling and timeout logic
3. **Monitor Logs**: Watch for improved error messages and success rates
4. **Tune Settings**: Adjust timeout and retry values based on production performance

## 📈 Monitoring

After deployment, monitor these metrics:

- **Rebase Success Rate**: Should improve significantly
- **Error Types**: Should see fewer socket errors, more timeout errors
- **Response Times**: Should be more consistent with timeout limits
- **Retry Patterns**: Should see exponential backoff in action

The fix addresses the core network reliability issues while providing better observability and configurability for the rebase functionality.
