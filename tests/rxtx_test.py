import asyncio
from bleak import BleakClient

BLE_ADDRESS = "CB:8E:D0:CE:39:CC"  # BLE 장치 주소 입력
RX_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e"         # RX UUID (WRITE 속성)
TX_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e"        # TX UUID (NOTIFY 속성)

async def communicate_with_device():
    async with BleakClient(BLE_ADDRESS) as client:
        if client.is_connected:
            print("BLE 연결 성공")
            
            for _ in range(3):
                # 데이터 송신 (RX UUID 사용)
                await client.write_gatt_char(RX_UUID, b"PING\n")
                print("데이터 전송 완료: PING")

                # 데이터 수신 (TX UUID 사용)
                def notification_handler(sender, data):
                    print(f"수신된 데이터: {data.decode()}")

                await client.start_notify(TX_UUID, notification_handler)
                await asyncio.sleep(2)  # 10초 동안 알림 대기
                await client.stop_notify(TX_UUID)

asyncio.run(communicate_with_device())
