from fastapi import APIRouter, HTTPException, Request
from models.schemas import ShelterRegister, ShelterLogin, AdopterRegister, AdopterLogin
from auth.jwt_handler import create_access_token
from passlib.context import CryptContext
import os

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
DB_TYPE = os.getenv("DB_TYPE", "mongo")


def _record_login(user_type: str, user_id: int, email: str, ip: str):
    if DB_TYPE != "mysql":
        return
    try:
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO login_history (user_type, user_id, email, ip_address) VALUES (%s,%s,%s,%s)",
            (user_type, user_id, email, ip)
        )
        conn.commit()
        cursor.close(); conn.close()
    except Exception:
        pass


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── Shelter ───────────────────────────────────────────────────────────────────

@router.post("/shelter/register", status_code=201)
async def register_shelter(data: ShelterRegister):
    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT shelter_id FROM shelter WHERE email = %s", (data.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")
        hashed = hash_password(data.password)
        cursor.execute(
            "INSERT INTO shelter (name, address, capacity, contact_no, email, password_hash) VALUES (%s,%s,%s,%s,%s,%s)",
            (data.name, data.address, data.capacity, data.contact_no, data.email, hashed)
        )
        conn.commit()
        shelter_id = str(cursor.lastrowid)
        cursor.close(); conn.close()
    else:
        from database import db
        if await db.shelters.find_one({"email": data.email}):
            raise HTTPException(status_code=400, detail="Email already registered")
        doc = {"name": data.name, "address": data.address, "capacity": data.capacity,
               "contact_no": data.contact_no, "email": data.email, "password_hash": hash_password(data.password)}
        result = await db.shelters.insert_one(doc)
        shelter_id = str(result.inserted_id)

    token = create_access_token({"sub": shelter_id, "email": data.email, "name": data.name}, "shelter")
    return {"access_token": token, "token_type": "bearer", "user_type": "shelter",
            "shelter_id": shelter_id, "name": data.name, "email": data.email}


@router.post("/shelter/login")
async def login_shelter(data: ShelterLogin, request: Request):
    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM shelter WHERE email = %s", (data.email,))
        shelter = cursor.fetchone()
        cursor.close(); conn.close()
        if not shelter or not verify_password(data.password, shelter["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        shelter_id = str(shelter["shelter_id"])
        name = shelter["name"]
        email = shelter["email"]
        _record_login("shelter", int(shelter_id), email, request.client.host)
    else:
        from database import db
        shelter = await db.shelters.find_one({"email": data.email})
        if not shelter or not verify_password(data.password, shelter["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        shelter_id = str(shelter["_id"])
        name = shelter["name"]
        email = shelter["email"]

    token = create_access_token({"sub": shelter_id, "email": email, "name": name}, "shelter")
    return {"access_token": token, "token_type": "bearer", "user_type": "shelter",
            "shelter_id": shelter_id, "name": name, "email": email}


# ── Adopter ───────────────────────────────────────────────────────────────────

@router.post("/adopter/register", status_code=201)
async def register_adopter(data: AdopterRegister):
    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT adopt_id FROM adopter WHERE email = %s", (data.email,))
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")
        hashed = hash_password(data.password)
        cursor.execute(
            "INSERT INTO adopter (name, address, contact_no, email, password_hash) VALUES (%s,%s,%s,%s,%s)",
            (data.name, data.address, data.contact_no, data.email, hashed)
        )
        conn.commit()
        adopter_id = str(cursor.lastrowid)
        cursor.close(); conn.close()
    else:
        from database import db
        if await db.adopters.find_one({"email": data.email}):
            raise HTTPException(status_code=400, detail="Email already registered")
        doc = {"name": data.name, "address": data.address, "contact_no": data.contact_no,
               "email": data.email, "password_hash": hash_password(data.password)}
        result = await db.adopters.insert_one(doc)
        adopter_id = str(result.inserted_id)

    token = create_access_token({"sub": adopter_id, "email": data.email, "name": data.name}, "adopter")
    return {"access_token": token, "token_type": "bearer", "user_type": "adopter",
            "adopter_id": adopter_id, "name": data.name, "email": data.email}


@router.post("/adopter/login")
async def login_adopter(data: AdopterLogin, request: Request):
    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM adopter WHERE email = %s", (data.email,))
        adopter = cursor.fetchone()
        cursor.close(); conn.close()
        if not adopter or not verify_password(data.password, adopter["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        adopter_id = str(adopter["adopt_id"])
        name = adopter["name"]
        email = adopter["email"]
        _record_login("adopter", int(adopter_id), email, request.client.host)
    else:
        from database import db
        adopter = await db.adopters.find_one({"email": data.email})
        if not adopter or not verify_password(data.password, adopter["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        adopter_id = str(adopter["_id"])
        name = adopter["name"]
        email = adopter["email"]

    token = create_access_token({"sub": adopter_id, "email": email, "name": name}, "adopter")
    return {"access_token": token, "token_type": "bearer", "user_type": "adopter",
            "adopter_id": adopter_id, "name": name, "email": email}