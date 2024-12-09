import sqlite3
import pandas as pd

# SQLite3 데이터베이스 파일 경로
DB_PATH = "ant_monitoring_system.db"

# 데이터베이스 내용을 Pandas DataFrame으로 출력
def display_db_contents():
    """
    SQLite3 데이터베이스의 모든 데이터를 Pandas DataFrame으로 출력.
    """
    try:
        # SQLite3 연결
        conn = sqlite3.connect(DB_PATH)
        
        # SQL 쿼리 실행
        query = "SELECT * FROM sensor_data ORDER BY timestamp DESC"
        df = pd.read_sql_query(query, conn)
        
        # 연결 종료
        conn.close()
        
        # Pandas DataFrame 출력
        print("Database Contents:")
        print(df)
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    display_db_contents()
