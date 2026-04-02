import sys
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from database import db
from routes import auth, animals, health, upload
from passlib.context import CryptContext

# Force UTF-8 output so print() never crashes on Windows cp1252
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SAMPLE_ANIMALS = [
    {"name": "Buddy",   "species": "Dog",     "breed": "Golden Retriever",  "age": 2, "gender": "Male",
     "status": "available", "shelter_id": "demo_shelter", "image_emoji": "dog", "dob": "2023-03-12",
     "image_url": "https://www.grinrescue.org/templates/rt_requiem/custom/images/FrontPagePhotos/animated-golden.jpg",
     "description": "Friendly and energetic! Loves to play fetch and cuddle on lazy afternoons.",
     "story": "Buddy was surrendered by a family who relocated abroad and couldn't bring him along. He spent two weeks hiding under his blanket before a volunteer's patience coaxed him back out. Now he greets every visitor at the gate, tail spinning like a propeller.",
     "traits": ["Playful", "Affectionate", "Energetic", "Good with kids"]},
    {"name": "Luna",    "species": "Cat",     "breed": "Siamese",           "age": 3, "gender": "Female",
     "status": "available", "shelter_id": "demo_shelter", "image_emoji": "cat", "dob": "2022-07-04",
     "image_url": "https://images.unsplash.com/photo-1555169062-013468b47731?w=800",
     "description": "Elegant and affectionate. Loves window perches and cozy blankets.",
     "story": "Luna was found wandering a parking garage during a thunderstorm. She was malnourished but remarkably calm. After a month of rehabilitation she blossomed into a chatty, opinionated cat who will narrate your entire morning routine if you let her.",
     "traits": ["Vocal", "Curious", "Independent", "Gentle"]},
    {"name": "Charlie", "species": "Dog",     "breed": "Beagle",            "age": 1, "gender": "Male",
     "status": "available", "shelter_id": "demo_shelter", "image_emoji": "dog2", "dob": "2024-01-20",
     "image_url": "https://cdn.pixabay.com/photo/2022/04/25/10/23/beagle-7155540_1280.jpg",
     "description": "Curious and playful pup. Great with kids and other pets!",
     "story": "Charlie was the last of a litter brought in by a good samaritan who found the puppies in an abandoned lot. He took the longest to be weaned but made up for it by becoming the shelter's unofficial welcoming committee, bounding up to every newcomer.",
     "traits": ["Playful", "Friendly", "Mischievous", "Social"]},
    {"name": "Bella",   "species": "Cat",     "breed": "Persian",           "age": 4, "gender": "Female",
     "status": "adopted",   "shelter_id": "demo_shelter", "image_emoji": "cat2", "dob": "2021-05-30",
     "image_url": "https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?w=500",
     "description": "Calm and gentle princess. Loves lazy afternoons in the sun.",
     "story": "Bella came to us from a hoarding case — one of fourteen cats in a two-room apartment. Despite her rough start she carries herself with extraordinary dignity. She was adopted by a retired schoolteacher who says Bella has filled every quiet corner of the house.",
     "traits": ["Calm", "Dignified", "Gentle", "Shy at first"]},
    {"name": "Max",     "species": "Dog",     "breed": "German Shepherd",   "age": 5, "gender": "Male",
     "status": "available", "shelter_id": "demo_shelter", "image_emoji": "guide_dog", "dob": "2020-09-08",
     "image_url": "https://images.unsplash.com/photo-1589941013453-ec89f33b5e95?w=500",
     "description": "Loyal and highly intelligent. Well trained and great with families.",
     "story": "Max was a police K9 candidate who washed out of training — not for lack of skill but because he kept breaking protocol to comfort distressed civilians. His handler called it a disqualifying flaw. We call it his best quality.",
     "traits": ["Loyal", "Intelligent", "Protective", "Calm"]},
    {"name": "Cleo",    "species": "Rabbit",  "breed": "Holland Lop",       "age": 1, "gender": "Female",
     "status": "fostered",  "shelter_id": "demo_shelter", "image_emoji": "rabbit", "dob": "2024-03-01",
     "image_url": "https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=500",
     "description": "Fluffy and cuddly. Loves fresh veggies and morning hops.",
     "story": "Cleo was a classroom pet whose school closed unexpectedly. She arrived skittish and unsure, but within days discovered that thumping her back feet produced immediate attention from shelter staff. She's been running the place ever since.",
     "traits": ["Curious", "Energetic", "Affectionate", "Bold"]},
    {"name": "Oliver",  "species": "Cat",     "breed": "British Shorthair", "age": 2, "gender": "Male",
     "status": "available", "shelter_id": "demo_shelter", "image_emoji": "smiley_cat", "dob": "2023-06-15",
     "image_url": "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=500",
     "description": "Sociable and playful. Gets along splendidly with everyone.",
     "story": "Oliver showed up at the shelter's back door one winter morning, sitting neatly on the doorstep as if he had an appointment. No chip, no collar, no evident history. He has since made himself completely at home and considers the communal food bowl a personal buffet.",
     "traits": ["Sociable", "Relaxed", "Playful", "Food-motivated"]},
    {"name": "Daisy",   "species": "Dog",     "breed": "Labrador",          "age": 3, "gender": "Female",
     "status": "available", "shelter_id": "demo_shelter", "image_emoji": "paw", "dob": "2022-11-11",
     "image_url": "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=500",
     "description": "Sweet, gentle, and endlessly loving. The perfect family dog.",
     "story": "Daisy was left tied to a park bench with a note that read 'Please love her, we have to move.' Shelter workers found her sitting patiently, tail wagging at every passerby. She has never once stopped wagging since she walked through our doors.",
     "traits": ["Gentle", "Loving", "Patient", "Good with everyone"]},
    {"name": "Peanut",  "species": "Hamster", "breed": "Syrian",            "age": 1, "gender": "Male",
     "status": "available", "shelter_id": "demo_shelter", "image_emoji": "hamster", "dob": "2024-02-14",
     "image_url": "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=500",
     "description": "Tiny and adventurous. Loves his wheel and sunflower seeds.",
     "story": "Peanut was donated by a family whose son developed allergies. He arrived in an enormous cage full of tunnels and contraptions and took approximately four minutes to escape the first time. Staff now consider finding him a morning tradition.",
     "traits": ["Adventurous", "Clever", "Nocturnal", "Independent"]},
    {"name": "Tweety",  "species": "Bird",    "breed": "Canary",            "age": 2, "gender": "Male",
     "status": "available", "shelter_id": "demo_shelter", "image_emoji": "bird", "dob": "2023-04-22",
     "image_url": "https://images.unsplash.com/photo-1452570053594-1b985d6ea890?w=500",
     "description": "Bright yellow and full of song. Will serenade you every morning!",
     "story": "Tweety belonged to an elderly gentleman who passed away. His family brought Tweety to us with his entire setup and a handwritten list of his favourite songs. He still sings them every morning at precisely 7am, right on schedule.",
     "traits": ["Vocal", "Cheerful", "Routine-oriented", "Observant"]},
]

# Map slug keys -> display emoji (kept in Python, not stored in DB)
EMOJI_MAP = {
    "dog": "🐶", "dog2": "🐕", "cat": "🐱", "cat2": "🐈",
    "guide_dog": "🦮", "rabbit": "🐰", "smiley_cat": "😸",
    "paw": "🐾", "hamster": "🐹", "bird": "🐦",
}


SAMPLE_HEALTH = [
    {"animal_id": "buddy",   "animal_name": "Buddy",   "weight": 28.5, "temperature": 38.2, "last_checkup": "2025-03-10", "vet_name": "Dr. Sarah Mills",
     "vaccinations": [{"name": "Rabies",      "date_given": "2025-01-15", "next_due": "2026-01-15"},
                      {"name": "DHPP",        "date_given": "2025-01-15", "next_due": "2026-01-15"}]},
    {"animal_id": "luna",    "animal_name": "Luna",    "weight": 4.2,  "temperature": 38.6, "last_checkup": "2025-02-20", "vet_name": "Dr. James Patel",
     "vaccinations": [{"name": "FVRCP",       "date_given": "2025-02-01", "next_due": "2026-02-01"},
                      {"name": "Rabies",      "date_given": "2025-02-01", "next_due": "2026-02-01"}]},
    {"animal_id": "charlie", "animal_name": "Charlie", "weight": 12.1, "temperature": 38.4, "last_checkup": "2025-03-01", "vet_name": "Dr. Sarah Mills",
     "vaccinations": [{"name": "Bordetella",  "date_given": "2024-12-10", "next_due": "2025-12-10"},
                      {"name": "DHPP",        "date_given": "2024-12-10", "next_due": "2025-12-10"}]},
    {"animal_id": "bella",   "animal_name": "Bella",   "weight": 3.8,  "temperature": 38.5, "last_checkup": "2025-01-05", "vet_name": "Dr. James Patel",
     "vaccinations": [{"name": "FVRCP",       "date_given": "2025-01-05", "next_due": "2026-01-05"}]},
    {"animal_id": "max",     "animal_name": "Max",     "weight": 34.0, "temperature": 38.3, "last_checkup": "2025-03-15", "vet_name": "Dr. Sarah Mills",
     "vaccinations": [{"name": "Rabies",      "date_given": "2025-03-01", "next_due": "2026-03-01"},
                      {"name": "DHPP",        "date_given": "2025-03-01", "next_due": "2026-03-01"},
                      {"name": "Leptospirosis","date_given": "2025-03-01", "next_due": "2026-03-01"}]},
    {"animal_id": "cleo",    "animal_name": "Cleo",    "weight": 1.9,  "temperature": 38.8, "last_checkup": "2025-02-10", "vet_name": "Dr. Amy Chen",
     "vaccinations": [{"name": "RHDV2",       "date_given": "2025-02-10", "next_due": "2026-02-10"}]},
    {"animal_id": "oliver",  "animal_name": "Oliver",  "weight": 5.1,  "temperature": 38.4, "last_checkup": "2025-03-05", "vet_name": "Dr. Amy Chen",
     "vaccinations": [{"name": "FVRCP",       "date_given": "2025-03-05", "next_due": "2026-03-05"},
                      {"name": "Rabies",      "date_given": "2025-03-05", "next_due": "2026-03-05"}]},
    {"animal_id": "daisy",   "animal_name": "Daisy",   "weight": 26.3, "temperature": 38.1, "last_checkup": "2025-03-20", "vet_name": "Dr. Sarah Mills",
     "vaccinations": [{"name": "DHPP",        "date_given": "2025-03-10", "next_due": "2026-03-10"},
                      {"name": "Rabies",      "date_given": "2025-03-10", "next_due": "2026-03-10"}]},
    {"animal_id": "peanut",  "animal_name": "Peanut",  "weight": 0.18, "temperature": 37.5, "last_checkup": "2025-01-20", "vet_name": "Dr. Amy Chen",
     "vaccinations": []},
    {"animal_id": "tweety",  "animal_name": "Tweety",  "weight": 0.02, "temperature": 40.5, "last_checkup": "2025-02-15", "vet_name": "Dr. Amy Chen",
     "vaccinations": [{"name": "PBFD",        "date_given": "2025-02-15", "next_due": "2026-02-15"}]},
]


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

    await db.health.drop()
    await db.health.insert_many([dict(h) for h in SAMPLE_HEALTH])
    print("[OK] Dropped and re-seeded health records.")

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
app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(upload.router, prefix="/upload", tags=["Upload"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


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
