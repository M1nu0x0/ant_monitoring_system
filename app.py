import asyncio
import threading
import sqlite3
import json

from flask import Flask, render_template, request, jsonify

from utils.custom_logger import log
from utils.ble_process import start_monitoring

# SQLite3 데이터베이스 파일 경로
DB_PATH = "ant_monitoring_system.db"

# JSON 파일에서 보드 데이터 로드
with open("boards_config.json", "r") as f:
    BOARDS = json.load(f)["boards"]
    COMMANDS = {}
    for board in BOARDS:
        COMMANDS.update(board["commands"])
    COMMANDS["auto"] = "AUTO"
    # log(f"Commands: {COMMANDS}")

# board id만큼 command queue
command_queues = {board["id"]: asyncio.Queue() for board in BOARDS}


# Flask 앱 생성
app = Flask(__name__)

# 데이터베이스 초기화
def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sensor_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        board TEXT NOT NULL,
        sensor TEXT NOT NULL,
        value TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
    """)
    conn.commit()
    conn.close()

@app.route("/boards", methods=["GET"])
def get_boards():
    """
    모든 보드와 센서 목록을 반환.
    """
    boards=[]
    for board in BOARDS:
        boards.append(
            {
                "boardId": board["id"],
                "sensors": board["data"]
            }
        )
    return jsonify({"status": "success", "data": boards})

@app.route("/command/<board_id>/<sensor>/<data>", methods=["POST"])
def post_commands(board_id, sensor, data):
    """
    아두이노 보드에 명령을 내림
    """
    try:
        log(f"Command received: {board_id}, {sensor}, {data}")
        future = asyncio.run_coroutine_threadsafe(
            command_queues[board_id].put((COMMANDS[sensor], data)),
            loop,
        )
        # future.result(1)  # 1초 대기
        return jsonify({"status": "success"})
    except StopIteration:
        return jsonify({"status": "error", "message": f"Board {board_id} not found"}), 404
    except KeyError:
        return jsonify({"status": "error", "message": f"Sensor {sensor} not found"}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/fetch/<board_id>/<sensor>/<int:n>", methods=["GET"])
def fetch_data(board_id, sensor, n):
    """
    특정 보드와 센서의 최신 N개의 데이터를 조회.
    최신 timestamp와 비교하여 동일하면 304 상태 코드 반환.
    """
    try:
        # 클라이언트에서 보내는 `If-Modified-Since` 헤더 확인
        client_timestamp = request.headers.get('If-Modified-Since')

        # 요청된 테이블 명 (board와 sensor 기반)
        table_name = f"{board_id}_{sensor}"
        
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # 데이터 조회 쿼리 실행
        cursor.execute(f"""
            SELECT value, timestamp
            FROM {table_name}
            ORDER BY timestamp DESC
            LIMIT ?
        """, (n,))
        
        rows = cursor.fetchall()
        conn.close()

        if not rows:
            return jsonify({"status": "error", "message": "No data found"}), 404

        latest_timestamp = rows[0][1]

        # 클라이언트의 timestamp와 최신 timestamp 비교
        if client_timestamp and client_timestamp == latest_timestamp:
            return "", 304  # 동일하면 304 상태 코드 반환

        data = [{"value": row[0], "timestamp": row[1]} for row in rows]

        return jsonify({"status": "success", "data": data})

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/fetch_all_datas/<int:n>", methods=["GET"])
def fetch_all_datas(n):
    """
    데이터베이스의 모든 센서 테이블에서 최신 N개의 데이터를 조회.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # 모든 테이블 이름 가져오기
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        tables = [row[0] for row in cursor.fetchall()]

        if not tables:
            return jsonify({"status": "error", "message": "No tables found in the database"}), 404

        data = []
        for table in tables:
            try:
                cursor.execute(f"""
                    SELECT value, timestamp
                    FROM {table}
                    ORDER BY timestamp DESC
                    LIMIT ?
                """, (n,))
                rows = cursor.fetchall()
                for row in rows:
                    data.append({"table": table, "value": row[0], "timestamp": row[1]})
            except sqlite3.OperationalError as e:
                print(f"Error querying table {table}: {e}")

        conn.close()

        if not data:
            return jsonify({"status": "error", "message": "No data found in any table"}), 404

        return jsonify({"status": "success", "data": data})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/charts")
def charts():
    return render_template("charts.html")

@app.route("/")
def index():
    return render_template("index.html")

if __name__ == "__main__":
    # 데이터베이스 초기화
    init_db()
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    
    def run_flask():
        # Flask 앱 실행
        # app.run(host="192.168.4.1", port=5000)
        app.run(host="0.0.0.0", port=5000)
    
    threading.Thread(target=run_flask, daemon=True).start()
    log("="*50)
    log("Starting Flask server")
    
    loop.run_until_complete(start_monitoring(BOARDS, DB_PATH, command_queues))
    log("Starting BLE monitoring")
