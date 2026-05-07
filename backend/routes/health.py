from fastapi import APIRouter, HTTPException, Depends
from auth.jwt_handler import get_current_user
import os, json

router = APIRouter()
DB_TYPE = os.getenv("DB_TYPE", "mongo")


# ── Serializers ───────────────────────────────────────────────────────────────

def serialize_mongo(h: dict) -> dict:
    return {
        "id": str(h["_id"]),
        "animal_name": h.get("animal_name", ""),
        "weight": h.get("weight"),
        "temperature": h.get("temperature"),
        "last_checkup": h.get("last_checkup"),
        "vet_name": h.get("vet_name", ""),
        "vaccinations": h.get("vaccinations", []),
    }


def parse_vaccinations(vacc_str: str) -> list:
    if not vacc_str:
        return []
    try:
        parsed = json.loads(vacc_str)
        if isinstance(parsed, list):
            return parsed
    except (json.JSONDecodeError, TypeError):
        pass
    return [{"name": v.strip(), "date_given": "", "next_due": ""} for v in vacc_str.split(",") if v.strip()]


def serialize_vaccinations(vacc) -> str:
    if not vacc:
        return ""
    if isinstance(vacc, list) and vacc and isinstance(vacc[0], dict):
        return json.dumps(vacc)
    return ", ".join(str(v) for v in vacc)


def serialize_mysql(h: dict) -> dict:
    vaccinations = parse_vaccinations(h.get("vaccination_done") or "")
    return {
        "id": str(h["animal_id"]),
        "animal_name": h.get("animal_name", ""),
        "weight": float(h["weight"]) if h.get("weight") is not None else None,
        "temperature": float(h["temperature"]) if h.get("temperature") is not None else None,
        "last_checkup": str(h["last_checkup"]) if h.get("last_checkup") else None,
        "vet_name": h.get("vet_name") or "",
        "vaccinations": vaccinations,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/by-name/{name}")
async def get_health_by_name(name: str):
    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT md.*, a.name AS animal_name "
            "FROM medical_details md "
            "JOIN animal a ON md.animal_id = a.animal_id "
            "WHERE LOWER(a.name) = LOWER(%s)",
            (name,)
        )
        record = cursor.fetchone()
        cursor.close(); conn.close()
        if not record:
            raise HTTPException(status_code=404, detail="No health record found")
        return serialize_mysql(record)
    else:
        from database import db
        health = await db.health.find_one({"animal_name": {"$regex": f"^{name}$", "$options": "i"}})
        if not health:
            raise HTTPException(status_code=404, detail="No health record found")
        return serialize_mongo(health)


@router.post("/")
async def create_health(payload: dict, _user=Depends(get_current_user)):
    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        animal_id = payload.get("animal_id")
        if not animal_id:
            raise HTTPException(status_code=400, detail="animal_id is required")
        vacc = payload.get("vaccinations", [])
        vacc_str = serialize_vaccinations(vacc)
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "INSERT INTO medical_details "
            "  (animal_id, weight, temperature, last_checkup, vet_name, vaccination_done) "
            "VALUES (%s, %s, %s, %s, %s, %s) "
            "ON DUPLICATE KEY UPDATE "
            "  weight=VALUES(weight), temperature=VALUES(temperature), "
            "  last_checkup=VALUES(last_checkup), vet_name=VALUES(vet_name), "
            "  vaccination_done=VALUES(vaccination_done)",
            (animal_id, payload.get("weight"), payload.get("temperature"),
             payload.get("last_checkup"), payload.get("vet_name", ""), vacc_str)
        )
        conn.commit()
        cursor.execute(
            "SELECT md.*, a.name AS animal_name "
            "FROM medical_details md "
            "JOIN animal a ON md.animal_id = a.animal_id "
            "WHERE md.animal_id = %s",
            (animal_id,)
        )
        record = cursor.fetchone()
        cursor.close(); conn.close()
        return serialize_mysql(record)
    else:
        from database import db
        allowed = {"animal_name", "weight", "temperature", "last_checkup", "vet_name", "vaccinations"}
        doc = {k: v for k, v in payload.items() if k in allowed}
        doc.setdefault("vaccinations", [])
        result = await db.health.insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize_mongo(doc)


@router.patch("/{health_id}")
async def update_health(health_id: str, payload: dict, _user=Depends(get_current_user)):
    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        allowed = {"weight", "temperature", "last_checkup", "vet_name", "vaccinations"}
        updates = {k: v for k, v in payload.items() if k in allowed}
        if not updates:
            raise HTTPException(status_code=400, detail="No valid fields to update")

        set_clauses, values = [], []
        for k, v in updates.items():
            if k == "vaccinations":
                set_clauses.append("vaccination_done = %s")
                values.append(serialize_vaccinations(v))
            else:
                set_clauses.append(f"{k} = %s")
                values.append(v)
        values.append(int(health_id))

        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            f"UPDATE medical_details SET {', '.join(set_clauses)} WHERE animal_id = %s",
            values
        )
        if cursor.rowcount == 0:
            cursor.close(); conn.close()
            raise HTTPException(status_code=404, detail="Health record not found")
        conn.commit()
        cursor.execute(
            "SELECT md.*, a.name AS animal_name "
            "FROM medical_details md "
            "JOIN animal a ON md.animal_id = a.animal_id "
            "WHERE md.animal_id = %s",
            (int(health_id),)
        )
        record = cursor.fetchone()
        cursor.close(); conn.close()
        return serialize_mysql(record)
    else:
        from database import db
        from bson import ObjectId
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
        return serialize_mongo(updated)


@router.delete("/{health_id}", status_code=204)
async def delete_health(health_id: str, _user=Depends(get_current_user)):
    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM medical_details WHERE animal_id = %s", (int(health_id),))
        deleted = cursor.rowcount
        conn.commit()
        cursor.close(); conn.close()
        if deleted == 0:
            raise HTTPException(status_code=404, detail="Health record not found")
    else:
        from database import db
        from bson import ObjectId
        try:
            oid = ObjectId(health_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid health record ID")
        result = await db.health.delete_one({"_id": oid})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Health record not found")
