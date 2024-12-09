from bleak import BleakClient, BleakScanner
import asyncio

# 각 오렌지보드의 BLE 주소 리스트
devices = [
    # {"name": "OrangeBoard_1", "address": "주소_1"},
    {"name": "OrangeBoard_2", "address": "CB:8E:D0:CE:39:CC"}
]

# 데이터 송수신 함수
async def communicate_with_device(device):
    async with BleakClient(device["address"]) as client:
        if client.is_connected:
            print(f"{device['name']} 연결 성공")
            
            # 데이터 전송
            await client.write_gatt_char("TX_UUID", b"LED_ON\n")
            print(f"{device['name']}로 데이터 전송: LED_ON")
            
            # 데이터 수신
            response = await client.read_gatt_char("RX_UUID")
            print(f"{device['name']}에서 받은 데이터: {response}")

# 메인 함수
async def main():
    tasks = [communicate_with_device(device) for device in devices]
    await asyncio.gather(*tasks)

asyncio.run(main())
