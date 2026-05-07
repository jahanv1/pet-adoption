from fastapi import APIRouter, HTTPException, Depends
from models.schemas import AnimalCreate
from auth.jwt_handler import get_current_user
from typing import Optional
import os

router = APIRouter()
DB_TYPE = os.getenv("DB_TYPE", "mongo")


def serialize_mysql(animal: dict) -> dict:
    result = {
        "id": str(animal["animal_id"]),
        "name": animal.get("name", ""),
        "species": animal.get("species", ""),
        "breed": animal.get("breed", ""),
        "age": animal.get("age", 0),
        "gender": animal.get("gender", ""),
        "dob": str(animal["DOB"]) if animal.get("DOB") else None,
        "status": animal.get("status", "available"),
        "shelter_id": str(animal.get("shelter_id", "")),
        "foster_id": animal.get("foster_id"),
        "image_emoji": animal.get("image_emoji", "🐾"),
        "image_url": animal.get("image_url"),
        "description": animal.get("description", ""),
        "story": animal.get("story", ""),
        "traits": animal.get("traits", "").split(",") if animal.get("traits") else [],
    }
    # Extra fields present when queried via animal_full_view
    view_fields = [
        "shelter_name", "shelter_address", "shelter_contact",
        "weight", "temperature", "last_checkup", "vaccination_done", "last_vaccine_date", "vet_name",
        "foster_name", "foster_contact", "foster_duration",
        "adoption_status", "adopter_name", "adoption_date",
    ]
    for f in view_fields:
        if f in animal:
            val = animal[f]
            if hasattr(val, "isoformat"):
                val = val.isoformat()
            result[f] = val
    return result


def serialize_mongo(animal: dict) -> dict:
    return {
        "id": str(animal["_id"]),
        "name": animal.get("name", ""),
        "species": animal.get("species", ""),
        "breed": animal.get("breed", ""),
        "age": animal.get("age", 0),
        "gender": animal.get("gender", ""),
        "dob": animal.get("dob"),
        "status": animal.get("status", "available"),
        "shelter_id": str(animal.get("shelter_id", "")),
        "foster_id": animal.get("foster_id"),
        "image_emoji": animal.get("image_emoji", "🐾"),
        "image_url": animal.get("image_url"),
        "description": animal.get("description", ""),
        "story": animal.get("story", ""),
        "traits": animal.get("traits", []),
    }


@router.get("/")
async def list_animals(
    status: Optional[str] = None,
    species: Optional[str] = None,
    shelter_id: Optional[str] = None,
):
    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        query = "SELECT * FROM animal WHERE 1=1"
        params = []
        if status:
            query += " AND status = %s"
            params.append(status)
        if species:
            query += " AND species LIKE %s"
            params.append(f"%{species}%")
        if shelter_id:
            query += " AND shelter_id = %s"
            params.append(shelter_id)
        cursor.execute(query, params)
        animals = cursor.fetchall()
        cursor.close(); conn.close()
        return [serialize_mysql(a) for a in animals]
    else:
        from database import db
        query: dict = {}
        if status:
            query["status"] = status
        if species:
            query["species"] = {"$regex": species, "$options": "i"}
        if shelter_id:
            query["shelter_id"] = shelter_id
        animals = await db.animals.find(query).to_list(200)
        return [serialize_mongo(a) for a in animals]


@router.get("/{animal_id}")
async def get_animal(animal_id: str):
    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM animal_full_view WHERE animal_id = %s", (animal_id,))
        animal = cursor.fetchone()
        cursor.close(); conn.close()
        if not animal:
            raise HTTPException(status_code=404, detail="Animal not found")
        return serialize_mysql(animal)
    else:
        from database import db
        from bson import ObjectId
        try:
            oid = ObjectId(animal_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid animal ID")
        animal = await db.animals.find_one({"_id": oid})
        if not animal:
            raise HTTPException(status_code=404, detail="Animal not found")
        return serialize_mongo(animal)


@router.post("/", status_code=201)
async def create_animal(data: AnimalCreate, _user=Depends(get_current_user)):
    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        traits = ",".join(data.traits) if data.traits else ""
        shelter_id = int(_user["sub"])
        cursor.execute(
            """INSERT INTO animal (shelter_id, name, DOB, age, breed, gender, species, status, image_url, story, traits, image_emoji, description)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (shelter_id, data.name, data.dob, data.age, data.breed, data.gender,
             data.species, data.status, data.image_url, data.story, traits,
             data.image_emoji, data.description)
        )
        conn.commit()
        animal_id = cursor.lastrowid
        cursor.execute("SELECT * FROM animal WHERE animal_id = %s", (animal_id,))
        animal = cursor.fetchone()
        cursor.close(); conn.close()
        return serialize_mysql(animal)
    else:
        from database import db
        doc = data.model_dump()
        result = await db.animals.insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize_mongo(doc)


@router.patch("/{animal_id}/status")
async def update_status(animal_id: str, payload: dict, _user=Depends(get_current_user)):
    new_status = payload.get("status")
    if new_status not in ("available", "adopted", "fostered"):
        raise HTTPException(status_code=400, detail="Invalid status value")

    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE animal SET status = %s WHERE animal_id = %s", (new_status, animal_id))
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Animal not found")
        cursor.close(); conn.close()
    else:
        from database import db
        from bson import ObjectId
        try:
            oid = ObjectId(animal_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid animal ID")
        result = await db.animals.update_one({"_id": oid}, {"$set": {"status": new_status}})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Animal not found")
    return {"message": "Status updated"}


@router.patch("/{animal_id}/profile")
async def update_profile(animal_id: str, payload: dict, _user=Depends(get_current_user)):
    allowed = {"story", "traits", "status", "image_url", "name", "breed", "description"}
    updates = {k: v for k, v in payload.items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        if "traits" in updates and isinstance(updates["traits"], list):
            updates["traits"] = ",".join(updates["traits"])
        set_clause = ", ".join(f"{k} = %s" for k in updates)
        values = list(updates.values()) + [animal_id]
        cursor.execute(f"UPDATE animal SET {set_clause} WHERE animal_id = %s", values)
        conn.commit()
        cursor.execute("SELECT * FROM animal WHERE animal_id = %s", (animal_id,))
        animal = cursor.fetchone()
        cursor.close(); conn.close()
        if not animal:
            raise HTTPException(status_code=404, detail="Animal not found")
        return serialize_mysql(animal)
    else:
        from database import db
        from bson import ObjectId
        try:
            oid = ObjectId(animal_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid animal ID")
        result = await db.animals.update_one({"_id": oid}, {"$set": updates})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Animal not found")
        updated = await db.animals.find_one({"_id": oid})
        return serialize_mongo(updated)


@router.delete("/{animal_id}", status_code=204)
async def delete_animal(animal_id: str, _user=Depends(get_current_user)):
    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM animal WHERE animal_id = %s", (animal_id,))
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Animal not found")
        cursor.close(); conn.close()
    else:
        from database import db
        from bson import ObjectId
        try:
            oid = ObjectId(animal_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid animal ID")
        result = await db.animals.delete_one({"_id": oid})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Animal not found")