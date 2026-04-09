import cv2
import numpy as np
import pytest
import os
from fastapi.testclient import TestClient
from model import app 

client = TestClient(app)

def test_save_log_endpoint():
    """Тест HTTP POST эндпоинта для сохранения логов."""
    log_data = {
        "logs": [
            {"timestamp": "2026-04-09 10:00:00", "combination": "Thumb_Up", "status": "success"}
        ]
    }
    response = client.post("/save-log", json=log_data)
    
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_gesture_websocket_with_dummy_frame():
    """Тест WebSocket эндпоинта с использованием искусственного кадра (без видео)."""
    dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)

    _, buffer = cv2.imencode('.jpg', dummy_frame)
    frame_bytes = buffer.tobytes()

    with client.websocket_connect("/ws/gesture") as websocket:
        websocket.send_bytes(frame_bytes)
        response = websocket.receive_text()
        
        assert response == ""

def test_gesture_websocket_full_video_analysis():
    video_path = "video_2026-04-09_11-39-01.mp4"
    
    if not os.path.exists(video_path):
        pytest.skip(f"Видео {video_path} не найдено.")

    cap = cv2.VideoCapture(video_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    print(f"\n Начинаю анализ видео: {video_path} ({total_frames} кадров)")

    recognized_gestures = []

    with client.websocket_connect("/ws/gesture") as websocket:
        frame_idx = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            _, buffer = cv2.imencode('.jpg', frame)

            websocket.send_bytes(buffer.tobytes())
            gesture = websocket.receive_text()
            
            if gesture:
                recognized_gestures.append((frame_idx, gesture))
                print(f"Кадр {frame_idx}: Обнаружен жест -> {gesture}")
            
            frame_idx += 1

    cap.release()

    print("\n--- Итоговый отчет анализа ---")
    if not recognized_gestures:
        print("Жесты не обнаружены ни на одном кадре.")
    else:
        unique_gestures = set([g[1] for g in recognized_gestures])
        print(f"Всего распознано жестов: {len(recognized_gestures)}")
        print(f"Уникальные жесты в видео: {', '.join(unique_gestures)}")
