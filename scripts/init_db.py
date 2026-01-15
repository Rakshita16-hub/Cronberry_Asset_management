import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def init_db():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    existing_user = await db.users.find_one({"username": "admin"})
    
    if not existing_user:
        hashed_password = pwd_context.hash("admin123")
        await db.users.insert_one({
            "username": "admin",
            "password": hashed_password
        })
        print("Demo admin user created: username=admin, password=admin123")
    else:
        print("Admin user already exists")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(init_db())
