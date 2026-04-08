import cv2
import numpy as np
import mediapipe as mp
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BaseOptions = mp.tasks.BaseOptions
GestureRecognizer = mp.tasks.vision.GestureRecognizer
GestureRecognizerOptions = mp.tasks.vision.GestureRecognizerOptions
VisionRunningMode = mp.tasks.vision.RunningMode

model_path = "gesture_recognizer.task" 
options = GestureRecognizerOptions(
    base_options=BaseOptions(model_asset_path=model_path),
    running_mode=VisionRunningMode.IMAGE
)
recognizer = GestureRecognizer.create_from_options(options)

@app.websocket("/ws/gesture")
async def gesture_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            
            data = await websocket.receive_bytes()

            nparr = np.frombuffer(data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if frame is None:
                continue

            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(
                image_format=mp.ImageFormat.SRGB,
                data=rgb_frame
            )

            result = recognizer.recognize(mp_image)

            gesture_text = ""
            if result.gestures:
                gesture_text = result.gestures[0][0].category_name

            await websocket.send_text(gesture_text)

    except WebSocketDisconnect:
        print("Клиент отключился")

app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")

@app.get("/")
async def serve_react_app():
    return FileResponse("dist/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)