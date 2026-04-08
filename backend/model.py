import cv2
import numpy as np
import mediapipe as mp
import os
import sys
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Определяем путь к ресурсам (для работы внутри .exe)
if getattr(sys, 'frozen', False):
    base_path = sys._MEIPASS
else:
    base_path = os.path.dirname(os.path.abspath(__file__))

app = FastAPI()

# Инициализация MediaPipe
model_path = os.path.join(base_path, "gesture_recognizer.task")
options = mp.tasks.vision.GestureRecognizerOptions(
    base_options=mp.tasks.BaseOptions(model_asset_path=model_path),
    running_mode=mp.tasks.vision.RunningMode.IMAGE
)
recognizer = mp.tasks.vision.GestureRecognizer.create_from_options(options)

@app.websocket("/ws/gesture")
async def gesture_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_bytes()
            nparr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if frame is not None:
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                result = recognizer.recognize(mp_image)
                gesture = result.gestures[0][0].category_name if result.gestures else ""
                await websocket.send_text(gesture)
    except WebSocketDisconnect:
        pass

# Раздача фронтенда (максимально просто)
dist_path = os.path.join(base_path, "dist")

# Сначала монтируем статику (JS/CSS), которая лежит в dist/assets
if os.path.exists(os.path.join(dist_path, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")

# Главная страница и остальные файлы (favicon и т.д.)
@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    file_path = os.path.join(dist_path, full_path)
    if full_path != "" and os.path.exists(file_path):
        return FileResponse(file_path)
    return FileResponse(os.path.join(dist_path, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)