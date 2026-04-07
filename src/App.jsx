import { useEffect, useRef, useState } from "react";

import "./scss/App.scss";
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
  const streamRef = useRef(null); // 👈 храним поток

  const [error, setError] = useState(null);
  const [gesture, setGesture] = useState("");

  const [selected, setSelected] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState([false, false, false]);

  const [isCameraOn, setIsCameraOn] = useState(false); // 👈 камера выключена по дефолту

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
    const newSelection = shuffled.slice(0, 3);

    setSelected(newSelection);
    setCurrentIndex(0);
    setCompleted([false, false, false]);
  };

  // 🔌 WebSocket (оставляем как есть)
  useEffect(() => {
    wsRef.current = new WebSocket("ws://localhost:8000/ws/gesture");

    wsRef.current.onmessage = (event) => {
      setGesture(event.data);
    };

    wsRef.current.onerror = (err) => {
      console.error("Ошибка WebSocket:", err);
    };

    getRandomGestures();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // 🎥 Управление камерой
  useEffect(() => {
    const enableCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Ошибка доступа к камере:", err);
        setError("Не удалось получить доступ к камере");
      }
    };

    const disableCamera = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    if (isCameraOn) {
      enableCamera();
    } else {
      disableCamera();
    }
  }, [isCameraOn]);

  // 🔄 нормализация
  const normalize = (str) => {
    return str?.toLowerCase().replace(/[_\s]+/g, "").trim();
  };

  // 🔥 Проверка жестов
  useEffect(() => {
    if (!gesture || selected.length === 0) return;

    const expectedGesture = selected[currentIndex]?.name;

    if (normalize(gesture) === normalize(expectedGesture)) {
      setCompleted((prev) => {
        const updated = [...prev];
        updated[currentIndex] = true;
        return updated;
      });

      setCurrentIndex((prev) => prev + 1);
    }
  }, [gesture, selected, currentIndex]);

  // 📸 отправка кадров (только если камера включена!)
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!isCameraOn) return; // 👈 важно!

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
  }, [isCameraOn]);

  return (
    <div className="app">
      <h1 className="app__title">Gesture Auth Demo</h1>

      <button
        className={`app__button ${isCameraOn ? "app__button--off" : ""}`}
        onClick={() => setIsCameraOn((prev) => !prev)}
      >
        {isCameraOn ? "Выключить камеру" : "Включить камеру"}
      </button>

      <div className="app__status">
        {gesture
          ? `Распознан жест: ${gesture}`
          : "Жест не распознан / Ожидание..."}
      </div>

      {error && <div className="app__error">{error}</div>}

      <video ref={videoRef} autoPlay playsInline className="app__video" />

      <div className="app__gestures">
        {selected.map((g, i) => {
          const isActive = i === currentIndex;
          const isDone = completed[i];

          return (
            <div
              key={i}
              className={`gesture-card 
              ${isActive ? "gesture-card--active" : ""} 
              ${isDone ? "gesture-card--done" : ""}`}
            >
              <img
                src={g.img}
                alt={g.name}
                className="gesture-card__img"
                onError={(e) => {
                  console.log("Ошибка картинки:", g.img);
                  e.target.style.display = "none";
                }}
              />
              <div className="gesture-card__name">{g.name}</div>
            </div>
          );
        })}
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

export default App;