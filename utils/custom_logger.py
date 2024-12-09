import os
from datetime import datetime

today = datetime.now().strftime("%Y%m%d")

os.makedirs("logs", exist_ok=True)

def log(msg, level="INFO"):
    with open(f"logs/log_{today}.log", "a") as f:
        f.write(f"{datetime.now()} [{level}] {msg}\n")
