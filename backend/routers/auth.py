from fastapi import APIRouter, HTTPException
from database import users_collection, companies_collection
from models import User, UserLogin
from typing import Optional

router = APIRouter(prefix="/api/auth", tags=["authentication"])

@router.post("/login")
async def login(user_login: UserLogin):
    """User login (simplified for demo)"""
    try:
        # Find user by email
        user = await users_collection.find_one({"email": user_login.email})
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Check password (simplified for demo - in production use hashed passwords)
        if user.get("password") != user_login.password:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Return user data (in real app, return JWT token)
        # Remove password from response
        user_data = {k: v for k, v in user.items() if k != "password"}
        
        return {
            "user": User(**user_data),
            "token": "demo_token_" + user["id"],
            "message": "Login successful"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")

@router.get("/me", response_model=User)
async def get_current_user(user_id: str = "default_user"):
    """Get current user profile"""
    try:
        # In a real application, extract user_id from JWT token
        user = await users_collection.find_one({"id": user_id})
        
        if not user:
            # Return default user for demo
            users = await users_collection.find().limit(1).to_list(1)
            if users:
                user = users[0]
            else:
                raise HTTPException(status_code=404, detail="User not found")
        
        return User(**user)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user: {str(e)}")

@router.post("/create-demo-users")
async def create_demo_users():
    """Create demo users directly"""
    try:
        import uuid
        from datetime import datetime
        
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
            {
                "id": str(uuid.uuid4()),
                "name": "John Doe",
                "email": "john.doe@company.com",
                "password": "admin123", 
                "role": "Sales Manager",
                "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
                "company_id": "default_company",
                "created_at": datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Jane Smith",
                "email": "jane.smith@company.com",
                "password": "admin123",
                "role": "Purchase Manager", 
                "avatar": "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
                "company_id": "default_company",
                "created_at": datetime.utcnow()
            }
        ]
        
        # Insert users
        result = await users_collection.insert_many(demo_users)
        return {
            "message": f"Created {len(result.inserted_ids)} demo users",
            "users": ["admin@gili.com", "john.doe@company.com", "jane.smith@company.com"],
            "password": "admin123"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating demo users: {str(e)}")

@router.post("/logout")
async def logout():
    """User logout"""
    return {"message": "Logout successful"}