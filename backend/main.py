import sys
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import db
from routes import auth, animals
from passlib.context import CryptContext

# Force UTF-8 output so print() never crashes on Windows cp1252
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SAMPLE_ANIMALS = [
    {"name": "Buddy",   "species": "Dog",     "breed": "Golden Retriever",  "age": 2, "gender": "Male",
     "status": "available", "shelter_id": "demo_shelter", "image_emoji": "dog",
     "image_url": "https://www.grinrescue.org/templates/rt_requiem/custom/images/FrontPagePhotos/animated-golden.jpg",
     "description": "Friendly and energetic! Loves to play fetch and cuddle on lazy afternoons."},
    {"name": "Luna",    "species": "Cat",     "breed": "Siamese",           "age": 3, "gender": "Female",
     "status": "available", "shelter_id": "demo_shelter", "image_emoji": "cat",
     "image_url": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQFAXJT5jqBTHQ-E3aqbhxKUZX48-hGDajnww&s",
     "description": "Elegant and affectionate. Loves window perches and cozy blankets."},
    {"name": "Charlie", "species": "Dog",     "breed": "Beagle",            "age": 1, "gender": "Male",
     "status": "available", "shelter_id": "demo_shelter", "image_emoji": "dog2",
     "image_url": "https://cdn.pixabay.com/photo/2022/04/25/10/23/beagle-7155540_1280.jpg",
     "description": "Curious and playful pup. Great with kids and other pets!"},
    {"name": "Bella",   "species": "Cat",     "breed": "Persian",           "age": 4, "gender": "Female",
     "status": "adopted",   "shelter_id": "demo_shelter", "image_emoji": "cat2",
     "image_url": "https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?w=500",
     "description": "Calm and gentle princess. Loves lazy afternoons in the sun."},
    {"name": "Max",     "species": "Dog",     "breed": "German Shepherd",   "age": 5, "gender": "Male",
     "status": "available", "shelter_id": "demo_shelter", "image_emoji": "guide_dog",
     "image_url": "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=500",
     "description": "Loyal and highly intelligent. Well trained and great with families."},
    {"name": "Cleo",    "species": "Rabbit",  "breed": "Holland Lop",       "age": 1, "gender": "Female",
     "status": "fostered",  "shelter_id": "demo_shelter", "image_emoji": "rabbit",
     "image_url": "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=500",
     "description": "Fluffy and cuddly. Loves fresh veggies and morning hops."},
    {"name": "Oliver",  "species": "Cat",     "breed": "British Shorthair", "age": 2, "gender": "Male",
     "status": "available", "shelter_id": "demo_shelter", "image_emoji": "smiley_cat",
     "image_url": "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=500",
     "description": "Sociable and playful. Gets along splendidly with everyone."},
    {"name": "Daisy",   "species": "Dog",     "breed": "Labrador",          "age": 3, "gender": "Female",
     "status": "available", "shelter_id": "demo_shelter", "image_emoji": "paw",
     "image_url": "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=500",
     "description": "Sweet, gentle, and endlessly loving. The perfect family dog."},
    {"name": "Peanut",  "species": "Hamster", "breed": "Syrian",            "age": 1, "gender": "Male",
     "status": "available", "shelter_id": "demo_shelter", "image_emoji": "hamster",
     "image_url": "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=500",
     "description": "Tiny and adventurous. Loves his wheel and sunflower seeds."},
    {"name": "Tweety",  "species": "Bird",    "breed": "Canary",            "age": 2, "gender": "Male",
     "status": "available", "shelter_id": "demo_shelter", "image_emoji": "bird",
     "image_url": "https://images.unsplash.com/photo-1452570053594-1b985d6ea890?w=500",
     "description": "Bright yellow and full of song. Will serenade you every morning!"},
]

# Map slug keys -> display emoji (kept in Python, not stored in DB)
EMOJI_MAP = {
    "dog": "🐶", "dog2": "🐕", "cat": "🐱", "cat2": "🐈",
    "guide_dog": "🦮", "rabbit": "🐰", "smiley_cat": "😸",
    "paw": "🐾", "hamster": "🐹", "bird": "🐦",
}


async def seed_database():
    """Drop and re-seed animals; create demo accounts if missing."""
    animals_to_insert = []
    for a in SAMPLE_ANIMALS:
        doc = dict(a)
        doc["image_emoji"] = EMOJI_MAP.get(doc["image_emoji"], "🐾")
        animals_to_insert.append(doc)

    await db.animals.drop()
    await db.animals.insert_many(animals_to_insert)
    print("[OK] Dropped and re-seeded animals.")

    if not await db.shelters.find_one({"email": "demo@shelter.com"}):
        await db.shelters.insert_one({
            "name": "Happy Paws Shelter",
            "address": "123 Pet Street, Animal City",
            "capacity": 50,
            "contact_no": "+1-555-0100",
            "email": "demo@shelter.com",
            "password_hash": pwd_context.hash("demo123"),
        })
        print("[OK] Seeded demo shelter  (demo@shelter.com / demo123)")

    if not await db.adopters.find_one({"email": "demo@adopter.com"}):
        await db.adopters.insert_one({
            "name": "Jane Adopter",
            "address": "456 Home Lane, Pet Town",
            "contact_no": "+1-555-0200",
            "email": "demo@adopter.com",
            "password_hash": pwd_context.hash("demo123"),
        })
        print("[OK] Seeded demo adopter  (demo@adopter.com / demo123)")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await seed_database()
    except Exception as e:
        msg = str(e)[:200]
        print(f"[WARN] Could not seed database: {msg}")
        print("[WARN] Server starting anyway. Fix Atlas Network Access and restart.")
    yield


app = FastAPI(title="PawsHome API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173",
                   "http://localhost:5174", "http://127.0.0.1:5174",
                   "https://thepawshome.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(animals.router, prefix="/animals", tags=["Animals"])


@app.get("/", tags=["Health"])
async def root():
    return {"message": "PawsHome API is running", "docs": "/docs"}


@app.post("/seed", tags=["Admin"])
async def manual_seed():
    """Manually trigger database seeding (call after fixing Atlas access)."""
    try:
        await seed_database()
        return {"status": "ok", "message": "Database seeded successfully"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
