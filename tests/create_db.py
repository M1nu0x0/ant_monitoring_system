import sqlite3
from datetime import datetime, timedelta
import random

# 데이터베이스 연결 및 테이블 생성
conn = sqlite3.connect('sensor_data.db')
cursor = conn.cursor()

# sensor_data 테이블 생성
cursor.execute('''
    CREATE TABLE IF NOT EXISTS sensor_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data_type TEXT,
        value REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
''')

# 샘플 데이터 설정
boards = {
    "board1": ["Weight_board1", "Food_MOTOR_board1"],
    "board2": ["Temperature_board2", "Temperature_plus_MOTOR_board2", "Temperature_minus_MOTOR_board2"],
    "board3": ["Weight_board3", "Water_MOTOR_board3", "Humidity_board3", "Humidity_plus_MOTOR_board3"]
}

# 데이터 생성
now = datetime.now()

for i in range(2000):  # 2000개의 데이터 생성
    for board, sensors in boards.items():
        for sensor in sensors:
            # 센서 데이터 값
            value = random.uniform(0, 100) if "MOTOR" not in sensor else random.choice([0, 1])
            timestamp = now - timedelta(seconds=i * 1)  # 1초 간격
            cursor.execute('INSERT INTO sensor_data (data_type, value, timestamp) VALUES (?, ?, ?)',
                           (sensor, value, timestamp))

# 변경사항 저장 및 연결 종료
conn.commit()
conn.close()

print("더미 데이터베이스 생성 완료!")
