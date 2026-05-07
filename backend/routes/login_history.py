from fastapi import APIRouter, HTTPException, Depends
from auth.jwt_handler import get_current_user
import os

router = APIRouter()
DB_TYPE = os.getenv("DB_TYPE", "mongo")


@router.get("/")
async def get_login_history(shelter_id: str, current_user=Depends(get_current_user)):
    if str(current_user["sub"]) != str(shelter_id):
        raise HTTPException(status_code=403, detail="Forbidden")

    if DB_TYPE == "mysql":
        from mysql_database import get_mysql_connection
        conn = get_mysql_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT log_id, user_type, user_id, email, login_time, ip_address "
            "FROM login_history WHERE user_id = %s ORDER BY login_time DESC LIMIT 20",
            (int(shelter_id),)
        )
        rows = cursor.fetchall()
        cursor.close(); conn.close()
        return [
            {
                "log_id":     r["log_id"],
                "user_type":  r["user_type"],
                "user_id":    r["user_id"],
                "email":      r["email"],
                "login_time": str(r["login_time"]) if r["login_time"] else "",
                "ip_address": r["ip_address"] or "",
            }
            for r in rows
        ]
    else:
        return []
