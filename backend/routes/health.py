from fastapi import APIRouter, HTTPException, Depends
from database import db
from auth.jwt_handler import get_current_user
from bson import ObjectId

router = APIRouter()


def serialize_health(h: dict) -> dict:
    return {
        "id": str(h["_id"]),
        "animal_name": h.get("animal_name", ""),
        "weight": h.get("weight"),
        "temperature": h.get("temperature"),
        "last_checkup": h.get("last_checkup"),
        "vet_name": h.get("vet_name", ""),
        "vaccinations": h.get("vaccinations", []),
    }


@router.get("/by-name/{name}")
async def get_health_by_name(name: str):
    health = await db.health.find_one({"animal_name": {"$regex": f"^{name}$", "$options": "i"}})
    if not health:
        raise HTTPException(status_code=404, detail="No health record found")
    return serialize_health(health)


@router.post("/")
async def create_health(payload: dict, _user=Depends(get_current_user)):
    allowed = {"animal_name", "weight", "temperature", "last_checkup", "vet_name", "vaccinations"}
    doc = {k: v for k, v in payload.items() if k in allowed}
    doc.setdefault("vaccinations", [])
    result = await db.health.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_health(doc)


@router.patch("/{health_id}")
async def update_health(health_id: str, payload: dict, _user=Depends(get_current_user)):
    try:
        oid = ObjectId(health_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid health record ID")

    allowed = {"weight", "temperature", "last_checkup", "vet_name", "vaccinations"}
    updates = {k: v for k, v in payload.items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    result = await db.health.update_one({"_id": oid}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Health record not found")

    updated = await db.health.find_one({"_id": oid})
    return serialize_health(updated)


@router.delete("/{health_id}", status_code=204)
async def delete_health(health_id: str, _user=Depends(get_current_user)):
    try:
        oid = ObjectId(health_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid health record ID")

    result = await db.health.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Health record not found")
