import sqlite3
import asyncio
from bleak import BleakClient
from datetime import datetime

from utils.custom_logger import log

DB_PATH = "ant_monitoring_system.db"

async def monitor_board(board, db_path, command_queue):
    while True:
        try:
            log(f"Connecting to board {board['name']} at {board['address']}...")
            async with BleakClient(board["address"]) as client:
                if client.is_connected:
                    log(f"Connected to {board['name']}!")

                    async def notification_handler(sender, data):
                        try:
                            decoded_data = data.decode("utf-8").strip()
                            datas = decoded_data.split('/')
                            for data in datas:
                                data_type, value = data.split(',', 1)
                                save_to_db(db_path, board["id"], data_type, str(value))
                                log(f"Data from {board['name']}: {data_type}, {value}")
                        except Exception as e:
                            log(f"processing data from {board['name']}: {e}", "ERROR")

                    await client.start_notify(board["tx_uuid"], notification_handler)

                    while client.is_connected:
                        command, value = await command_queue.get()
                        log(f"Sending command to {board['name']}: {command}, {value}")
                        byte_command = bytearray(f"{command},{value}\n".encode())
                        try:
                            await client.write_gatt_char(board["rx_uuid"], byte_command, response=True)
                        except Exception as e:
                            log(f"sending command to {board['name']}: {e}", "ERROR")
                        command_queue.task_done()
                        # await asyncio.sleep(0.1)
        except Exception as e:
            log(f"Board {board['name']} connection failed: {e}", "ERROR")
            await asyncio.sleep(1)  # 10초 후 재시도


def save_to_db(db_path, board_id, sensor, value):
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        table_name = f"{board_id}_{sensor}"
        
        # 테이블이 존재하지 않으면 생성
        cursor.execute(f"""
            CREATE TABLE IF NOT EXISTS {table_name} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                value TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        timestamp = datetime.now().isoformat()
        cursor.execute(f"""
            INSERT INTO {table_name} (value, timestamp)
            VALUES (?, ?)
        """, (str(value), timestamp))

        conn.commit()
    except Exception as e:
        log(f"saving to DB: {e}", "ERROR")
    finally:
        conn.close()

async def start_monitoring(boards, db_path, command_queues):
    await asyncio.gather(
        *[monitor_board(board, db_path, command_queues[board["id"]]) for board in boards]
    )
