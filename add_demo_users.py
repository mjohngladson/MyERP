#!/usr/bin/env python3
"""
Script to add demo users to Railway MongoDB database
"""
import asyncio
import uuid
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
import os

# Railway MongoDB connection
MONGO_URL = "mongodb://mongo:AYzalgageGScZzmALZfWZdCyWUTblaVY@mongodb-production-666b.up.railway.app:27017"
DB_NAME = "railway"

async def add_demo_users():
    """Add demo users to Railway database"""
    try:
        # Connect to database
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        users_collection = db.users
        
        print("🚀 Connecting to Railway MongoDB...")
        
        # Check if users already exist
        existing_admin = await users_collection.find_one({"email": "admin@gili.com"})
        if existing_admin:
            print("✅ Demo users already exist")
            return
        
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
        print(f"✅ Created {len(result.inserted_ids)} demo users in Railway database")
        print("📧 Demo users: admin@gili.com, john.doe@company.com, jane.smith@company.com")
        print("🔑 Password for all: admin123")
        
    except Exception as e:
        print(f"❌ Error adding demo users: {str(e)}")
    finally:
        if 'client' in locals():
            client.close()

if __name__ == "__main__":
    asyncio.run(add_demo_users())