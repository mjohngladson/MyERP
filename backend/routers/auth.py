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

@router.post("/logout")
async def logout():
    """User logout"""
    return {"message": "Logout successful"}