from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List
import uuid
from datetime import datetime

# Import routers
from routers import dashboard, auth, sales, search, reporting, invoices, quotations, purchase
from routers.purchase_invoices import router as purchase_invoices_router
from routers.pos_integration import get_pos_router
from routers.stock import router as stock_router
from routers.general_settings import router as general_settings_router
from routers.master_data import router as master_data_router
from routers.credit_notes import router as credit_notes_router
from routers.debit_notes import router as debit_notes_router
from routers.financial import get_financial_router
from database import init_sample_data

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="GiLi API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models (keeping original for compatibility)
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.post("/create-demo-users")
async def create_demo_users():
    """Create demo users directly"""
    try:
        import uuid
        from datetime import datetime
        from database import users_collection
        
        # Check if users already exist
        existing_admin = await users_collection.find_one({"email": "admin@gili.com"})
        if existing_admin:
            return {"message": "Demo users already exist"}
        
        # Create demo users
        demo_users = [
            {
                "id": str(uuid.uuid4()),
                "name": "Admin User",
                "email": "admin@gili.com", 
                "password": "admin123",
                "role": "System Manager",
                "avatar": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
                "company_id": "default_company",
                "created_at": datetime.utcnow()
            },
        ]
        
        # Insert users
        result = await users_collection.insert_many(demo_users)
        return {
            "message": f"Created {len(result.inserted_ids)} demo users",
            "users": ["admin@gili.com"],
            "password": "admin123"
        }
        
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Error creating demo users: {str(e)}")

@api_router.get("/")
async def root():
    return {"message": "GiLi API is running"}

@api_router.post("/status", response_model=List[StatusCheck])
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return [status_obj]

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include all routers
app.include_router(api_router)
app.include_router(dashboard.router)
app.include_router(auth.router)
app.include_router(sales.router)
app.include_router(search.router)
app.include_router(reporting.router)
app.include_router(invoices.router)
app.include_router(quotations.router)
app.include_router(purchase.router)
app.include_router(purchase_invoices_router)
app.include_router(stock_router)
app.include_router(general_settings_router)
app.include_router(master_data_router)
app.include_router(credit_notes_router)
app.include_router(debit_notes_router)
app.include_router(get_pos_router())

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        "*",  # Allow all origins for development
        "https://ui-production-ccf6.up.railway.app",  # Railway frontend
        "https://crediti-debi.preview.emergentagent.com",  # Development frontend
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    """Initialize sample data on startup"""
    await init_sample_data()
    logger.info("✅ GiLi API started successfully")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Railway-compatible server startup
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8001))
    logger.info(f"🚀 Starting GiLi API on port {port}")
    uvicorn.run(
        "server:app", 
        host="0.0.0.0", 
        port=port,
        log_level="info",
        access_log=True
    )