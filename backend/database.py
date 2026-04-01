from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "pet_adoption")

client = AsyncIOMotorClient(
    MONGO_URL,
    serverSelectionTimeoutMS=5000,   # fail fast instead of 30s
    connectTimeoutMS=5000,
    socketTimeoutMS=10000,
)
db = client[DB_NAME]
