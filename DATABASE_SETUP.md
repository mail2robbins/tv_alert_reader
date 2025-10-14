# Database Setup Guide

This guide will help you set up PostgreSQL database integration for the TV Alert Reader application.

## Prerequisites

1. A Neon PostgreSQL database (or any PostgreSQL database)
2. Node.js and npm installed
3. The application dependencies installed (`npm install`)

## Setup Steps

### 1. Create a Neon PostgreSQL Database

1. Go to [Neon Console](https://console.neon.tech/)
2. Sign up or log in to your account
3. Create a new project
4. Copy the connection string (it will look like: `postgresql://username:password@hostname:port/database_name`)

### 2. Configure Environment Variables

1. Copy the `.env.example` file to `.env.local`:
   ```bash
   cp env.example .env.local
   ```

2. Add your database connection string to `.env.local`:
   ```env
   DATABASE_URL=postgresql://username:password@hostname:port/database_name
   ```

### 3. Initialize the Database

Run the database initialization script to create the required tables and indexes:

```bash
npm run db:init
```

This will:
- Test the database connection
- Create the `alerts` table for storing trading alerts
- Create the `placed_orders` table for storing order information
- Create the `ticker_cache` table for preventing duplicate orders
- Create indexes for optimal performance

### 4. Test the Database Integration

Run the database integration test to verify everything is working:

```bash
npm run db:test
```

This will test:
- Database connection
- Schema initialization
- Alert storage and retrieval
- Order storage and retrieval
- Ticker cache functionality

## Database Schema

### Alerts Table
- `id`: Unique alert identifier
- `timestamp`: When the alert was received
- `alert_type`: 'TradingView' or 'ChartInk'
- `ticker`: Stock symbol
- `price`: Alert price
- `signal`: 'BUY', 'SELL', or 'HOLD'
- `strategy`: Trading strategy name
- `custom_note`: Optional custom note
- `webhook_secret`: Optional webhook secret
- `original_data`: Full alert data as JSON
- `created_at`: Record creation timestamp

### Placed Orders Table
- `id`: Unique order identifier
- `alert_id`: Reference to the alert that triggered the order
- `ticker`: Stock symbol
- `signal`: Order signal
- `price`: Order price
- `quantity`: Number of shares
- `timestamp`: When the order was placed
- `correlation_id`: Dhan API correlation ID
- `order_id`: Dhan API order ID
- `status`: Order status ('pending', 'placed', 'failed', 'cancelled')
- `error`: Error message if order failed
- `order_value`: Total order value
- `leveraged_value`: Leveraged order value
- `position_size_percentage`: Position size as percentage
- `stop_loss_price`: Stop loss price
- `target_price`: Target price
- `account_id`: Account ID (for multi-account support)
- `client_id`: Client ID
- `dhan_response`: Full Dhan API response as JSON
- `position_calculation`: Position calculation details as JSON
- `created_at`: Record creation timestamp

### Ticker Cache Table
- `id`: Auto-incrementing primary key
- `ticker`: Stock symbol
- `date`: Date (YYYY-MM-DD format)
- `order_count`: Number of orders placed for this ticker on this date
- `last_order_time`: Timestamp of the last order
- `created_at`: Record creation timestamp

## Features

### Automatic Fallback
The application automatically falls back to in-memory storage if:
- The database is not available
- Database connection fails
- Any database operation fails

### Data Persistence
- All trading alerts are stored in the database
- All placed orders are stored in the database
- Ticker cache prevents duplicate orders on the same day
- Data persists across application restarts

### Performance Optimization
- Database indexes are created for optimal query performance
- Connection pooling is configured for efficient database usage
- Queries are optimized for common use cases

## Troubleshooting

### Connection Issues
1. Verify your `DATABASE_URL` is correct
2. Check if your database is accessible from your network
3. Ensure your database credentials are correct

### Schema Issues
1. Run `npm run db:init` to recreate the schema
2. Check the database logs for any errors
3. Verify you have the necessary permissions to create tables

### Performance Issues
1. Check if indexes are created properly
2. Monitor database connection pool usage
3. Consider database-specific optimizations

## Maintenance

### Data Cleanup
The application includes functions to clean up old data:
- `deleteOldAlerts(daysToKeep)`: Remove alerts older than specified days
- `deleteOldOrders(daysToKeep)`: Remove orders older than specified days

### Backup
Regular database backups are recommended for production use.

## Production Considerations

1. **Connection Pooling**: The application uses connection pooling for efficient database usage
2. **SSL**: Database connections use SSL for security
3. **Error Handling**: Comprehensive error handling with fallback to in-memory storage
4. **Monitoring**: Monitor database performance and connection health
5. **Scaling**: Consider read replicas for high-traffic scenarios
