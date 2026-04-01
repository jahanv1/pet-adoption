#!/bin/bash
cd "$(dirname "$0")"
source venv/Scripts/activate

echo "Testing Atlas connection..."
python -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
MONGO_URL = 'mongodb+srv://sjahanvi027_db_user:oBEdzwG3pPIttl83@pet-adoption.juad06s.mongodb.net/pet_adoption?appName=pet-adoption'
async def test():
    client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=8000)
    try:
        await client.admin.command('ping')
        print('[OK] Atlas connected successfully!')
        return True
    except Exception as e:
        print('[FAIL] Still blocked:', str(e)[:120])
        return False
    finally:
        client.close()
asyncio.run(test())
"

echo ""
echo "Starting backend..."
PYTHONIOENCODING=utf-8 uvicorn main:app --reload --port 8000
