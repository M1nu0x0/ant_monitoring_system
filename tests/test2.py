from bleak import BleakClient
import asyncio

address = "CB:8E:D0:CE:39:CC"  # 오렌지보드 BLE 주소

async def check_connection():
    async with BleakClient(address) as client:
        if client.is_connected:
            print("BLE 연결됨")
            while (True):
                # 데이터 수신
                response = await client.read_gatt_char("6e400002-b5a3-f393-e0a9-e50e24dcca9e")
                print(f"받은 데이터: {response}")
                # 데이터 전송
                await client.write_gatt_char("6e400003-b5a3-f393-e0a9-e50e24dcca9e", b"LED_ON\n")
                print("데이터 전송: LED_ON")
        else:
            print("BLE 연결되지 않음")

asyncio.run(check_connection())
