import { useEffect, useRef, useState } from "react";

import thumbUp from "./gestures/thumb_up.png";
import thumbDown from "./gestures/thumb_down.png";
import closedFist from "./gestures/closed_fist.png";
import openPalm from "./gestures/open_palm.png";
import victory from "./gestures/victory.png";
import pointingUp from "./gestures/pointing_up.png";
import iloveyou from "./gestures/iloveyou.png";

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  
  const [error, setError] = useState(null);
  const [gesture, setGesture] = useState("");

  
  const [selected, setSelected] = useState([]);

  const gestures = [
    { name: "Thumb Up", img: thumbUp },
    { name: "Thumb Down", img: thumbDown },
    { name: "Closed Fist", img: closedFist },
    { name: "Open Palm", img: openPalm },
    { name: "Victory", img: victory },
    { name: "Pointing Up", img: pointingUp },
    { name: "ILoveYou", img: iloveyou },
  ];

  const getRandomGestures = () => {
    const shuffled = [...gestures].sort(() => Math.random() - 0.5);
    setSelected(shuffled.slice(0, 3));
  };

  useEffect(() => {
    // 1. WebSocket
    wsRef.current = new WebSocket("ws://localhost:5173/ws/gesture");

    wsRef.current.onmessage = (event) => {
      setGesture(event.data);
    };

    wsRef.current.onerror = (err) => {
      console.error("Ошибка WebSocket:", err);
    };

    // 2. Камера
    const enableCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Ошибка доступа к камере:", err);
        setError("Не удалось получить доступ к камере");
      }
    };

    enableCamera();

  
    getRandomGestures();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ws = wsRef.current;

      if (video && canvas && ws?.readyState === WebSocket.OPEN) {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          const context = canvas.getContext("2d");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                ws.send(blob);
              }
            },
            "image/jpeg",
            0.7
          );
        }
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <h1>Camera Stream</h1>

      {/* распознанный жест */}
      <h2 style={{ color: "green", minHeight: "40px" }}>
        {gesture
          ? `Распознан жест: ${gesture}`
          : "Жест не распознан / Ожидание..."}
      </h2>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          width: "600px",
          borderRadius: "10px",
          border: "2px solid #ccc",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: "20px",
        }}
      >
        {selected.map((g, i) => (
          <div key={i} style={{ margin: "10px" }}>
            <img
              src={g.img}
              alt={g.name}
              width="120"
              onError={(e) => {
                console.log("Ошибка картинки:", g.img);
                e.target.style.display = "none";
              }}
            />
            <p>{g.name}</p>
          </div>
        ))}
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

export default App;