# Cronberry Assets Tracker - User Guide

## Overview
Cronberry Assets Tracker is a comprehensive asset management system with role-based access control for HR/Admin and Employee users.

---

## User Roles & Access

### 1. HR / Admin Users
**Login Credentials:**
- Username: `admin`
- Password: `admin123`
- Role: HR

**Capabilities:**
- ✅ Full access to all employees records
- ✅ Full access to all assets records
- ✅ Create, edit, delete employees
- ✅ Create, edit, delete assets
- ✅ Assign assets to employees
- ✅ Mark assets as returned
- ✅ View dashboard statistics
- ✅ Search employees and view their assigned assets
- ✅ Export asset assignments to Excel
- ✅ View pending returns alerts for exit employees

**Dashboard Features:**
- Total Assets count
- Assigned Assets count
- Available Assets count
- Total Employees count
- Pending Asset Returns section (shows exit employees with unreturned assets)

---

### 2. Employee Users
**Login Credentials (Example):**
- Username: `emp_emp0001`
- Password: `employee123`
- Role: Employee

**Capabilities:**
- ✅ View own profile information
- ✅ View assets assigned to them
- ✅ See assigned dates and return status
- ✅ View remarks on assignments
- ❌ Cannot view other employees' data
- ❌ Cannot edit any records
- ❌ Read-only access to own information

**Dashboard Features:**
- Personal profile card with details
- List of currently assigned assets
- Assigned and return dates
- Asset status (In Use / Returned)
- Alert notification if status is "Exit" with unreturned assets

---

## Auto-Reminder System for Exit Employees

### How It Works:
1. When an employee's status is changed to "Exit"
2. System checks if they have any unreturned assets (assignments without return date)
3. If unreturned assets found:
   - **HR Dashboard**: Shows "Pending Asset Returns" section with:
     - Employee name, ID, and email
     - List of all unreturned assets
     - Assigned dates
     - "Action Required" badge
   - **Employee Dashboard**: Shows alert message:
     - "You have unreturned assets. Please return all company assets before your last working day."

### For HR:
- Section appears automatically on dashboard when exit employees have pending returns
- Shows count of affected employees
- Lists each unreturned asset with details
- Helps HR follow up proactively

---

## Creating Employee Login Accounts

### For HR/Admin:
When you add a new employee to the system, you can create their login account:

1. Employee must first exist in Employees table
2. Login format: `emp_` + lowercase employee_id
   - Example: If Employee ID is EMP0005, username is `emp_emp0005`
3. Default password: `employee123` (should be changed on first login)
4. Employee account is automatically linked to their employee record

**Manual Account Creation:**
Contact your system administrator or use the database script to create employee accounts.

---

## Key Features

### 1. Asset Assignment Flow
1. HR selects employee and available asset
2. Sets assigned date
3. Optionally adds remarks
4. **Automatic Action**: Asset status changes to "Assigned"
5. When return date is added: Asset status changes back to "Available"

### 2. Search Functionality
- Search employees by:
  - Full name
  - Employee ID
  - Department
- Results show currently assigned assets for each employee

### 3. Export to Excel
- Click "Export to Excel" button on Assignments page
- Downloads complete asset assignment history
- Includes all fields: Assignment ID, Employee, Asset, Dates, Remarks

### 4. Data Privacy & Security
- JWT-based authentication
- Role-based access control
- Employees can only see their own data
- Automatic session management
- Protected routes prevent unauthorized access

---

## Mobile Responsive
- Works seamlessly on desktop and mobile browsers
- Sidebar collapses on mobile with toggle button
- Tables scroll horizontally on small screens
- Touch-friendly interface

---

## Brand Identity
**Logo**: Custom company logo with Cronberry branding
**Colors**:
- Primary: Deep Navy (#0B1F3A)
- Accent: Berry Pink (#D81B60)
- Clean, professional HR-friendly design

---

## Support & Troubleshooting

### Common Issues:

**"Access Denied" Error:**
- You're trying to access a feature not available for your role
- Employees cannot access HR management pages
- Check if you're logged in with the correct account type

**Assets Not Showing in Employee Dashboard:**
- Only assets currently assigned (without return date) are shown
- Returned assets won't appear in "My Assigned Assets"
- Contact HR if you believe an asset should be listed

**Can't Login:**
- Verify username format (employees use `emp_` prefix)
- Check if account has been created by HR
- Ensure Caps Lock is off
- Contact HR for password reset

---

## Best Practices

### For HR/Admin:
1. Regular review of "Pending Asset Returns" section
2. Update employee status to "Exit" as soon as notice period starts
3. Mark return dates promptly when assets are returned
4. Use remarks field for important notes (e.g., asset condition)
5. Export data regularly for backup and reporting

### For Employees:
1. Check dashboard regularly to track your assigned assets
2. Report any discrepancies to HR immediately
3. Return assets before your last working day if status is "Exit"
4. Keep HR informed if asset condition changes

---

## Future Enhancements
- Email notifications for asset assignments
- SMS reminders for exit employees
- Asset maintenance tracking
- Asset history and audit logs
- Bulk import for employees and assets
- Asset utilization reports
- Department-wise asset allocation analytics

---

**Version**: 2.0
**Last Updated**: January 2025
