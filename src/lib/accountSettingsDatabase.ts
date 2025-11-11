import { getDatabaseConnection } from './database';

export interface AccountSettings {
  id: number;
  dhanClientId: string;
  dhanAccessToken: string;
  availableFunds: number;
  leverage: number;
  maxPositionSize: number;
  minOrderValue: number;
  maxOrderValue: number;
  stopLossPercentage: number;
  targetPricePercentage: number;
  riskOnCapital: number;
  enableTrailingStopLoss: boolean;
  minTrailJump: number;
  rebaseTpAndSl: boolean;
  rebaseThresholdPercentage: number;
  allowDuplicateTickers: boolean;
  orderType: string;
  limitBufferPercentage: number;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Initialize account settings table
 */
export async function initializeAccountSettingsTable(): Promise<void> {
  const client = await getDatabaseConnection();
  
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS account_settings (
        id SERIAL PRIMARY KEY,
        dhan_client_id VARCHAR(255) NOT NULL UNIQUE,
        dhan_access_token TEXT NOT NULL,
        available_funds DECIMAL(15,2) NOT NULL DEFAULT 20000,
        leverage DECIMAL(5,2) NOT NULL DEFAULT 2,
        max_position_size DECIMAL(5,4) NOT NULL DEFAULT 0.1,
        min_order_value DECIMAL(15,2) NOT NULL DEFAULT 1000,
        max_order_value DECIMAL(15,2) NOT NULL DEFAULT 50000,
        stop_loss_percentage DECIMAL(6,4) NOT NULL DEFAULT 0.01,
        target_price_percentage DECIMAL(6,4) NOT NULL DEFAULT 0.015,
        risk_on_capital DECIMAL(5,2) NOT NULL DEFAULT 2.0,
        enable_trailing_stop_loss BOOLEAN NOT NULL DEFAULT true,
        min_trail_jump DECIMAL(6,2) NOT NULL DEFAULT 0.05,
        rebase_tp_and_sl BOOLEAN NOT NULL DEFAULT true,
        rebase_threshold_percentage DECIMAL(6,4) NOT NULL DEFAULT 0.02,
        allow_duplicate_tickers BOOLEAN NOT NULL DEFAULT false,
        order_type VARCHAR(20) NOT NULL DEFAULT 'LIMIT',
        limit_buffer_percentage DECIMAL(6,4) NOT NULL DEFAULT 0.0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create index on dhan_client_id for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_account_settings_client_id 
      ON account_settings(dhan_client_id)
    `);

    // Create index on is_active for filtering active accounts
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_account_settings_active 
      ON account_settings(is_active)
    `);

    console.log('Account settings table initialized successfully');
  } catch (error) {
    console.error('Error initializing account settings table:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get all account settings
 */
export async function getAllAccountSettings(activeOnly: boolean = false): Promise<AccountSettings[]> {
  const client = await getDatabaseConnection();
  
  try {
    const query = activeOnly
      ? `SELECT * FROM account_settings WHERE is_active = true ORDER BY id`
      : `SELECT * FROM account_settings ORDER BY id`;
    
    const result = await client.query(query);
    
    return result.rows.map(row => ({
      id: row.id,
      dhanClientId: row.dhan_client_id,
      dhanAccessToken: row.dhan_access_token,
      availableFunds: parseFloat(row.available_funds),
      leverage: parseFloat(row.leverage),
      maxPositionSize: parseFloat(row.max_position_size),
      minOrderValue: parseFloat(row.min_order_value),
      maxOrderValue: parseFloat(row.max_order_value),
      stopLossPercentage: parseFloat(row.stop_loss_percentage),
      targetPricePercentage: parseFloat(row.target_price_percentage),
      riskOnCapital: parseFloat(row.risk_on_capital),
      enableTrailingStopLoss: row.enable_trailing_stop_loss,
      minTrailJump: parseFloat(row.min_trail_jump),
      rebaseTpAndSl: row.rebase_tp_and_sl,
      rebaseThresholdPercentage: parseFloat(row.rebase_threshold_percentage),
      allowDuplicateTickers: row.allow_duplicate_tickers,
      orderType: row.order_type,
      limitBufferPercentage: parseFloat(row.limit_buffer_percentage || '0'),
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  } catch (error) {
    console.error('Error getting all account settings:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get account settings by client ID
 */
export async function getAccountSettingsByClientId(clientId: string): Promise<AccountSettings | null> {
  const client = await getDatabaseConnection();
  
  try {
    const result = await client.query(
      `SELECT * FROM account_settings WHERE dhan_client_id = $1`,
      [clientId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      dhanClientId: row.dhan_client_id,
      dhanAccessToken: row.dhan_access_token,
      availableFunds: parseFloat(row.available_funds),
      leverage: parseFloat(row.leverage),
      maxPositionSize: parseFloat(row.max_position_size),
      minOrderValue: parseFloat(row.min_order_value),
      maxOrderValue: parseFloat(row.max_order_value),
      stopLossPercentage: parseFloat(row.stop_loss_percentage),
      targetPricePercentage: parseFloat(row.target_price_percentage),
      riskOnCapital: parseFloat(row.risk_on_capital),
      enableTrailingStopLoss: row.enable_trailing_stop_loss,
      minTrailJump: parseFloat(row.min_trail_jump),
      rebaseTpAndSl: row.rebase_tp_and_sl,
      rebaseThresholdPercentage: parseFloat(row.rebase_threshold_percentage),
      allowDuplicateTickers: row.allow_duplicate_tickers,
      orderType: row.order_type,
      limitBufferPercentage: parseFloat(row.limit_buffer_percentage || '0'),
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  } catch (error) {
    console.error('Error getting account settings by client ID:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get account settings by ID
 */
export async function getAccountSettingsById(id: number): Promise<AccountSettings | null> {
  const client = await getDatabaseConnection();
  
  try {
    const result = await client.query(
      `SELECT * FROM account_settings WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      dhanClientId: row.dhan_client_id,
      dhanAccessToken: row.dhan_access_token,
      availableFunds: parseFloat(row.available_funds),
      leverage: parseFloat(row.leverage),
      maxPositionSize: parseFloat(row.max_position_size),
      minOrderValue: parseFloat(row.min_order_value),
      maxOrderValue: parseFloat(row.max_order_value),
      stopLossPercentage: parseFloat(row.stop_loss_percentage),
      targetPricePercentage: parseFloat(row.target_price_percentage),
      riskOnCapital: parseFloat(row.risk_on_capital),
      enableTrailingStopLoss: row.enable_trailing_stop_loss,
      minTrailJump: parseFloat(row.min_trail_jump),
      rebaseTpAndSl: row.rebase_tp_and_sl,
      rebaseThresholdPercentage: parseFloat(row.rebase_threshold_percentage),
      allowDuplicateTickers: row.allow_duplicate_tickers,
      orderType: row.order_type,
      limitBufferPercentage: parseFloat(row.limit_buffer_percentage || '0'),
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  } catch (error) {
    console.error('Error getting account settings by ID:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Create new account settings
 */
export async function createAccountSettings(settings: Omit<AccountSettings, 'id' | 'createdAt' | 'updatedAt'>): Promise<AccountSettings> {
  const client = await getDatabaseConnection();
  
  try {
    const result = await client.query(
      `INSERT INTO account_settings (
        dhan_client_id, dhan_access_token, available_funds, leverage,
        max_position_size, min_order_value, max_order_value,
        stop_loss_percentage, target_price_percentage, risk_on_capital,
        enable_trailing_stop_loss, min_trail_jump, rebase_tp_and_sl,
        rebase_threshold_percentage, allow_duplicate_tickers, order_type, limit_buffer_percentage, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        settings.dhanClientId,
        settings.dhanAccessToken,
        settings.availableFunds,
        settings.leverage,
        settings.maxPositionSize,
        settings.minOrderValue,
        settings.maxOrderValue,
        settings.stopLossPercentage,
        settings.targetPricePercentage,
        settings.riskOnCapital,
        settings.enableTrailingStopLoss,
        settings.minTrailJump,
        settings.rebaseTpAndSl,
        settings.rebaseThresholdPercentage,
        settings.allowDuplicateTickers,
        settings.orderType,
        settings.limitBufferPercentage,
        settings.isActive
      ]
    );
    
    const row = result.rows[0];
    return {
      id: row.id,
      dhanClientId: row.dhan_client_id,
      dhanAccessToken: row.dhan_access_token,
      availableFunds: parseFloat(row.available_funds),
      leverage: parseFloat(row.leverage),
      maxPositionSize: parseFloat(row.max_position_size),
      minOrderValue: parseFloat(row.min_order_value),
      maxOrderValue: parseFloat(row.max_order_value),
      stopLossPercentage: parseFloat(row.stop_loss_percentage),
      targetPricePercentage: parseFloat(row.target_price_percentage),
      riskOnCapital: parseFloat(row.risk_on_capital),
      enableTrailingStopLoss: row.enable_trailing_stop_loss,
      minTrailJump: parseFloat(row.min_trail_jump),
      rebaseTpAndSl: row.rebase_tp_and_sl,
      rebaseThresholdPercentage: parseFloat(row.rebase_threshold_percentage),
      allowDuplicateTickers: row.allow_duplicate_tickers,
      orderType: row.order_type,
      limitBufferPercentage: parseFloat(row.limit_buffer_percentage || '0'),
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  } catch (error) {
    console.error('Error creating account settings:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update account settings
 */
export async function updateAccountSettings(id: number, settings: Partial<Omit<AccountSettings, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AccountSettings> {
  const client = await getDatabaseConnection();
  
  try {
    const updates: string[] = [];
    const values: (string | number | boolean)[] = [];
    let paramIndex = 1;

    if (settings.dhanClientId !== undefined) {
      updates.push(`dhan_client_id = $${paramIndex++}`);
      values.push(settings.dhanClientId);
    }
    if (settings.dhanAccessToken !== undefined) {
      updates.push(`dhan_access_token = $${paramIndex++}`);
      values.push(settings.dhanAccessToken);
    }
    if (settings.availableFunds !== undefined) {
      updates.push(`available_funds = $${paramIndex++}`);
      values.push(settings.availableFunds);
    }
    if (settings.leverage !== undefined) {
      updates.push(`leverage = $${paramIndex++}`);
      values.push(settings.leverage);
    }
    if (settings.maxPositionSize !== undefined) {
      updates.push(`max_position_size = $${paramIndex++}`);
      values.push(settings.maxPositionSize);
    }
    if (settings.minOrderValue !== undefined) {
      updates.push(`min_order_value = $${paramIndex++}`);
      values.push(settings.minOrderValue);
    }
    if (settings.maxOrderValue !== undefined) {
      updates.push(`max_order_value = $${paramIndex++}`);
      values.push(settings.maxOrderValue);
    }
    if (settings.stopLossPercentage !== undefined) {
      updates.push(`stop_loss_percentage = $${paramIndex++}`);
      values.push(settings.stopLossPercentage);
    }
    if (settings.targetPricePercentage !== undefined) {
      updates.push(`target_price_percentage = $${paramIndex++}`);
      values.push(settings.targetPricePercentage);
    }
    if (settings.riskOnCapital !== undefined) {
      updates.push(`risk_on_capital = $${paramIndex++}`);
      values.push(settings.riskOnCapital);
    }
    if (settings.enableTrailingStopLoss !== undefined) {
      updates.push(`enable_trailing_stop_loss = $${paramIndex++}`);
      values.push(settings.enableTrailingStopLoss);
    }
    if (settings.minTrailJump !== undefined) {
      updates.push(`min_trail_jump = $${paramIndex++}`);
      values.push(settings.minTrailJump);
    }
    if (settings.rebaseTpAndSl !== undefined) {
      updates.push(`rebase_tp_and_sl = $${paramIndex++}`);
      values.push(settings.rebaseTpAndSl);
    }
    if (settings.rebaseThresholdPercentage !== undefined) {
      updates.push(`rebase_threshold_percentage = $${paramIndex++}`);
      values.push(settings.rebaseThresholdPercentage);
    }
    if (settings.allowDuplicateTickers !== undefined) {
      updates.push(`allow_duplicate_tickers = $${paramIndex++}`);
      values.push(settings.allowDuplicateTickers);
    }
    if (settings.orderType !== undefined) {
      updates.push(`order_type = $${paramIndex++}`);
      values.push(settings.orderType);
    }
    if (settings.limitBufferPercentage !== undefined) {
      updates.push(`limit_buffer_percentage = $${paramIndex++}`);
      values.push(settings.limitBufferPercentage);
    }
    if (settings.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(settings.isActive);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await client.query(
      `UPDATE account_settings SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      throw new Error('Account settings not found');
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      dhanClientId: row.dhan_client_id,
      dhanAccessToken: row.dhan_access_token,
      availableFunds: parseFloat(row.available_funds),
      leverage: parseFloat(row.leverage),
      maxPositionSize: parseFloat(row.max_position_size),
      minOrderValue: parseFloat(row.min_order_value),
      maxOrderValue: parseFloat(row.max_order_value),
      stopLossPercentage: parseFloat(row.stop_loss_percentage),
      targetPricePercentage: parseFloat(row.target_price_percentage),
      riskOnCapital: parseFloat(row.risk_on_capital),
      enableTrailingStopLoss: row.enable_trailing_stop_loss,
      minTrailJump: parseFloat(row.min_trail_jump),
      rebaseTpAndSl: row.rebase_tp_and_sl,
      rebaseThresholdPercentage: parseFloat(row.rebase_threshold_percentage),
      allowDuplicateTickers: row.allow_duplicate_tickers,
      orderType: row.order_type,
      limitBufferPercentage: parseFloat(row.limit_buffer_percentage || '0'),
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  } catch (error) {
    console.error('Error updating account settings:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Delete account settings
 */
export async function deleteAccountSettings(id: number): Promise<boolean> {
  const client = await getDatabaseConnection();
  
  try {
    const result = await client.query(
      `DELETE FROM account_settings WHERE id = $1`,
      [id]
    );
    
    return (result.rowCount || 0) > 0;
  } catch (error) {
    console.error('Error deleting account settings:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if client ID exists
 */
export async function clientIdExists(clientId: string, excludeId?: number): Promise<boolean> {
  const client = await getDatabaseConnection();
  
  try {
    const query = excludeId
      ? `SELECT 1 FROM account_settings WHERE dhan_client_id = $1 AND id != $2`
      : `SELECT 1 FROM account_settings WHERE dhan_client_id = $1`;
    
    const params = excludeId ? [clientId, excludeId] : [clientId];
    const result = await client.query(query, params);
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking client ID existence:', error);
    throw error;
  } finally {
    client.release();
  }
}
