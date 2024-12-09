import sqlite3
import pandas as pd

# SQLite3 데이터베이스 파일 경로
DB_PATH = "ant_monitoring_system.db"

# JSON 보드 데이터 시뮬레이션
BOARDS = {
    "board1": ["food_weight", "food_motor"],
    "board2": ["temperature", "fan", "heat_pad"],
    "board3": ["trash_weight", "water_pump", "humidity", "humidity_motor"]
}

# 데이터베이스 내용을 Pandas DataFrame으로 출력
def display_db_contents():
    """
    SQLite3 데이터베이스의 모든 보드와 센서 데이터를 Pandas DataFrame으로 출력.
    """
    try:
        # SQLite3 연결
        conn = sqlite3.connect(DB_PATH)
        
        # 각 보드와 센서 테이블의 데이터를 가져와서 출력
        for board, sensors in BOARDS.items():
            for sensor in sensors:
                table_name = f"{board}_{sensor}"
                print(f"Contents of {table_name}:")
                try:
                    # SQL 쿼리 실행
                    query = f"SELECT * FROM {table_name} ORDER BY timestamp DESC"
                    df = pd.read_sql_query(query, conn)
                    # Pandas DataFrame 출력
                    print(df)
                except Exception as e:
                    print(f"Could not read table {table_name}: {e}")
        
        # 연결 종료
        conn.close()
        
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    display_db_contents()
