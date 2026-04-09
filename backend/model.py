# import cv2
# import numpy as np
# import mediapipe as mp
# import os
# import sys
# import csv
# from datetime import datetime
# from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
# from fastapi.middleware.cors import CORSMiddleware
# from fastapi.staticfiles import StaticFiles
# from fastapi.responses import FileResponse

# if getattr(sys, 'frozen', False):
#     base_path = sys._MEIPASS
#     data_path = os.path.dirname(sys.executable)
# else:
#     base_path = os.path.dirname(os.path.abspath(__file__))
#     data_path = base_path

# app = FastAPI()

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# LOG_FILE = os.path.join(data_path, "gesture_logs.csv")

# if not os.path.exists(LOG_FILE):
#     with open(LOG_FILE, mode='w', newline='', encoding='utf-8') as f:
#         writer = csv.writer(f)
#         writer.writerow(["timestamp", "combination", "status"])

# model_path = os.path.join(base_path, "gesture_recognizer.task")
# options = mp.tasks.vision.GestureRecognizerOptions(
#     base_options=mp.tasks.BaseOptions(model_asset_path=model_path),
#     running_mode=mp.tasks.vision.RunningMode.IMAGE
# )
# recognizer = mp.tasks.vision.GestureRecognizer.create_from_options(options)

# @app.websocket("/ws/gesture")
# async def gesture_endpoint(websocket: WebSocket):
#     await websocket.accept()
#     try:
#         while True:
#             data = await websocket.receive_bytes()
#             nparr = np.frombuffer(data, np.uint8)
#             frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
#             if frame is not None:
#                 mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
#                 result = recognizer.recognize(mp_image)
#                 gesture = result.gestures[0][0].category_name if result.gestures else ""
#                 await websocket.send_text(gesture)
#     except WebSocketDisconnect:
#         pass

# @app.post("/save-log")
# async def save_log(request: Request):
#     try:
#         data = await request.json()
#         logs = data.get("logs", [])
#         with open(LOG_FILE, mode='a', newline='', encoding='utf-8') as f:
#             writer = csv.writer(f)
#             for log in logs:
#                 timestamp = log.get("timestamp", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
#                 combination = log.get("combination", "")
#                 status = log.get("status", "success")
#                 writer.writerow([timestamp, combination, status])
#         return {"status": "ok"}
#     except Exception:
#         return {"status": "error"}

# dist_path = os.path.join(base_path, "dist")

# if os.path.exists(os.path.join(dist_path, "assets")):
#     app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")

# @app.get("/{full_path:path}")
# async def serve_frontend(full_path: str):
#     file_path = os.path.join(dist_path, full_path)
#     if full_path != "" and os.path.exists(file_path):
#         return FileResponse(file_path)
#     return FileResponse(os.path.join(dist_path, "index.html"))

# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="127.0.0.1", port=8000)

import cv2
import numpy as np
import mediapipe as mp
import os
import sys
import csv
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

if getattr(sys, 'frozen', False):
    base_path = sys._MEIPASS
    data_path = os.path.dirname(sys.executable)
else:
    base_path = os.path.dirname(os.path.abspath(__file__))
    data_path = base_path

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LOG_FILE = os.path.join(data_path, "gesture_logs.csv")


if not os.path.exists(LOG_FILE):
    with open(LOG_FILE, mode='w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(["timestamp", "combination", "status"])

model_path = os.path.join(base_path, "gesture_recognizer.task")
options = mp.tasks.vision.GestureRecognizerOptions(
    base_options=mp.tasks.BaseOptions(model_asset_path=model_path),
    running_mode=mp.tasks.vision.RunningMode.IMAGE
)
recognizer = mp.tasks.vision.GestureRecognizer.create_from_options(options)


def is_in_center(hand_landmarks, threshold=0.17):
    """Проверяет, находится ли рука в центральном диапазоне"""
    if not hand_landmarks or len(hand_landmarks) == 0:
        return False
    
    # Берём запястье (landmark 0) первой руки
    wrist = hand_landmarks[0][0]

    center_x_min = 0.5 - threshold  
    center_x_max = 0.5 + threshold   
    center_y_min = 0.5 - threshold  
    center_y_max = 0.5 + threshold
    
    if (center_x_min <= wrist.x <= center_x_max and 
        center_y_min <= wrist.y <= center_y_max):
        return True
    
    return False


@app.websocket("/ws/gesture")
async def gesture_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_bytes()
            nparr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if frame is None:
                await websocket.send_text("")
                continue

            mp_image = mp.Image(
                image_format=mp.ImageFormat.SRGB, 
                data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            )
            
            result = recognizer.recognize(mp_image)
            
            gesture = ""
            # Отправляем жест только если он распознан И рука в центре
            if result.gestures and is_in_center(result.hand_landmarks):
                gesture = result.gestures[0][0].category_name
                
            await websocket.send_text(gesture)
            
    except WebSocketDisconnect:
        pass


@app.post("/save-log")
async def save_log(request: Request):
    try:
        data = await request.json()
        logs = data.get("logs", [])
        with open(LOG_FILE, mode='a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            for log in logs:
                timestamp = log.get("timestamp", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
                combination = log.get("combination", "")
                status = log.get("status", "success")
                writer.writerow([timestamp, combination, status])
        return {"status": "ok"}
    except Exception:
        return {"status": "error"}


dist_path = os.path.join(base_path, "dist")

if os.path.exists(os.path.join(dist_path, "assets")):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")

@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    file_path = os.path.join(dist_path, full_path)
    if full_path != "" and os.path.exists(file_path):
        return FileResponse(file_path)
    return FileResponse(os.path.join(dist_path, "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
