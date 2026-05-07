import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def get_mysql_connection():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "localhost"),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", "dazai"),
        database=os.getenv("MYSQL_DB", "pet_adoption")
    )