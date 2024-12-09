from bleak import BleakClient, BleakScanner
import asyncio

BLE_ADDRESS = "CB:8E:D0:CE:39:CC"  # BLE 장치 주소 입력 (예: "A4:C1:38:7F:92:AB")
BLE_ADDRESS = "D1:86:F8:18:A6:49"  # BLE 장치 주소 입력 (예: "A4:C1:38:7F:92:AB")

async def discover_services():
    async with BleakClient(BLE_ADDRESS) as client:
        print("BLE 장치 연결됨")
        print("GATT 서비스 및 특성 탐색 중...")
        
        services = client.services
        for service in services:
            print(f"서비스: {service.uuid}")
            for char in service.characteristics:
                print(f"  특성 UUID: {char.uuid}")
                print(f"  속성: {char.properties}")  # 읽기, 쓰기, 알림 등
        print("탐색 완료!")

asyncio.run(discover_services())
