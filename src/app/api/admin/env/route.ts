import { NextResponse } from 'next/server';

// List of user-defined environment variable prefixes/patterns
const USER_DEFINED_PREFIXES = [
  'DATABASE_URL',
  'OLD_DATABASE_URL',
  'ALERT_SOURCE',
  'TRADINGVIEW_',
  'ALERTS_LOG_FILE',
  'ERROR_LOG_FILE',
  'RATE_LIMIT_',
  'DHAN_',
  'AVAILABLE_FUNDS',
  'LEVERAGE',
  'MAX_POSITION_SIZE',
  'MIN_ORDER_VALUE',
  'MAX_ORDER_VALUE',
  'STOP_LOSS_PERCENTAGE',
  'TARGET_PRICE_PERCENTAGE',
  'RISK_ON_CAPITAL',
  'ENABLE_TRAILING_STOP_LOSS',
  'MIN_TRAIL_JUMP',
  'REBASE_',
  'AUTO_PLACE_',
  'DEFAULT_ORDER_QUANTITY',
  'EXTERNAL_WEBHOOK_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
];

// Common system environment variables to exclude
const SYSTEM_ENV_PATTERNS = [
  'PATH',
  'HOME',
  'USER',
  'SHELL',
  'LANG',
  'PWD',
  'TEMP',
  'TMP',
  'OS',
  'PROCESSOR_',
  'SYSTEMROOT',
  'WINDIR',
  'PROGRAMFILES',
  'COMMONPROGRAMFILES',
  'APPDATA',
  'LOCALAPPDATA',
  'USERPROFILE',
  'HOMEDRIVE',
  'HOMEPATH',
  'LOGONSERVER',
  'COMPUTERNAME',
  'USERDOMAIN',
  'SESSIONNAME',
  'NUMBER_OF_PROCESSORS',
  'PATHEXT',
  'COMSPEC',
  'DRIVERDATA',
  'ALLUSERSPROFILE',
  'PUBLIC',
  'PSMODULEPATH',
  'ONEDRIVE',
  'CHROME_',
  'VSCODE_',
  'TERM_',
  'COLORTERM',
  'GIT_',
  'NODE_',
  'npm_',
  'INIT_CWD',
  '__',
  'NEXT_RUNTIME',
];

function isUserDefinedEnvVar(key: string): boolean {
  // Check if it matches any user-defined prefix
  const matchesUserPrefix = USER_DEFINED_PREFIXES.some(prefix => 
    key.startsWith(prefix) || key.includes(prefix)
  );
  
  // Check if it matches any system pattern
  const matchesSystemPattern = SYSTEM_ENV_PATTERNS.some(pattern => 
    key.startsWith(pattern) || key === pattern
  );
  
  // Include if it matches user prefix and doesn't match system pattern
  return matchesUserPrefix && !matchesSystemPattern;
}

export async function GET() {
  try {
    // Get only user-defined environment variables
    const allEnvVars = Object.entries(process.env);
    
    const userEnvVars = allEnvVars
      .filter(([key]) => isUserDefinedEnvVar(key))
      .map(([key, value]) => ({
        key,
        value: value || ''
      }))
      .sort((a, b) => a.key.localeCompare(b.key));

    return NextResponse.json({
      success: true,
      envVars: userEnvVars,
      count: userEnvVars.length,
      totalSystemVars: allEnvVars.length - userEnvVars.length
    });
  } catch (error) {
    console.error('Error fetching environment variables:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch environment variables',
        envVars: []
      },
      { status: 500 }
    );
  }
}
