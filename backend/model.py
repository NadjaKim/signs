import cv2
import numpy as np
import mediapipe as mp
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Разрешаем CORS (полезно при разработке)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Инициализация модели MediaPipe ---
BaseOptions = mp.tasks.BaseOptions
GestureRecognizer = mp.tasks.vision.GestureRecognizer
GestureRecognizerOptions = mp.tasks.vision.GestureRecognizerOptions
VisionRunningMode = mp.tasks.vision.RunningMode

model_path = "gesture_recognizer.task" # Убедись, что файл лежит рядом с app.py
options = GestureRecognizerOptions(
    base_options=BaseOptions(model_asset_path=model_path),
    running_mode=VisionRunningMode.IMAGE
)
recognizer = GestureRecognizer.create_from_options(options)
# --------------------------------------

@app.websocket("/ws/gesture")
async def gesture_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Получаем JPEG картинку в виде байтов с фронтенда
            data = await websocket.receive_bytes()
            
            # Конвертируем байты в numpy массив, а затем в OpenCV изображение
            nparr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if frame is None:
                continue

            # MediaPipe требует формат RGB
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(
                image_format=mp.ImageFormat.SRGB,
                data=rgb_frame
            )

            # Распознаем жест
            result = recognizer.recognize(mp_image)

            gesture_text = ""
            if result.gestures:
                gesture_text = result.gestures[0][0].category_name

            # Отправляем результат обратно на фронтенд
            await websocket.send_text(gesture_text)

    except WebSocketDisconnect:
        print("Клиент отключился")