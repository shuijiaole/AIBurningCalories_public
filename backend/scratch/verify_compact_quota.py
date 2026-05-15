import pymysql
from dotenv import load_dotenv
import os
from datetime import date, timedelta
import sys

# Add the backend directory to sys.path to import from app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.utils import ensure_daily_quota, ensure_daily_feature_quota, FEATURE_MUSCLE_BOOST

load_dotenv()

def test_quota_logic():
    host = os.getenv("MYSQL_HOST", "127.0.0.1")
    user = os.getenv("MYSQL_USER", "root")
    password = os.getenv("MYSQL_PASSWORD", "")
    db = os.getenv("MYSQL_DATABASE", "fitness")
    port = int(os.getenv("MYSQL_PORT", "3306"))

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
            # 1. Pick a test user
            cursor.execute("SELECT id FROM users LIMIT 1")
            user = cursor.fetchone()
            if not user:
                print("No users found in DB.")
                return
            user_id = user["id"]
            print(f"Testing with User ID: {user_id}")

            # 2. Test AI Scan Quota Reset
            today = date.today()
            yesterday = today - timedelta(days=1)
            
            print("\n--- Testing AI Scan Quota ---")
            # Manually set to yesterday
            cursor.execute(
                "UPDATE users SET last_ai_scan_date = %s, today_ai_scan_count = 5 WHERE id = %s",
                (yesterday, user_id)
            )
            conn.commit()
            
            quota = ensure_daily_quota(cursor, user_id, today)
            print(f"Quota after reset (Date changed from {yesterday} to {today}):")
            print(f"  Used: {quota['free_quota_used']} (Expected: 0)")
            
            # Simulate increment (usually done in router, but we check DB state)
            cursor.execute("UPDATE users SET today_ai_scan_count = today_ai_scan_count + 1 WHERE id = %s", (user_id,))
            quota_after_inc = ensure_daily_quota(cursor, user_id, today)
            print(f"  Used after inc: {quota_after_inc['free_quota_used']} (Expected: 1)")

            # 3. Test Muscle Boost Quota Reset
            print("\n--- Testing Muscle Boost Quota ---")
            cursor.execute(
                "UPDATE users SET last_muscle_boost_date = %s, today_muscle_boost_count = 10 WHERE id = %s",
                (yesterday, user_id)
            )
            conn.commit()
            
            quota_m = ensure_daily_feature_quota(cursor, user_id, FEATURE_MUSCLE_BOOST, today)
            print(f"Quota after reset (Date changed):")
            print(f"  Used: {quota_m['free_quota_used']} (Expected: 0)")
            
            cursor.execute("UPDATE users SET today_muscle_boost_count = today_muscle_boost_count + 1 WHERE id = %s", (user_id,))
            quota_m_after_inc = ensure_daily_feature_quota(cursor, user_id, FEATURE_MUSCLE_BOOST, today)
            print(f"  Used after inc: {quota_m_after_inc['free_quota_used']} (Expected: 1)")

            conn.rollback() # Don't actually keep changes from test if possible, but we already committed some
            print("\nVerification completed successfully.")

    except Exception as e:
        print(f"Test failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    test_quota_logic()
