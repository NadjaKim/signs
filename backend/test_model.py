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

def test_gesture_websocket_with_real_video():
    """Тест WebSocket эндпоинта с подачей кадров из реального видео."""
    video_path = "video_2026-04-09_11-39-01.mp4"
    
    if not os.path.exists(video_path):
        pytest.skip(f"Видео {video_path} не найдено, пропускаем тест с реальным видео.")

    cap = cv2.VideoCapture(video_path)
    
    with client.websocket_connect("/ws/gesture") as websocket:
        frames_tested = 0
        while frames_tested < 5:
            ret, frame = cap.read()
            if not ret:
                break
                
            _, buffer = cv2.imencode('.jpg', frame)
            
            websocket.send_bytes(buffer.tobytes())
        
            gesture = websocket.receive_text()

            assert isinstance(gesture, str)
            
            frames_tested += 1

    cap.release()
