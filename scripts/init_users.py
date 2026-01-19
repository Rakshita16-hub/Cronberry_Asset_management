import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def init_users():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Create HR/Admin user
    existing_admin = await db.users.find_one({"username": "admin"})
    if not existing_admin:
        hashed_password = pwd_context.hash("admin123")
        await db.users.insert_one({
            "username": "admin",
            "password": hashed_password,
            "role": "HR"
        })
        print("Admin user created: username=admin, password=admin123, role=HR")
    else:
        # Update existing admin to have role
        await db.users.update_one(
            {"username": "admin"},
            {"$set": {"role": "HR"}}
        )
        print("Admin user updated with HR role")
    
    # Create employee user linked to employee record
    # First check if we have any employee
    employee = await db.employees.find_one({}, {"_id": 0})
    if employee:
        employee_username = f"emp_{employee['employee_id'].lower()}"
        existing_employee_user = await db.users.find_one({"username": employee_username})
        
        if not existing_employee_user:
            hashed_password = pwd_context.hash("employee123")
            await db.users.insert_one({
                "username": employee_username,
                "password": hashed_password,
                "role": "Employee",
                "employee_id": employee['employee_id']
            })
            print(f"Employee user created: username={employee_username}, password=employee123, role=Employee, linked to={employee['employee_id']}")
        else:
            print(f"Employee user {employee_username} already exists")
    else:
        print("No employees found in database to create employee user")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(init_users())