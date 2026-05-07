from fastapi import APIRouter, HTTPException, Depends
from auth.jwt_handler import get_current_user
import os

router = APIRouter()
DB_TYPE = os.getenv("DB_TYPE", "mongo")


def serialize_mysql(v: dict) -> dict:
    return {
        "id":         str(v["vet_id"]),
        "name":       v.get("name", ""),
        "speciality": v.get("speciality", ""),
        "contact_no": v.get("contact_no", ""),
        "email":      v.get("email", ""),
        "license_no":   v.get("license_no", "") or "",
        "years_exp":    int(v["years_exp"]) if v.get("years_exp") is not None else None,
        "clinic":       v.get("clinic", "") or "",
        "degree":       v.get("degree", "") or "",
        "availability": v.get("availability", "") or "",
    }


def serialize_mongo(v: dict) -> dict:
    return {
        "id":           str(v["_id"]),
        "shelter_id":   str(v.get("shelter_id", "")),
        "name":         v.get("name", ""),
        "speciality":   v.get("speciality", ""),
        "contact_no":   v.get("contact_no", ""),
        "email":        v.get("email", ""),
        "license_no":   v.get("license_no", ""),
        "years_exp":    v.get("years_exp"),
        "clinic":       v.get("clinic", ""),
        "degree":       v.get("degree", ""),
        "availability": v.get("availability", ""),
    }


@router.get("/")
async def list_vets(shelter_id: str, current_user=Depends(get_current_user)):
    if str(current_user["sub"]) != str(shelter_id):
        raise HTTPException(status_code=403, detail="Access denied")

    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT v.* FROM vet v "
            "JOIN shelter_vet_5nf sv ON v.vet_id = sv.vet_id "
            "WHERE sv.shelter_id = %s ORDER BY v.vet_id",
            (int(shelter_id),)
        )
        rows = cursor.fetchall()
        cursor.close(); conn.close()
        return [serialize_mysql(r) for r in rows]
    else:
        from database import db
        results = []
        async for v in db.vets.find({"shelter_id": shelter_id}):
            results.append(serialize_mongo(v))
        return results


@router.post("/", status_code=201)
async def add_vet(payload: dict, current_user=Depends(get_current_user)):
    shelter_id = str(current_user["sub"])

    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT COALESCE(MAX(vet_id), 0) + 1 AS next_id FROM vet")
        next_id = cursor.fetchone()["next_id"]
        cursor.execute(
            "INSERT INTO vet (vet_id, name, speciality, contact_no, email, license_no, years_exp, clinic) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
            (next_id, payload.get("name", ""), payload.get("speciality", ""),
             payload.get("contact_no", ""), payload.get("email", ""),
             payload.get("license_no", "") or None,
             int(payload["years_exp"]) if payload.get("years_exp") else None,
             payload.get("clinic", "") or None)
        )
        cursor.execute(
            "INSERT INTO shelter_vet_5nf (shelter_id, vet_id) VALUES (%s,%s)",
            (int(shelter_id), next_id)
        )
        conn.commit()
        cursor.execute("SELECT * FROM vet WHERE vet_id = %s", (next_id,))
        row = cursor.fetchone()
        cursor.close(); conn.close()
        return serialize_mysql(row)
    else:
        from database import db
        doc = {
            "shelter_id": shelter_id,
            "name":       payload.get("name", ""),
            "speciality": payload.get("speciality", ""),
            "contact_no": payload.get("contact_no", ""),
            "email":      payload.get("email", ""),
            "license_no": payload.get("license_no", ""),
            "years_exp":  payload.get("years_exp"),
            "clinic":     payload.get("clinic", ""),
        }
        result = await db.vets.insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize_mongo(doc)


@router.patch("/{vet_id}")
async def update_vet(vet_id: str, payload: dict, current_user=Depends(get_current_user)):
    shelter_id = str(current_user["sub"])

    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT 1 FROM shelter_vet_5nf WHERE shelter_id = %s AND vet_id = %s",
            (int(shelter_id), int(vet_id))
        )
        if not cursor.fetchone():
            cursor.close(); conn.close()
            raise HTTPException(status_code=403, detail="Access denied")
        allowed = {"name", "speciality", "contact_no", "email", "license_no", "years_exp", "clinic", "degree", "availability"}
        updates = {k: v for k, v in payload.items() if k in allowed}
        if not updates:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        if "years_exp" in updates:
            updates["years_exp"] = int(updates["years_exp"]) if updates["years_exp"] else None
        set_clauses = [f"{k} = %s" for k in updates]
        values = list(updates.values()) + [int(vet_id)]
        cursor.execute(
            f"UPDATE vet SET {', '.join(set_clauses)} WHERE vet_id = %s",
            values
        )
        conn.commit()
        cursor.execute("SELECT * FROM vet WHERE vet_id = %s", (int(vet_id),))
        row = cursor.fetchone()
        cursor.close(); conn.close()
        return serialize_mysql(row)
    else:
        from database import db
        from bson import ObjectId
        try:
            oid = ObjectId(vet_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid vet ID")
        vet = await db.vets.find_one({"_id": oid})
        if not vet:
            raise HTTPException(status_code=404, detail="Vet not found")
        if str(vet.get("shelter_id")) != shelter_id:
            raise HTTPException(status_code=403, detail="Access denied")
        allowed = {"name", "speciality", "contact_no", "email", "license_no", "years_exp", "clinic", "degree", "availability"}
        updates = {k: v for k, v in payload.items() if k in allowed}
        if not updates:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        await db.vets.update_one({"_id": oid}, {"$set": updates})
        updated = await db.vets.find_one({"_id": oid})
        return serialize_mongo(updated)


@router.delete("/{vet_id}", status_code=204)
async def remove_vet(vet_id: str, current_user=Depends(get_current_user)):
    shelter_id = str(current_user["sub"])

    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT 1 FROM shelter_vet_5nf WHERE shelter_id = %s AND vet_id = %s",
            (int(shelter_id), int(vet_id))
        )
        if not cursor.fetchone():
            cursor.close(); conn.close()
            raise HTTPException(status_code=403, detail="Access denied or not found")
        cursor.execute(
            "DELETE FROM shelter_vet_5nf WHERE shelter_id = %s AND vet_id = %s",
            (int(shelter_id), int(vet_id))
        )
        cursor.execute("SELECT COUNT(*) AS cnt FROM shelter_vet_5nf WHERE vet_id = %s", (int(vet_id),))
        if cursor.fetchone()["cnt"] == 0:
            cursor.execute("DELETE FROM vet WHERE vet_id = %s", (int(vet_id),))
        conn.commit()
        cursor.close(); conn.close()
    else:
        from database import db
        from bson import ObjectId
        try:
            oid = ObjectId(vet_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid vet ID")
        vet = await db.vets.find_one({"_id": oid})
        if not vet:
            raise HTTPException(status_code=404, detail="Vet not found")
        if str(vet.get("shelter_id")) != shelter_id:
            raise HTTPException(status_code=403, detail="Access denied")
        await db.vets.delete_one({"_id": oid})
