from fastapi import APIRouter, HTTPException
from database import db

router = APIRouter()


def serialize_health(h: dict) -> dict:
    return {
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
