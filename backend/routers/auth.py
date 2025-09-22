from fastapi import APIRouter, HTTPException
from database import users_collection, companies_collection
from models import User, UserLogin
from typing import Optional

router = APIRouter(prefix="/api/auth", tags=["authentication"])

@router.post("/setup-demo")
async def setup_demo():
    """Setup demo environment with users"""
    try:
        import uuid
        from datetime import datetime
        
        # Create demo users directly
        demo_users = [
            {
                "_id": str(uuid.uuid4()),
                "id": str(uuid.uuid4()),
                "name": "Admin User",
                "email": "admin@gili.com",
                "password": "admin123",
                "role": "System Manager",
                "avatar": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
                "company_id": "default_company",
                "created_at": datetime.utcnow()
            }
        ]
        
        # Clear existing users with same email and recreate
        await users_collection.delete_many({"email": "admin@gili.com"})
        result = await users_collection.insert_many(demo_users)
        
        return {
            "success": True,
            "message": "Demo setup completed",
            "users_created": len(result.inserted_ids),
            "demo_login": {
                "email": "admin@gili.com", 
                "password": "admin123"
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Demo setup failed"
        }

@router.post("/login")
async def login(user_login: UserLogin):
    """User login with automatic demo user creation"""
    try:
        # Find user by email
        user = await users_collection.find_one({"email": user_login.email})
        
        # If it's a demo email and user doesn't exist, create it immediately
        if not user and user_login.email == "admin@gili.com" and user_login.password == "admin123":
            import uuid
            from datetime import datetime
            
            demo_user = {
                "_id": str(uuid.uuid4()),
                "id": str(uuid.uuid4()),
                "name": "Admin User", 
                "email": "admin@gili.com",
                "password": "admin123",
                "role": "System Manager",
                "avatar": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
                "company_id": "default_company",
                "created_at": datetime.utcnow()
            }
            
            await users_collection.insert_one(demo_user)
            user = demo_user
            print(f"✅ Created demo user on-demand: {user_login.email}")
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Check password
        if user.get("password") != user_login.password:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Remove password and _id from response
        user_data = {k: v for k, v in user.items() if k not in ["password", "_id"]}
        
        return {
            "success": True,
            "user": user_data,
            "token": "demo_token_" + user["id"],
            "message": "Login successful"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Login error: {str(e)}")
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