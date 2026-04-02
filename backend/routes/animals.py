from fastapi import APIRouter, HTTPException, Depends
from database import db
from models.schemas import AnimalCreate
from auth.jwt_handler import get_current_user
from bson import ObjectId
from typing import Optional

router = APIRouter()


def serialize(animal: dict) -> dict:
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
    query: dict = {}
    if status:
        query["status"] = status
    if species:
        query["species"] = {"$regex": species, "$options": "i"}
    if shelter_id:
        query["shelter_id"] = shelter_id

    animals = await db.animals.find(query).to_list(200)
    return [serialize(a) for a in animals]


@router.get("/{animal_id}")
async def get_animal(animal_id: str):
    try:
        oid = ObjectId(animal_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid animal ID")

    animal = await db.animals.find_one({"_id": oid})
    if not animal:
        raise HTTPException(status_code=404, detail="Animal not found")
    return serialize(animal)


@router.post("/", status_code=201)
async def create_animal(data: AnimalCreate, _user=Depends(get_current_user)):
    doc = data.model_dump()
    result = await db.animals.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize(doc)


@router.patch("/{animal_id}/status")
async def update_status(
    animal_id: str,
    payload: dict,
    _user=Depends(get_current_user),
):
    try:
        oid = ObjectId(animal_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid animal ID")

    new_status = payload.get("status")
    if new_status not in ("available", "adopted", "fostered"):
        raise HTTPException(status_code=400, detail="Invalid status value")

    result = await db.animals.update_one({"_id": oid}, {"$set": {"status": new_status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Animal not found")
    return {"message": "Status updated"}


@router.patch("/{animal_id}/profile")
async def update_profile(
    animal_id: str,
    payload: dict,
    _user=Depends(get_current_user),
):
    try:
        oid = ObjectId(animal_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid animal ID")

    allowed = {"story", "traits"}
    updates = {k: v for k, v in payload.items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    result = await db.animals.update_one({"_id": oid}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Animal not found")

    updated = await db.animals.find_one({"_id": oid})
    return serialize(updated)
