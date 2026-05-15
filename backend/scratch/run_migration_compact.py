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
            # Add AI scan columns
            cols_to_add = [
                ("last_ai_scan_date", "DATE DEFAULT NULL AFTER custom_muscle_boost_limit"),
                ("today_ai_scan_count", "INT UNSIGNED NOT NULL DEFAULT 0 AFTER last_ai_scan_date"),
                ("last_muscle_boost_date", "DATE DEFAULT NULL AFTER today_ai_scan_count"),
                ("today_muscle_boost_count", "INT UNSIGNED NOT NULL DEFAULT 0 AFTER last_muscle_boost_date")
            ]
            
            for col_name, col_def in cols_to_add:
                cursor.execute(f"SHOW COLUMNS FROM users LIKE '{col_name}'")
                if not cursor.fetchone():
                    print(f"Adding column '{col_name}'...")
                    cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}")
                else:
                    print(f"Column '{col_name}' already exists.")
            
            conn.commit()
            print("Migration successful.")
    except Exception as e:
        print(f"Error during migration: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
