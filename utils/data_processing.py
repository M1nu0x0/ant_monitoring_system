import sqlite3

DB_PATH = "sensor_data.db"

def get_latest_data():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        SELECT data_type, value FROM sensor_data 
        WHERE timestamp = (SELECT MAX(timestamp) FROM sensor_data)
    ''')
    data = {row[0]: row[1] for row in cursor.fetchall()}
    conn.close()
    return data

def get_sensor_data(interval):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    time_format = {
        "second": "%Y-%m-%d %H:%M:%S",
        "minute": "%Y-%m-%d %H:%M:00",
        "hour": "%Y-%m-%d %H:00:00",
        "day": "%Y-%m-%d",
        "month": "%Y-%m",
    }[interval]
    cursor.execute(f'''
        SELECT data_type, AVG(value), strftime("{time_format}", timestamp) as time 
        FROM sensor_data 
        GROUP BY data_type, time
    ''')
    data = cursor.fetchall()
    conn.close()
    return data
