from fastapi import APIRouter, HTTPException, status
from database import db
from models.schemas import ShelterRegister, ShelterLogin, AdopterRegister, AdopterLogin
from auth.jwt_handler import create_access_token
from passlib.context import CryptContext

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── Shelter ──────────────────────────────────────────────────────────────────

@router.post("/shelter/register", status_code=201)
async def register_shelter(data: ShelterRegister):
    if await db.shelters.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    doc = {
        "name": data.name,
        "address": data.address,
        "capacity": data.capacity,
        "contact_no": data.contact_no,
        "email": data.email,
        "password_hash": hash_password(data.password),
    }
    result = await db.shelters.insert_one(doc)
    shelter_id = str(result.inserted_id)
    token = create_access_token(
        {"sub": shelter_id, "email": data.email, "name": data.name}, "shelter"
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_type": "shelter",
        "shelter_id": shelter_id,
        "name": data.name,
        "email": data.email,
    }


@router.post("/shelter/login")
async def login_shelter(data: ShelterLogin):
    shelter = await db.shelters.find_one({"email": data.email})
    if not shelter or not verify_password(data.password, shelter["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    shelter_id = str(shelter["_id"])
    token = create_access_token(
        {"sub": shelter_id, "email": shelter["email"], "name": shelter["name"]}, "shelter"
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_type": "shelter",
        "shelter_id": shelter_id,
        "name": shelter["name"],
        "email": shelter["email"],
    }


# ── Adopter ───────────────────────────────────────────────────────────────────

@router.post("/adopter/register", status_code=201)
async def register_adopter(data: AdopterRegister):
    if await db.adopters.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    doc = {
        "name": data.name,
        "address": data.address,
        "contact_no": data.contact_no,
        "email": data.email,
        "password_hash": hash_password(data.password),
    }
    result = await db.adopters.insert_one(doc)
    adopter_id = str(result.inserted_id)
    token = create_access_token(
        {"sub": adopter_id, "email": data.email, "name": data.name}, "adopter"
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_type": "adopter",
        "adopter_id": adopter_id,
        "name": data.name,
        "email": data.email,
    }


@router.post("/adopter/login")
async def login_adopter(data: AdopterLogin):
    adopter = await db.adopters.find_one({"email": data.email})
    if not adopter or not verify_password(data.password, adopter["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    adopter_id = str(adopter["_id"])
    token = create_access_token(
        {"sub": adopter_id, "email": adopter["email"], "name": adopter["name"]}, "adopter"
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_type": "adopter",
        "adopter_id": adopter_id,
        "name": adopter["name"],
        "email": adopter["email"],
    }
