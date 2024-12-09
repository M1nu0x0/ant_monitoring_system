import asyncio
import json
from datetime import datetime
from bleak import BleakClient

# JSON 파일 경로
CONFIG_FILE = "boards_config.json"

# 데이터를 저장할 파일 경로
DATA_LOG_FILE = "data_log.txt"

# JSON 설정 로드
def load_config(file_path):
    with open(file_path, "r") as file:
        data = json.load(file)
    return data

# 데이터 저장
def save_data_to_file(board_id, data):
    with open(DATA_LOG_FILE, "a") as file:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        file.write(f"[{timestamp}] {board_id}: {data}\n")
    print(f"데이터 저장 완료: {data}")

# BLE 데이터 수신
async def handle_board_data(board):
    address = board["address"]
    tx_uuid = board["tx_uuid"]
    rx_uuid = board["rx_uuid"]

    print(f"보드 '{board['name']}' ({address})에 연결 시도 중...")

    async with BleakClient(address) as client:
        if client.is_connected:
            print(f"'{board['name']}'에 연결 성공!")

            # 데이터 수신 핸들러 정의
            def notification_handler(sender, data):
                decoded_data = data.decode("utf-8").strip()
                print(f"수신된 데이터 ({board['name']}): {decoded_data}")
                save_data_to_file(board["id"], decoded_data)

            # TX UUID로 알림 시작
            await client.start_notify(tx_uuid, notification_handler)
            print(f"'{board['name']}'에서 데이터 수신 대기 중...")

            try:
                # 유저가 강제로 종료할 때까지 대기
                while True:
                    await asyncio.sleep(1)
            except asyncio.CancelledError:
                print(f"'{board['name']}' 연결 종료")
                await client.stop_notify(tx_uuid)
        else:
            print(f"'{board['name']}'에 연결 실패")

# 모든 보드 데이터 처리
async def monitor_all_boards(config):
    boards = config["boards"]
    tasks = [asyncio.create_task(handle_board_data(board)) for board in boards]

    # 모든 작업 실행 및 종료 대기
    try:
        await asyncio.gather(*tasks)
    except KeyboardInterrupt:
        print("\n프로그램 종료 요청. 모든 작업을 중단합니다.")
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)

# 메인 실행
if __name__ == "__main__":
    # JSON 설정 로드
    config = load_config(CONFIG_FILE)
    print("보드 설정 로드 완료")

    # 모든 보드 모니터링 시작
    try:
        asyncio.run(monitor_all_boards(config))
    except KeyboardInterrupt:
        print("\n스크립트 종료")
