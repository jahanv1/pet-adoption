from fastapi import APIRouter, HTTPException, Depends
from auth.jwt_handler import get_current_user
import os

router = APIRouter()
DB_TYPE = os.getenv("DB_TYPE", "mongo")


def serialize_mysql(s: dict) -> dict:
    return {
        "id":               str(s["emp_id"]),
        "shelter_id":       str(s["shelter_id"]),
        "name":             s.get("name", ""),
        "position":         s.get("position", ""),
        "contact_no":       s.get("contact_no", ""),
        "email":            s.get("email", ""),
        "department":     s.get("department", "") or "",
        "hire_date":      str(s["hire_date"]) if s.get("hire_date") else "",
        "qualification":  s.get("qualification", "") or "",
    }


def serialize_mongo(s: dict) -> dict:
    return {
        "id":             str(s["_id"]),
        "shelter_id":     str(s.get("shelter_id", "")),
        "name":           s.get("name", ""),
        "position":       s.get("position", ""),
        "contact_no":     s.get("contact_no", ""),
        "email":          s.get("email", ""),
        "department":     s.get("department", ""),
        "hire_date":      s.get("hire_date", ""),
        "qualification":  s.get("qualification", ""),
    }


@router.get("/")
async def list_staff(shelter_id: str, current_user=Depends(get_current_user)):
    if str(current_user["sub"]) != str(shelter_id):
        raise HTTPException(status_code=403, detail="Access denied")

    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM staff WHERE shelter_id = %s ORDER BY emp_id", (int(shelter_id),))
        rows = cursor.fetchall()
        cursor.close(); conn.close()
        return [serialize_mysql(r) for r in rows]
    else:
        from database import db
        results = []
        async for s in db.staff.find({"shelter_id": shelter_id}):
            results.append(serialize_mongo(s))
        return results


@router.post("/", status_code=201)
async def add_staff(payload: dict, current_user=Depends(get_current_user)):
    shelter_id = str(current_user["sub"])

    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT COALESCE(MAX(emp_id), 0) + 1 AS next_id FROM staff")
        next_id = cursor.fetchone()["next_id"]
        cursor.execute(
            "INSERT INTO staff (emp_id, shelter_id, name, position, contact_no, email, department, hire_date) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
            (next_id, int(shelter_id), payload.get("name", ""), payload.get("position", ""),
             payload.get("contact_no", ""), payload.get("email", ""),
             payload.get("department", "") or None, payload.get("hire_date") or None)
        )
        conn.commit()
        cursor.execute("SELECT * FROM staff WHERE emp_id = %s", (next_id,))
        row = cursor.fetchone()
        cursor.close(); conn.close()
        return serialize_mysql(row)
    else:
        from database import db
        doc = {
            "shelter_id": shelter_id,
            "name":       payload.get("name", ""),
            "position":   payload.get("position", ""),
            "contact_no": payload.get("contact_no", ""),
            "email":      payload.get("email", ""),
            "department": payload.get("department", ""),
            "hire_date":  payload.get("hire_date", ""),
        }
        result = await db.staff.insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize_mongo(doc)


@router.patch("/{staff_id}")
async def update_staff(staff_id: str, payload: dict, current_user=Depends(get_current_user)):
    shelter_id = str(current_user["sub"])

    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT shelter_id FROM staff WHERE emp_id = %s", (int(staff_id),))
        row = cursor.fetchone()
        if not row:
            cursor.close(); conn.close()
            raise HTTPException(status_code=404, detail="Staff member not found")
        if str(row["shelter_id"]) != shelter_id:
            cursor.close(); conn.close()
            raise HTTPException(status_code=403, detail="Access denied")
        allowed = {"name", "position", "contact_no", "email", "department", "hire_date", "qualification"}
        updates = {k: v for k, v in payload.items() if k in allowed}
        if not updates:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        set_clauses = [f"{k} = %s" for k in updates]
        values = list(updates.values()) + [int(staff_id)]
        cursor.execute(
            f"UPDATE staff SET {', '.join(set_clauses)} WHERE emp_id = %s",
            values
        )
        conn.commit()
        cursor.execute("SELECT * FROM staff WHERE emp_id = %s", (int(staff_id),))
        row = cursor.fetchone()
        cursor.close(); conn.close()
        return serialize_mysql(row)
    else:
        from database import db
        from bson import ObjectId
        try:
            oid = ObjectId(staff_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid staff ID")
        member = await db.staff.find_one({"_id": oid})
        if not member:
            raise HTTPException(status_code=404, detail="Staff member not found")
        if str(member.get("shelter_id")) != shelter_id:
            raise HTTPException(status_code=403, detail="Access denied")
        allowed = {"name", "position", "contact_no", "email", "department", "hire_date", "qualification"}
        updates = {k: v for k, v in payload.items() if k in allowed}
        if not updates:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        await db.staff.update_one({"_id": oid}, {"$set": updates})
        updated = await db.staff.find_one({"_id": oid})
        return serialize_mongo(updated)


@router.delete("/{staff_id}", status_code=204)
async def remove_staff(staff_id: str, current_user=Depends(get_current_user)):
    shelter_id = str(current_user["sub"])

    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT shelter_id FROM staff WHERE emp_id = %s", (int(staff_id),))
        row = cursor.fetchone()
        if not row:
            cursor.close(); conn.close()
            raise HTTPException(status_code=404, detail="Staff member not found")
        if str(row["shelter_id"]) != shelter_id:
            cursor.close(); conn.close()
            raise HTTPException(status_code=403, detail="Access denied")
        cursor.execute("DELETE FROM staff WHERE emp_id = %s", (int(staff_id),))
        conn.commit()
        cursor.close(); conn.close()
    else:
        from database import db
        from bson import ObjectId
        try:
            oid = ObjectId(staff_id)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid staff ID")
        member = await db.staff.find_one({"_id": oid})
        if not member:
            raise HTTPException(status_code=404, detail="Staff member not found")
        if str(member.get("shelter_id")) != shelter_id:
            raise HTTPException(status_code=403, detail="Access denied")
        await db.staff.delete_one({"_id": oid})
