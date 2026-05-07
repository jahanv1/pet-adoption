from fastapi import APIRouter, HTTPException, Depends
from auth.jwt_handler import get_current_user
import os

router = APIRouter()
DB_TYPE = os.getenv("DB_TYPE", "mongo")


def serialize_mysql(d: dict) -> dict:
    return {
        "id":         str(d["donate_id"]),
        "shelter_id": str(d.get("shelter_id", "")),
        "name":       d.get("name", ""),
        "amount":     float(d["amount"]) if d.get("amount") is not None else 0.0,
    }


def serialize_mongo(d: dict) -> dict:
    return {
        "id":         str(d["_id"]),
        "shelter_id": str(d.get("shelter_id", "")),
        "name":       d.get("name", ""),
        "amount":     float(d.get("amount", 0)),
    }


@router.get("/")
async def list_donations(shelter_id: str, current_user=Depends(get_current_user)):
    if str(current_user["sub"]) != str(shelter_id):
        raise HTTPException(status_code=403, detail="Access denied")

    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT * FROM donations WHERE shelter_id = %s ORDER BY donate_id",
            (int(shelter_id),)
        )
        rows = cursor.fetchall()
        cursor.close(); conn.close()
        return [serialize_mysql(r) for r in rows]
    else:
        from database import db
        results = []
        async for d in db.donations.find({"shelter_id": shelter_id}):
            results.append(serialize_mongo(d))
        return results


@router.post("/", status_code=201)
async def add_donation(payload: dict, current_user=Depends(get_current_user)):
    shelter_id = str(current_user["sub"])

    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT COALESCE(MAX(donate_id), 0) + 1 AS next_id FROM donations")
        next_id = cursor.fetchone()["next_id"]
        cursor.execute(
            "INSERT INTO donations (donate_id, name, amount, shelter_id) VALUES (%s,%s,%s,%s)",
            (next_id, payload.get("name", ""),
             float(payload.get("amount", 0)), int(shelter_id))
        )
        conn.commit()
        cursor.execute("SELECT * FROM donations WHERE donate_id = %s", (next_id,))
        row = cursor.fetchone()
        cursor.close(); conn.close()
        return serialize_mysql(row)
    else:
        from database import db
        doc = {
            "shelter_id": shelter_id,
            "name":       payload.get("name", ""),
            "amount":     float(payload.get("amount", 0)),
        }
        result = await db.donations.insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize_mongo(doc)


@router.patch("/{donation_id}")
async def update_donation(donation_id: str, payload: dict, current_user=Depends(get_current_user)):
    shelter_id = str(current_user["sub"])

    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT shelter_id FROM donations WHERE donate_id = %s", (int(donation_id),)
        )
        row = cursor.fetchone()
        if not row:
            cursor.close(); conn.close()
            raise HTTPException(status_code=404, detail="Donation not found")
        if str(row["shelter_id"]) != shelter_id:
            cursor.close(); conn.close()
            raise HTTPException(status_code=403, detail="Access denied")
        allowed = {"name", "amount"}
        updates = {k: v for k, v in payload.items() if k in allowed}
        if not updates:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        set_clauses = []
        values = []
        for k, v in updates.items():
            set_clauses.append(f"{k} = %s")
            values.append(float(v) if k == "amount" else v)
        values.append(int(donation_id))
        cursor.execute(
            f"UPDATE donations SET {', '.join(set_clauses)} WHERE donate_id = %s", values
        )
        conn.commit()
        cursor.execute("SELECT * FROM donations WHERE donate_id = %s", (int(donation_id),))
        row = cursor.fetchone()
        cursor.close(); conn.close()
        return serialize_mysql(row)
    else:
        from database import db
        from bson import ObjectId
        try:
            oid = ObjectId(donation_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid donation ID")
        doc = await db.donations.find_one({"_id": oid})
        if not doc:
            raise HTTPException(status_code=404, detail="Donation not found")
        if str(doc.get("shelter_id")) != shelter_id:
            raise HTTPException(status_code=403, detail="Access denied")
        allowed = {"name", "amount"}
        updates = {k: v for k, v in payload.items() if k in allowed}
        if not updates:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        if "amount" in updates:
            updates["amount"] = float(updates["amount"])
        await db.donations.update_one({"_id": oid}, {"$set": updates})
        updated = await db.donations.find_one({"_id": oid})
        return serialize_mongo(updated)


@router.delete("/{donation_id}", status_code=204)
async def delete_donation(donation_id: str, current_user=Depends(get_current_user)):
    shelter_id = str(current_user["sub"])

    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT shelter_id FROM donations WHERE donate_id = %s", (int(donation_id),)
        )
        row = cursor.fetchone()
        if not row:
            cursor.close(); conn.close()
            raise HTTPException(status_code=404, detail="Donation not found")
        if str(row["shelter_id"]) != shelter_id:
            cursor.close(); conn.close()
            raise HTTPException(status_code=403, detail="Access denied")
        cursor.execute("DELETE FROM donations WHERE donate_id = %s", (int(donation_id),))
        conn.commit()
        cursor.close(); conn.close()
    else:
        from database import db
        from bson import ObjectId
        try:
            oid = ObjectId(donation_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid donation ID")
        doc = await db.donations.find_one({"_id": oid})
        if not doc:
            raise HTTPException(status_code=404, detail="Donation not found")
        if str(doc.get("shelter_id")) != shelter_id:
            raise HTTPException(status_code=403, detail="Access denied")
        await db.donations.delete_one({"_id": oid})
