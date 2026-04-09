import csv
import os
from datetime import datetime

class GestureLogger:
    def __init__(self, filename="gesture_logs.csv"):
        self.filename = filename
        self._ensure_file_exists()

    def _ensure_file_exists(self):
        if not os.path.exists(self.filename):
            with open(self.filename, mode='w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(["timestamp", "combination", "status"])

    def log_batch(self, logs: list):
        with open(self.filename, mode='a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            for log in logs:
                timestamp = log.get("timestamp", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
                combination = log.get("combination", "")
                status = log.get("status", "success")
                writer.writerow([timestamp, combination, status])