from bleak import BleakScanner
import asyncio

async def scan_ble_devices(filter_none=False):
    print("BLE 디바이스 스캔 중...")
    devices = await BleakScanner.discover()
    for device in devices:
        if filter_none and device.name is None:
            continue
        print(f"디바이스 이름: {device.name}, 주소: {device.address}")

asyncio.run(scan_ble_devices(filter_none=True))
