import sqlite3
from datetime import datetime, timedelta
import random
import time

# SQLite3 데이터베이스 파일 경로
DB_PATH = "ant_monitoring_system.db"

# JSON 보드 데이터 시뮬레이션
BOARDS = {
    "board1": ["food_weight", "food_motor"],
    "board2": ["temperature", "fan", "heat_pad"],
    "board3": ["trash_weight", "water_pump", "humidity", "humidity_motor"]
}

# 데이터베이스 초기화
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # 보드와 센서에 따른 테이블 생성
    for board, sensors in BOARDS.items():
        for sensor in sensors:
            table_name = f"{board}_{sensor}"
            cursor.execute(f"""
                CREATE TABLE IF NOT EXISTS {table_name} (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    value TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
    
    conn.commit()
    conn.close()

# 랜덤 데이터 생성
def generate_dummy_data():
    start_time = datetime.now()  # 시작 시간
    time_interval = 1  # 초 단위 간격

    for _ in range(1000):  # 1000개의 데이터 생성
        board = random.choice(list(BOARDS.keys()))
        sensor = random.choice(BOARDS[board])
        value = generate_random_value(sensor)

        # 모터 센서도 시간이 순차적으로 증가하도록 수정
        timestamp = start_time + timedelta(seconds=_ * time_interval)

        # 해당 board와 sensor에 맞는 테이블에 데이터 삽입
        table_name = f"{board}_{sensor}"
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(f"""
            INSERT INTO {table_name} (value, timestamp)
            VALUES (?, ?)
        """, (str(value), timestamp.isoformat()))
        conn.commit()
        conn.close()

        # time.sleep(0.01)  # 약간의 간격 추가 (필요시 조정)

    print("Dummy data inserted successfully")


# 센서 값 생성 로직
def generate_random_value(sensor):
    if sensor == "temperature":
        return round(random.uniform(15.0, 35.0), 2)  # 섭씨
    elif sensor == "humidity":
        return random.randint(30, 90)  # 퍼센트(%)
    elif sensor in ["trash_weight", "food_weight"]:
        return round(random.uniform(0, 50), 2)  # lbs 단위
    elif sensor in ["fan", "heat_pad", "water_pump", "humidity_motor", "food_motor"]:
        return random.choice([True, False])  # Boolean 값
    else:
        return None

if __name__ == "__main__":
    init_db()  # 데이터베이스 초기화
    generate_dummy_data()  # 더미 데이터 생성
