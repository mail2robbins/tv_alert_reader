import { getDatabaseConnection } from './database';
import { User, UserSession, UserAuditLog, LoginRequest, RegisterRequest } from '@/types/auth';
import { hashPassword, verifyPassword, generateTokenHash, getTokenExpirationDate } from './auth';

/**
 * Create a new user in the database
 */
export async function createUser(userData: RegisterRequest): Promise<User> {
  const client = await getDatabaseConnection();
  
  try {
    const hashedPassword = await hashPassword(userData.password);
    
    const result = await client.query(`
      INSERT INTO users (username, email, password_hash, full_name, is_approved, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, username, email, full_name as "fullName", is_approved as "isApproved", 
                is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
    `, [
      userData.username,
      userData.email,
      hashedPassword,
      userData.fullName,
      false, // New users need manual approval
      true   // Account is active but not approved
    ]);
    
    const user = result.rows[0];
    
    // Log the registration
    await logUserAction(user.id, 'REGISTER', {
      username: userData.username,
      email: userData.email
    });
    
    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Find user by username
 */
export async function findUserByUsername(username: string): Promise<User | null> {
  const client = await getDatabaseConnection();
  
  try {
    const result = await client.query(`
      SELECT id, username, email, full_name as "fullName", is_approved as "isApproved",
             is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt",
             last_login as "lastLogin"
      FROM users 
      WHERE username = $1 AND is_active = true
    `, [username]);
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error finding user by username:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const client = await getDatabaseConnection();
  
  try {
    const result = await client.query(`
      SELECT id, username, email, full_name as "fullName", is_approved as "isApproved",
             is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt",
             last_login as "lastLogin"
      FROM users 
      WHERE email = $1 AND is_active = true
    `, [email]);
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error finding user by email:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Find user by ID
 */
export async function findUserById(id: number): Promise<User | null> {
  const client = await getDatabaseConnection();
  
  try {
    const result = await client.query(`
      SELECT id, username, email, full_name as "fullName", is_approved as "isApproved",
             is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt",
             last_login as "lastLogin"
      FROM users 
      WHERE id = $1 AND is_active = true
    `, [id]);
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error finding user by ID:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Verify user credentials
 */
export async function verifyUserCredentials(username: string, password: string): Promise<User | null> {
  const client = await getDatabaseConnection();
  
  try {
    const result = await client.query(`
      SELECT id, username, email, full_name as "fullName", is_approved as "isApproved",
             is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt",
             last_login as "lastLogin", password_hash
      FROM users 
      WHERE username = $1 AND is_active = true
    `, [username]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const user = result.rows[0];
    const isPasswordValid = await verifyPassword(password, user.password_hash);
    
    if (!isPasswordValid) {
      // Log failed login attempt
      await logUserAction(user.id, 'LOGIN_FAILED', {
        reason: 'invalid_password',
        username
      });
      return null;
    }
    
    // Remove password hash from returned user object
    delete user.password_hash;
    
    return user;
  } catch (error) {
    console.error('Error verifying user credentials:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update user's last login time
 */
export async function updateLastLogin(userId: number): Promise<void> {
  const client = await getDatabaseConnection();
  
  try {
    await client.query(`
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP 
      WHERE id = $1
    `, [userId]);
  } catch (error) {
    console.error('Error updating last login:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Create a user session
 */
export async function createUserSession(
  userId: number, 
  token: string, 
  userAgent?: string, 
  ipAddress?: string
): Promise<UserSession> {
  const client = await getDatabaseConnection();
  
  try {
    const tokenHash = generateTokenHash(token);
    const expiresAt = getTokenExpirationDate();
    
    const result = await client.query(`
      INSERT INTO user_sessions (user_id, token_hash, expires_at, user_agent, ip_address)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, user_id as "userId", token_hash as "tokenHash", expires_at as "expiresAt",
                created_at as "createdAt", is_active as "isActive", user_agent as "userAgent",
                ip_address as "ipAddress"
    `, [userId, tokenHash, expiresAt, userAgent, ipAddress]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating user session:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Find active session by token
 */
export async function findSessionByToken(token: string): Promise<UserSession | null> {
  const client = await getDatabaseConnection();
  
  try {
    const tokenHash = generateTokenHash(token);
    
    const result = await client.query(`
      SELECT id, user_id as "userId", token_hash as "tokenHash", expires_at as "expiresAt",
             created_at as "createdAt", is_active as "isActive", user_agent as "userAgent",
             ip_address as "ipAddress"
      FROM user_sessions 
      WHERE token_hash = $1 AND is_active = true AND expires_at > CURRENT_TIMESTAMP
    `, [tokenHash]);
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error finding session by token:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Deactivate user session
 */
export async function deactivateSession(token: string): Promise<void> {
  const client = await getDatabaseConnection();
  
  try {
    const tokenHash = generateTokenHash(token);
    
    await client.query(`
      UPDATE user_sessions 
      SET is_active = false 
      WHERE token_hash = $1
    `, [tokenHash]);
  } catch (error) {
    console.error('Error deactivating session:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const client = await getDatabaseConnection();
  
  try {
    const result = await client.query(`
      UPDATE user_sessions 
      SET is_active = false 
      WHERE expires_at <= CURRENT_TIMESTAMP AND is_active = true
    `);
    
    return result.rowCount || 0;
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Log user action for audit trail
 */
export async function logUserAction(
  userId: number, 
  action: string, 
  details?: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const client = await getDatabaseConnection();
  
  try {
    await client.query(`
      INSERT INTO user_audit_log (user_id, action, details, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
    `, [userId, action, details ? JSON.stringify(details) : null, ipAddress, userAgent]);
  } catch (error) {
    console.error('Error logging user action:', error);
    // Don't throw error for audit logging failures
  } finally {
    client.release();
  }
}

/**
 * Get all pending user approvals
 */
export async function getPendingApprovals(): Promise<User[]> {
  const client = await getDatabaseConnection();
  
  try {
    const result = await client.query(`
      SELECT id, username, email, full_name as "fullName", is_approved as "isApproved",
             is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
      FROM users 
      WHERE is_approved = false AND is_active = true
      ORDER BY created_at ASC
    `);
    
    return result.rows;
  } catch (error) {
    console.error('Error getting pending approvals:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Approve a user
 */
export async function approveUser(userId: number): Promise<void> {
  const client = await getDatabaseConnection();
  
  try {
    await client.query(`
      UPDATE users 
      SET is_approved = true 
      WHERE id = $1
    `, [userId]);
    
    // Log the approval
    await logUserAction(userId, 'USER_APPROVED', {
      approvedBy: 'admin'
    });
  } catch (error) {
    console.error('Error approving user:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if username exists
 */
export async function usernameExists(username: string): Promise<boolean> {
  const client = await getDatabaseConnection();
  
  try {
    const result = await client.query(`
      SELECT 1 FROM users WHERE username = $1
    `, [username]);
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking username existence:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if email exists
 */
export async function emailExists(email: string): Promise<boolean> {
  const client = await getDatabaseConnection();
  
  try {
    const result = await client.query(`
      SELECT 1 FROM users WHERE email = $1
    `, [email]);
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking email existence:', error);
    throw error;
  } finally {
    client.release();
  }
}
