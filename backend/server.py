from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from io import BytesIO

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class Employee(BaseModel):
    model_config = ConfigDict(extra="ignore")
    employee_id: str
    full_name: str
    department: str
    designation: str
    email: EmailStr
    date_of_joining: str
    status: str

class EmployeeCreate(BaseModel):
    full_name: str
    department: str
    designation: str
    email: EmailStr
    date_of_joining: str
    status: str = "Active"

class Asset(BaseModel):
    model_config = ConfigDict(extra="ignore")
    asset_id: str
    asset_name: str
    category: str
    brand: str
    serial_number: str
    condition: str
    status: str

class AssetCreate(BaseModel):
    asset_name: str
    category: str
    brand: str
    serial_number: str
    condition: str = "New"
    status: str = "Available"

class Assignment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    assignment_id: str
    employee_id: str
    employee_name: str
    asset_id: str
    asset_name: str
    assigned_date: str
    return_date: Optional[str] = None
    remarks: Optional[str] = None

class AssignmentCreate(BaseModel):
    employee_id: str
    asset_id: str
    assigned_date: str
    return_date: Optional[str] = None
    remarks: Optional[str] = None

class DashboardStats(BaseModel):
    total_assets: int
    assigned_assets: int
    available_assets: int
    total_employees: int

@api_router.post("/auth/login", response_model=LoginResponse)
async def login(login_req: LoginRequest):
    user = await db.users.find_one({"username": login_req.username}, {"_id": 0})
    if not user or not verify_password(login_req.password, user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": user["username"]})
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/auth/me")
async def get_me(username: str = Depends(get_current_user)):
    return {"username": username}

@api_router.get("/employees", response_model=List[Employee])
async def get_employees(username: str = Depends(get_current_user)):
    employees = await db.employees.find({}, {"_id": 0}).to_list(1000)
    return employees

@api_router.post("/employees", response_model=Employee)
async def create_employee(employee: EmployeeCreate, username: str = Depends(get_current_user)):
    count = await db.employees.count_documents({})
    employee_id = f"EMP{str(count + 1).zfill(4)}"
    
    employee_dict = employee.model_dump()
    employee_dict["employee_id"] = employee_id
    
    await db.employees.insert_one(employee_dict)
    return Employee(**employee_dict)

@api_router.put("/employees/{employee_id}", response_model=Employee)
async def update_employee(employee_id: str, employee: EmployeeCreate, username: str = Depends(get_current_user)):
    employee_dict = employee.model_dump()
    result = await db.employees.update_one({"employee_id": employee_id}, {"$set": employee_dict})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    employee_dict["employee_id"] = employee_id
    return Employee(**employee_dict)

@api_router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, username: str = Depends(get_current_user)):
    result = await db.employees.delete_one({"employee_id": employee_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"message": "Employee deleted successfully"}

@api_router.get("/assets", response_model=List[Asset])
async def get_assets(username: str = Depends(get_current_user)):
    assets = await db.assets.find({}, {"_id": 0}).to_list(1000)
    return assets

@api_router.post("/assets", response_model=Asset)
async def create_asset(asset: AssetCreate, username: str = Depends(get_current_user)):
    count = await db.assets.count_documents({})
    asset_id = f"AST{str(count + 1).zfill(4)}"
    
    asset_dict = asset.model_dump()
    asset_dict["asset_id"] = asset_id
    
    await db.assets.insert_one(asset_dict)
    return Asset(**asset_dict)

@api_router.put("/assets/{asset_id}", response_model=Asset)
async def update_asset(asset_id: str, asset: AssetCreate, username: str = Depends(get_current_user)):
    asset_dict = asset.model_dump()
    result = await db.assets.update_one({"asset_id": asset_id}, {"$set": asset_dict})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    asset_dict["asset_id"] = asset_id
    return Asset(**asset_dict)

@api_router.delete("/assets/{asset_id}")
async def delete_asset(asset_id: str, username: str = Depends(get_current_user)):
    result = await db.assets.delete_one({"asset_id": asset_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Asset not found")
    return {"message": "Asset deleted successfully"}

@api_router.get("/assignments", response_model=List[Assignment])
async def get_assignments(username: str = Depends(get_current_user)):
    assignments = await db.assignments.find({}, {"_id": 0}).to_list(1000)
    return assignments

@api_router.post("/assignments", response_model=Assignment)
async def create_assignment(assignment: AssignmentCreate, username: str = Depends(get_current_user)):
    employee = await db.employees.find_one({"employee_id": assignment.employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    asset = await db.assets.find_one({"asset_id": assignment.asset_id}, {"_id": 0})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    if asset["status"] == "Assigned":
        raise HTTPException(status_code=400, detail="Asset is already assigned")
    
    count = await db.assignments.count_documents({})
    assignment_id = f"ASG{str(count + 1).zfill(4)}"
    
    assignment_dict = assignment.model_dump()
    assignment_dict["assignment_id"] = assignment_id
    assignment_dict["employee_name"] = employee["full_name"]
    assignment_dict["asset_name"] = asset["asset_name"]
    
    await db.assignments.insert_one(assignment_dict)
    await db.assets.update_one({"asset_id": assignment.asset_id}, {"$set": {"status": "Assigned"}})
    
    return Assignment(**assignment_dict)

@api_router.put("/assignments/{assignment_id}", response_model=Assignment)
async def update_assignment(assignment_id: str, assignment: AssignmentCreate, username: str = Depends(get_current_user)):
    existing = await db.assignments.find_one({"assignment_id": assignment_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    employee = await db.employees.find_one({"employee_id": assignment.employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    asset = await db.assets.find_one({"asset_id": assignment.asset_id}, {"_id": 0})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    assignment_dict = assignment.model_dump()
    assignment_dict["employee_name"] = employee["full_name"]
    assignment_dict["asset_name"] = asset["asset_name"]
    
    if assignment.return_date and not existing.get("return_date"):
        await db.assets.update_one({"asset_id": assignment.asset_id}, {"$set": {"status": "Available"}})
    elif not assignment.return_date and existing.get("return_date"):
        await db.assets.update_one({"asset_id": assignment.asset_id}, {"$set": {"status": "Assigned"}})
    
    await db.assignments.update_one({"assignment_id": assignment_id}, {"$set": assignment_dict})
    
    assignment_dict["assignment_id"] = assignment_id
    return Assignment(**assignment_dict)

@api_router.delete("/assignments/{assignment_id}")
async def delete_assignment(assignment_id: str, username: str = Depends(get_current_user)):
    assignment = await db.assignments.find_one({"assignment_id": assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    await db.assets.update_one({"asset_id": assignment["asset_id"]}, {"$set": {"status": "Available"}})
    await db.assignments.delete_one({"assignment_id": assignment_id})
    
    return {"message": "Assignment deleted successfully"}

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(username: str = Depends(get_current_user)):
    total_assets = await db.assets.count_documents({})
    assigned_assets = await db.assets.count_documents({"status": "Assigned"})
    available_assets = await db.assets.count_documents({"status": "Available"})
    total_employees = await db.employees.count_documents({})
    
    return {
        "total_assets": total_assets,
        "assigned_assets": assigned_assets,
        "available_assets": available_assets,
        "total_employees": total_employees
    }

@api_router.get("/search/employees")
async def search_employees(q: str, username: str = Depends(get_current_user)):
    query = {
        "$or": [
            {"full_name": {"$regex": q, "$options": "i"}},
            {"employee_id": {"$regex": q, "$options": "i"}},
            {"department": {"$regex": q, "$options": "i"}}
        ]
    }
    employees = await db.employees.find(query, {"_id": 0}).to_list(100)
    
    for employee in employees:
        assignments = await db.assignments.find(
            {"employee_id": employee["employee_id"], "return_date": None},
            {"_id": 0}
        ).to_list(100)
        employee["assigned_assets"] = assignments
    
    return employees

@api_router.get("/assignments/export")
async def export_assignments(username: str = Depends(get_current_user)):
    assignments = await db.assignments.find({}, {"_id": 0}).to_list(1000)
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Asset Assignments"
    
    headers = ["Assignment ID", "Employee ID", "Employee Name", "Asset ID", "Asset Name", "Assigned Date", "Return Date", "Remarks"]
    ws.append(headers)
    
    for assignment in assignments:
        ws.append([
            assignment.get("assignment_id", ""),
            assignment.get("employee_id", ""),
            assignment.get("employee_name", ""),
            assignment.get("asset_id", ""),
            assignment.get("asset_name", ""),
            assignment.get("assigned_date", ""),
            assignment.get("return_date", ""),
            assignment.get("remarks", "")
        ])
    
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=asset_assignments.xlsx"}
    )

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()