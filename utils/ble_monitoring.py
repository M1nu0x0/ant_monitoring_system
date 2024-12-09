import asyncio
import json
import sqlite3
from bleak import BleakClient

def save_to_db(db_path, data_type, value):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute('INSERT INTO sensor_data (data_type, value) VALUES (?, ?)', (data_type, value))
    conn.commit()
    conn.close()

async def monitor_board(board, db_path):
    while True:
        try:
            async with BleakClient(board["address"]) as client:
                if client.is_connected:
                    async def notification_handler(sender, data):
                        decoded_data = data.decode("utf-8").strip()
                        data_type, value = decoded_data.split(',', 1)
                        # save_to_db(db_path, data_type, float(value))
                    await client.start_notify(board["tx_uuid"], notification_handler)
                    while client.is_connected:
                        await asyncio.sleep(1)
        except Exception as e:
            print(f"Board {board['name']} connection failed: {e}")
        finally:
            await asyncio.sleep(10)  # 10초 후 재시도

def start_ble_monitoring(config_file, db_path):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    with open(config_file, "r") as file:
        config = json.load(file)
    tasks = [monitor_board(board, db_path) for board in config["boards"]]
    loop.run_until_complete(asyncio.gather(*tasks))
