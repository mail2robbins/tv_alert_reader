import { NextResponse } from 'next/server';

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
  'TMPDIR',
  'OS',
  'PROCESSOR_',
  'SYSTEMROOT',
  'WINDIR',
  'PROGRAMFILES',
  'PROGRAMDATA',
  'COMMONPROGRAMFILES',
  'APPDATA',
  'LOCALAPPDATA',
  'USERPROFILE',
  'HOMEDRIVE',
  'HOMEPATH',
  'LOGONSERVER',
  'COMPUTERNAME',
  'USERDOMAIN',
  'USERDOMAIN_ROAMINGPROFILE',
  'SESSIONNAME',
  'NUMBER_OF_PROCESSORS',
  'PATHEXT',
  'COMSPEC',
  'DRIVERDATA',
  'ALLUSERSPROFILE',
  'PUBLIC',
  'PSMODULEPATH',
  'ONEDRIVE',
  'ONEDRIVECONSUMER',
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
  'VERCEL',
  'CI',
  'NETLIFY',
  'GITHUB_',
  'GITLAB_',
  'BITBUCKET_',
  'JENKINS_',
  'TRAVIS_',
  'CIRCLE_',
  'BUILDKITE_',
  'AZURE_',
  'AWS_',
  'GOOGLE_',
  'HEROKU_',
  'RENDER_',
  'RAILWAY_',
  'FLY_',
  'HOSTNAME',
  'SHLVL',
  'OLDPWD',
  'DISPLAY',
  'XAUTHORITY',
  'XDG_',
  'DESKTOP_SESSION',
  'GDMSESSION',
  'GNOME_',
  'KDE_',
  'QT_',
  'GTK_',
  'DBUS_',
  'SESSION_MANAGER',
  'SSH_',
  'MAIL',
  'LOGNAME',
  'EDITOR',
  'VISUAL',
  'PAGER',
  'LESS',
  'MORE',
  'MANPATH',
  'INFOPATH',
  'LS_COLORS',
  'CLICOLOR',
  'LSCOLORS',
  'GREP_',
  'HISTFILE',
  'HISTSIZE',
  'HISTCONTROL',
  'PROMPT_COMMAND',
  'PS1',
  'PS2',
  'PS3',
  'PS4',
  'BASH_',
  'ZSH_',
  'FISH_',
  'NEXT_DEPLOYMENT_ID',
  'NOW_REGION',
  'NX_DAEMON',
  'LD_LIBRARY_PATH',
  'TURBO_CACHE',
  'TURBO_DOWNLOAD_LOCAL_ENABLED',
  'TURBO_REMOTE_ONLY',
  'TURBO_RUN_SUMMARY',
  'TZ',
];

function isUserDefinedEnvVar(key: string): boolean {
  // Check if it matches any system pattern
  const matchesSystemPattern = SYSTEM_ENV_PATTERNS.some(pattern => 
    key.startsWith(pattern) || key === pattern
  );
  
  // Include everything that doesn't match system patterns
  return !matchesSystemPattern;
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
