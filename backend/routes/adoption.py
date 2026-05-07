from fastapi import APIRouter, HTTPException, Depends
from auth.jwt_handler import get_current_user
import os

router = APIRouter()
DB_TYPE = os.getenv("DB_TYPE", "mongo")


def serialize_adoption(row: dict) -> dict:
    created = row.get("created_at")
    if created and hasattr(created, "isoformat"):
        created = created.isoformat()
    elif created:
        created = str(created)
    return {
        "id": row.get("adoption_id") or row.get("id"),
        "animal_id": str(row.get("animal_id", "")),
        "animal_name": row.get("animal_name", ""),
        "adopt_id": str(row.get("adopt_id", "")),
        "adopter_name": row.get("adopter_name", ""),
        "shelter_id": str(row.get("shelter_id", "")),
        "status": row.get("status", "pending"),
        "message": row.get("message", ""),
        "created_at": created,
    }


# ── POST /adoption/ — adopter submits request ──────────────────────────────────

@router.post("/", status_code=201)
async def create_adoption_request(payload: dict):
    animal_id   = payload.get("animal_id", "")
    animal_name = payload.get("animal_name", "")
    adopt_id    = payload.get("adopt_id", "")
    adopter_name = payload.get("adopter_name", "")
    shelter_id  = payload.get("shelter_id", "")
    message     = payload.get("message", "")

    if not animal_id or not adopt_id:
        raise HTTPException(status_code=400, detail="animal_id and adopt_id are required")

    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """INSERT INTO adoption (animal_id, animal_name, adopt_id, adopter_name, shelter_id, status, message)
               VALUES (%s, %s, %s, %s, %s, 'pending', %s)""",
            (animal_id, animal_name, adopt_id, adopter_name, shelter_id, message)
        )
        conn.commit()
        new_id = cursor.lastrowid
        cursor.execute("SELECT * FROM adoption WHERE adoption_id = %s", (new_id,))
        record = cursor.fetchone()
        cursor.close(); conn.close()
        return serialize_adoption(record)
    else:
        from database import db
        from datetime import datetime
        doc = {
            "animal_id": animal_id,
            "animal_name": animal_name,
            "adopt_id": adopt_id,
            "adopter_name": adopter_name,
            "shelter_id": shelter_id,
            "status": "pending",
            "message": message,
            "created_at": datetime.utcnow(),
        }
        result = await db.adoptions.insert_one(doc)
        doc["adoption_id"] = str(result.inserted_id)
        doc["id"] = doc["adoption_id"]
        return serialize_adoption(doc)


# ── GET /adoption/?shelter_id=X — shelter sees all requests ───────────────────

@router.get("/")
async def list_adoption_requests(shelter_id: str, current_user=Depends(get_current_user)):
    if str(current_user["sub"]) != str(shelter_id):
        raise HTTPException(status_code=403, detail="Forbidden")

    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT * FROM adoption WHERE shelter_id = %s ORDER BY created_at DESC",
            (shelter_id,)
        )
        records = cursor.fetchall()
        cursor.close(); conn.close()
        return [serialize_adoption(r) for r in records]
    else:
        from database import db
        records = await db.adoptions.find({"shelter_id": shelter_id}).sort("created_at", -1).to_list(500)
        for r in records:
            r["adoption_id"] = str(r["_id"])
        return [serialize_adoption(r) for r in records]


# ── GET /adoption/my?adopter_id=X — adopter sees their requests ───────────────

@router.get("/my")
async def my_adoption_requests(adopter_id: str, current_user=Depends(get_current_user)):
    if str(current_user["sub"]) != str(adopter_id):
        raise HTTPException(status_code=403, detail="Forbidden")

    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT * FROM adoption WHERE adopt_id = %s ORDER BY created_at DESC",
            (adopter_id,)
        )
        records = cursor.fetchall()
        cursor.close(); conn.close()
        return [serialize_adoption(r) for r in records]
    else:
        from database import db
        records = await db.adoptions.find({"adopt_id": adopter_id}).sort("created_at", -1).to_list(500)
        for r in records:
            r["adoption_id"] = str(r["_id"])
        return [serialize_adoption(r) for r in records]


# ── GET /adoption/adopter/{adopt_id} — full adopter profile + history ─────────

@router.get("/adopter/{adopt_id}")
async def get_adopter_details(adopt_id: int, current_user=Depends(get_current_user)):
    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT adopt_id, name, address, contact_no, email FROM adopter WHERE adopt_id = %s",
            (adopt_id,)
        )
        adopter = cursor.fetchone()
        if not adopter:
            cursor.close(); conn.close()
            raise HTTPException(status_code=404, detail="Adopter not found")

        cursor.execute(
            """SELECT adoption_id, animal_name, status, message, created_at
               FROM adoption WHERE adopt_id = %s ORDER BY created_at DESC""",
            (adopt_id,)
        )
        history = cursor.fetchall()
        for row in history:
            if row.get("created_at") and hasattr(row["created_at"], "isoformat"):
                row["created_at"] = row["created_at"].isoformat()
            elif row.get("created_at"):
                row["created_at"] = str(row["created_at"])

        cursor.close(); conn.close()
        return {"adopter": adopter, "history": history}
    else:
        from database import db
        adopter = await db.adopters.find_one({"adopt_id": str(adopt_id)})
        if not adopter:
            raise HTTPException(status_code=404, detail="Adopter not found")
        adopter.pop("_id", None)
        adopter.pop("password_hash", None)
        records = await db.adoptions.find({"adopt_id": str(adopt_id)}).sort("created_at", -1).to_list(100)
        history = [serialize_adoption(r) for r in records]
        return {"adopter": adopter, "history": history}


# ── PATCH /adoption/adopter/{adopt_id} — update adopter profile ───────────────

@router.patch("/adopter/{adopt_id}")
async def update_adopter(adopt_id: int, payload: dict, current_user=Depends(get_current_user)):
    allowed = {"name", "address", "contact_no", "email"}
    updates = {k: v for k, v in payload.items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        set_clause = ", ".join(f"{k} = %s" for k in updates)
        cursor.execute(
            f"UPDATE adopter SET {set_clause} WHERE adopt_id = %s",
            (*updates.values(), adopt_id)
        )
        conn.commit()
        cursor.execute(
            "SELECT adopt_id, name, address, contact_no, email FROM adopter WHERE adopt_id = %s",
            (adopt_id,)
        )
        updated = cursor.fetchone()
        cursor.close(); conn.close()
        return updated
    else:
        from database import db
        await db.adopters.update_one({"adopt_id": str(adopt_id)}, {"$set": updates})
        adopter = await db.adopters.find_one({"adopt_id": str(adopt_id)})
        adopter.pop("_id", None)
        adopter.pop("password_hash", None)
        return adopter


# ── PATCH /adoption/{id} — shelter approves, rejects, or edits message ────────

@router.patch("/{adoption_id}")
async def update_adoption_request(adoption_id: int, payload: dict, current_user=Depends(get_current_user)):
    new_status  = payload.get("status")
    new_message = payload.get("message")

    if new_status and new_status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="status must be 'approved' or 'rejected'")
    if not new_status and new_message is None:
        raise HTTPException(status_code=400, detail="Provide status or message to update")

    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        # Verify shelter owns this request
        cursor.execute("SELECT * FROM adoption WHERE adoption_id = %s", (adoption_id,))
        record = cursor.fetchone()
        if not record:
            cursor.close(); conn.close()
            raise HTTPException(status_code=404, detail="Adoption request not found")
        if str(record["shelter_id"]) != str(current_user["sub"]):
            cursor.close(); conn.close()
            raise HTTPException(status_code=403, detail="Forbidden")

        if new_status:
            cursor.execute(
                "UPDATE adoption SET status = %s WHERE adoption_id = %s",
                (new_status, adoption_id)
            )
            if new_status == "approved":
                cursor.execute(
                    "UPDATE animal SET status = 'adopted' WHERE animal_id = %s",
                    (record["animal_id"],)
                )
        if new_message is not None:
            cursor.execute(
                "UPDATE adoption SET message = %s WHERE adoption_id = %s",
                (new_message, adoption_id)
            )
        conn.commit()
        cursor.execute("SELECT * FROM adoption WHERE adoption_id = %s", (adoption_id,))
        updated = cursor.fetchone()
        cursor.close(); conn.close()
        return serialize_adoption(updated)
    else:
        from database import db
        from bson import ObjectId
        try:
            oid = ObjectId(str(adoption_id))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid adoption ID")
        record = await db.adoptions.find_one({"_id": oid})
        if not record:
            raise HTTPException(status_code=404, detail="Adoption request not found")
        if str(record["shelter_id"]) != str(current_user["sub"]):
            raise HTTPException(status_code=403, detail="Forbidden")
        mongo_updates = {}
        if new_status:
            mongo_updates["status"] = new_status
        if new_message is not None:
            mongo_updates["message"] = new_message
        await db.adoptions.update_one({"_id": oid}, {"$set": mongo_updates})
        if new_status == "approved":
            from bson import ObjectId as ObjId
            try:
                await db.animals.update_one(
                    {"_id": ObjId(str(record["animal_id"]))},
                    {"$set": {"status": "adopted"}}
                )
            except Exception:
                pass
        updated = await db.adoptions.find_one({"_id": oid})
        updated["adoption_id"] = str(updated["_id"])
        return serialize_adoption(updated)
