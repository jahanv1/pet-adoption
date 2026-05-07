from fastapi import APIRouter, HTTPException, Depends
from auth.jwt_handler import get_current_user
import os

router = APIRouter()
DB_TYPE = os.getenv("DB_TYPE", "mongo")


def serialize_mysql(f: dict) -> dict:
    return {
        "id":               str(f["foster_id"]),
        "shelter_id":       str(f.get("shelter_id", "")),
        "name":             f.get("name", ""),
        "number":           f.get("number", ""),
        "duration":         int(f["duration"]) if f.get("duration") is not None else 0,
        "email":            f.get("email", ""),
        "address":          f.get("address", "") or "",
        "animals_fostered": int(f["animals_fostered"]) if f.get("animals_fostered") is not None else 0,
        "home_type":        f.get("home_type", "") or "",
    }


def serialize_mongo(f: dict) -> dict:
    return {
        "id":               str(f["_id"]),
        "shelter_id":       str(f.get("shelter_id", "")),
        "name":             f.get("name", ""),
        "number":           f.get("number", ""),
        "duration":         int(f.get("duration", 0)),
        "email":            f.get("email", ""),
        "address":          f.get("address", ""),
        "animals_fostered": int(f.get("animals_fostered", 0)),
        "home_type":        f.get("home_type", ""),
    }


@router.get("/")
async def list_fosters(shelter_id: str, current_user=Depends(get_current_user)):
    if str(current_user["sub"]) != str(shelter_id):
        raise HTTPException(status_code=403, detail="Access denied")

    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT * FROM trusted_foster WHERE shelter_id = %s ORDER BY foster_id",
            (int(shelter_id),)
        )
        rows = cursor.fetchall()
        cursor.close(); conn.close()
        return [serialize_mysql(r) for r in rows]
    else:
        from database import db
        results = []
        async for f in db.fosters.find({"shelter_id": shelter_id}):
            results.append(serialize_mongo(f))
        return results


@router.post("/", status_code=201)
async def add_foster(payload: dict, current_user=Depends(get_current_user)):
    shelter_id = str(current_user["sub"])

    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT COALESCE(MAX(foster_id), 0) + 1 AS next_id FROM trusted_foster")
        next_id = cursor.fetchone()["next_id"]
        cursor.execute(
            "INSERT INTO trusted_foster (foster_id, shelter_id, name, number, duration, email, address, animals_fostered) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
            (next_id, int(shelter_id), payload.get("name", ""), payload.get("number", ""),
             int(payload.get("duration", 0)), payload.get("email", ""),
             payload.get("address", "") or None,
             int(payload.get("animals_fostered", 0)))
        )
        conn.commit()
        cursor.execute("SELECT * FROM trusted_foster WHERE foster_id = %s", (next_id,))
        row = cursor.fetchone()
        cursor.close(); conn.close()
        return serialize_mysql(row)
    else:
        from database import db
        doc = {
            "shelter_id":       shelter_id,
            "name":             payload.get("name", ""),
            "number":           payload.get("number", ""),
            "duration":         int(payload.get("duration", 0)),
            "email":            payload.get("email", ""),
            "address":          payload.get("address", ""),
            "animals_fostered": int(payload.get("animals_fostered", 0)),
        }
        result = await db.fosters.insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize_mongo(doc)


@router.patch("/{foster_id}")
async def update_foster(foster_id: str, payload: dict, current_user=Depends(get_current_user)):
    shelter_id = str(current_user["sub"])

    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT shelter_id FROM trusted_foster WHERE foster_id = %s", (int(foster_id),)
        )
        row = cursor.fetchone()
        if not row:
            cursor.close(); conn.close()
            raise HTTPException(status_code=404, detail="Foster not found")
        if str(row["shelter_id"]) != shelter_id:
            cursor.close(); conn.close()
            raise HTTPException(status_code=403, detail="Access denied")
        allowed = {"name", "number", "duration", "email", "address", "animals_fostered", "home_type"}
        updates = {k: v for k, v in payload.items() if k in allowed}
        if not updates:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        set_clauses = []
        values = []
        for k, v in updates.items():
            set_clauses.append(f"{k} = %s")
            values.append(int(v) if k in ("duration", "animals_fostered") else v)
        values.append(int(foster_id))
        cursor.execute(
            f"UPDATE trusted_foster SET {', '.join(set_clauses)} WHERE foster_id = %s", values
        )
        conn.commit()
        cursor.execute("SELECT * FROM trusted_foster WHERE foster_id = %s", (int(foster_id),))
        row = cursor.fetchone()
        cursor.close(); conn.close()
        return serialize_mysql(row)
    else:
        from database import db
        from bson import ObjectId
        try:
            oid = ObjectId(foster_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid foster ID")
        doc = await db.fosters.find_one({"_id": oid})
        if not doc:
            raise HTTPException(status_code=404, detail="Foster not found")
        if str(doc.get("shelter_id")) != shelter_id:
            raise HTTPException(status_code=403, detail="Access denied")
        allowed = {"name", "number", "duration", "email", "address", "animals_fostered", "home_type"}
        updates = {k: v for k, v in payload.items() if k in allowed}
        if not updates:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        if "duration" in updates:
            updates["duration"] = int(updates["duration"])
        if "animals_fostered" in updates:
            updates["animals_fostered"] = int(updates["animals_fostered"])
        await db.fosters.update_one({"_id": oid}, {"$set": updates})
        updated = await db.fosters.find_one({"_id": oid})
        return serialize_mongo(updated)


@router.delete("/{foster_id}", status_code=204)
async def delete_foster(foster_id: str, current_user=Depends(get_current_user)):
    shelter_id = str(current_user["sub"])

    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT shelter_id FROM trusted_foster WHERE foster_id = %s", (int(foster_id),)
        )
        row = cursor.fetchone()
        if not row:
            cursor.close(); conn.close()
            raise HTTPException(status_code=404, detail="Foster not found")
        if str(row["shelter_id"]) != shelter_id:
            cursor.close(); conn.close()
            raise HTTPException(status_code=403, detail="Access denied")
        cursor.execute("DELETE FROM trusted_foster WHERE foster_id = %s", (int(foster_id),))
        conn.commit()
        cursor.close(); conn.close()
    else:
        from database import db
        from bson import ObjectId
        try:
            oid = ObjectId(foster_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid foster ID")
        doc = await db.fosters.find_one({"_id": oid})
        if not doc:
            raise HTTPException(status_code=404, detail="Foster not found")
        if str(doc.get("shelter_id")) != shelter_id:
            raise HTTPException(status_code=403, detail="Access denied")
        await db.fosters.delete_one({"_id": oid})
