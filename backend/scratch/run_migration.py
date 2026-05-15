import pymysql
from dotenv import load_dotenv
import os

load_dotenv()

def migrate():
    host = os.getenv("MYSQL_HOST", "127.0.0.1")
    user = os.getenv("MYSQL_USER", "root")
    password = os.getenv("MYSQL_PASSWORD", "")
    db = os.getenv("MYSQL_DATABASE", "fitness")
    port = int(os.getenv("MYSQL_PORT", "3306"))

    print(f"Connecting to {host}:{port}...")
    conn = pymysql.connect(
        host=host,
        user=user,
        password=password,
        db=db,
        port=port,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

    try:
        with conn.cursor() as cursor:
            # Check if column exists
            cursor.execute("SHOW COLUMNS FROM users LIKE 'custom_muscle_boost_limit'")
            result = cursor.fetchone()
            
            if not result:
                print("Adding column 'custom_muscle_boost_limit' to users table...")
                cursor.execute("ALTER TABLE users ADD COLUMN custom_muscle_boost_limit INT DEFAULT NULL AFTER timezone")
                conn.commit()
                print("Migration successful.")
            else:
                print("Column 'custom_muscle_boost_limit' already exists.")
    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
