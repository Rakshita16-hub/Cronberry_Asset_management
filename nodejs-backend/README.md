# Cronberry Assets Tracker - Node.js + MySQL Backend

## Prerequisites

- Node.js (v16 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

```bash
# Login to MySQL
mysql -u root -p

# Run the schema file
source database/schema.sql
```

Or import via command line:
```bash
mysql -u root -p < database/schema.sql
```

### 3. Environment Configuration

Create `.env` file:

```bash
cp .env.example .env
```

Update `.env` with your configuration:

```env
PORT=8001
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=cronberry_assets
DB_PORT=3306
JWT_SECRET=your-secret-key
JWT_EXPIRE=24h
CORS_ORIGIN=http://localhost:3000
```

### 4. Run the Server

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

Server will run on: `http://localhost:8001`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Employees
- `GET /api/employees` - Get all employees (HR/Admin)
- `GET /api/employees/me` - Get employee profile (Employee)
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee
- `GET /api/employees/export` - Export to Excel
- `GET /api/employees/template` - Download template
- `POST /api/employees/import` - Import from Excel

### Assets (TO BE IMPLEMENTED)
- `GET /api/assets`
- `POST /api/assets`
- `PUT /api/assets/:id`
- `DELETE /api/assets/:id`

### Assignments (TO BE IMPLEMENTED)
- `GET /api/assignments`
- `POST /api/assignments`
- `PUT /api/assignments/:id`
- `DELETE /api/assignments/:id`

## Default Login

**Username:** admin
**Password:** admin123
**Role:** HR

## Database Schema

See `database/schema.sql` for complete database structure.

## Next Steps

1. ✅ Complete remaining route files (assets, assignments, dashboard, etc.)
2. ✅ Test all endpoints
3. ✅ Deploy to your server (AWS, Heroku, DigitalOcean)
4. ✅ Configure production environment variables
5. ✅ Set up SSL certificate
6. ✅ Configure MySQL for production

## Deployment

This backend can be deployed on:
- AWS EC2 + RDS (MySQL)
- Heroku + ClearDB
- DigitalOcean Droplet + Managed MySQL
- Any VPS with Node.js and MySQL support

## Important Notes

⚠️ **This code CANNOT run on Emergent platform**
- Emergent only supports FastAPI + MongoDB
- You must deploy this on external platforms
- Frontend (React) can still be on Emergent or deployed separately

## Support

For issues or questions about deployment, consult:
- Node.js documentation
- MySQL documentation
- Your hosting provider's documentation