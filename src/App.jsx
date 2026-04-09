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
  const streamRef = useRef(null);
  const hasCameraBeenOn = useRef(false);

  const [error, setError] = useState(null);
  const [gesture, setGesture] = useState("");

  const [selected, setSelected] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completed, setCompleted] = useState([false, false, false]);

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isCounting, setIsCounting] = useState(false);
  const [attempts, setAttempts] = useState(3);
  const [isLocked, setIsLocked] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [noGestureTimer, setNoGestureTimer] = useState(null);

  const sendLogToServer = () => {
    const combination = selected.map(g => g.name).join("-");

    const now = new Date();
    const tashkentTime = now.toLocaleString('ru-RU', { 
      timeZone: 'Asia/Tashkent',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(',', '');

    fetch("http://localhost:8000/save-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        logs: [{
          timestamp: tashkentTime,
          combination: combination,
          status: "success"   
        }]
      })
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        console.log(" Лог успешно записан на сервер:", data);
      })
      .catch(err => {
        console.error(" Ошибка при отправке лога:", err);
      });
  };
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

  useEffect(() => {
    wsRef.current = new WebSocket("ws://localhost:8000/ws/gesture");
    wsRef.current.onmessage = (event) => setGesture(event.data);

    getRandomGestures();

    return () => wsRef.current?.close();
  }, []);

  useEffect(() => {
    const enableCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        hasCameraBeenOn.current = true;
      } catch {
        setError("Не удалось получить доступ к камере");
      }
    };

    const disableCamera = () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };

    if (isCameraOn) enableCamera();
    else disableCamera();
  }, [isCameraOn]);

  useEffect(() => {
    if (!isCameraOn || isBlocked || isSuccess) return;

    setCountdown(5);
    setIsCounting(true);
    setIsLocked(true);
  }, [isCameraOn, isBlocked, isSuccess]);

  useEffect(() => {
    if (!isCounting) return;
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsCounting(false);
          setIsLocked(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isCounting]);

  useEffect(() => {
    if (isCameraOn) return;
    if (isBlocked || isSuccess) return;
    if (!hasCameraBeenOn.current) return;

    setIsCounting(false);
    setIsLocked(false);
    if (noGestureTimer) {
      clearTimeout(noGestureTimer);
      setNoGestureTimer(null);
    }

    if (attempts > 0) {
      const newAttempts = attempts - 1;
      setAttempts(newAttempts);

      if (newAttempts <= 0) {
        setIsBlocked(true);
        return;
      }

      getRandomGestures();
    }
  }, [isCameraOn]);

  const normalize = (str) => str?.toLowerCase().replace(/[_\s]+/g, "").trim();

  useEffect(() => {
    if (!isCameraOn || isCounting || isBlocked || isSuccess) return;
    if (selected.length === 0) return;

    if (gesture && noGestureTimer) {
      clearTimeout(noGestureTimer);
      setNoGestureTimer(null);
    }

    const expected = selected[currentIndex]?.name;

    if (gesture && normalize(gesture) === normalize(expected)) {
      setCompleted(prev => {
        const updated = [...prev];
        updated[currentIndex] = true;
        return updated;
      });

      if (currentIndex + 1 === 3) {
        setIsSuccess(true);
        sendLogToServer();     
        return;
      }

      setCurrentIndex(prev => prev + 1);
      setCountdown(5);
      setIsCounting(true);
      setIsLocked(true);
    } else if (gesture) {
      const newAttempts = attempts - 1;
      setAttempts(newAttempts);

      if (newAttempts <= 0) {
        setIsBlocked(true);
        return;
      }

      getRandomGestures();
      setCountdown(5);
      setIsCounting(true);
      setIsLocked(true);
    }
  }, [gesture, isCameraOn, isCounting, isBlocked, isSuccess, currentIndex, selected, attempts]);

  useEffect(() => {
    if (!isCameraOn || isCounting || isBlocked || isSuccess) return;

    if (!gesture) {
      const timer = setTimeout(() => {
        const newAttempts = attempts - 1;
        setAttempts(newAttempts);

        if (newAttempts <= 0) {
          setIsBlocked(true);
          return;
        }

        getRandomGestures();
        setCountdown(5);
        setIsCounting(true);
        setIsLocked(true);
      }, 500);

      setNoGestureTimer(timer);
      return () => clearTimeout(timer);
    }
  }, [gesture, isCameraOn, isCounting, isBlocked, isSuccess, attempts]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!isCameraOn) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ws = wsRef.current;

      if (video && canvas && ws?.readyState === WebSocket.OPEN && video.videoWidth > 0) {
        const context = canvas.getContext("2d");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => blob && ws.send(blob), "image/jpeg", 0.7);
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, [isCameraOn]);

  return (
    <div className="container">
      <div className="app">
        <div className="app__header">
          <h1 className="app__title">Gesture Authentication</h1>
          <div className="app__progress">Step {Math.min(currentIndex + 1, 3)} of 3</div>
          <div className="app__progress-bar">
            <div
              className="app__progress-fill"
              style={{ width: `${(completed.filter(Boolean).length / 3) * 100}%` }}
            />
          </div>
        </div>
        <div className="app__content">
          <div className="camera-card">
            <div className="camera-card__media">
              {!isCameraOn && (
                <div className="camera-card__placeholder">
                  <div className="camera-card__placeholder-text">Camera is off</div>
                </div>
              )}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className={`camera-card__video ${!isCameraOn ? "camera-card__video--hidden" : ""}`} />
              {isCounting && (
                <div className="camera-card__timer">
                  0{countdown}
                </div>
              )}
              {isBlocked && (
                <div className="camera-card__message camera-card__message--error">
                  Attempts ended
                </div>
              )}
              {isSuccess && (
                <div className="camera-card__message camera-card__message--success">
                  Authentication complete
                </div>
              )}
            </div>
            <button
              className={`camera-card__button ${isCameraOn ? "camera-card__button--off" : ""}`}
              onClick={() => setIsCameraOn((prev) => !prev)}>
              {isCameraOn ? "Turn Off Camera" : "Turn On Camera"}
            </button>
          </div>
          <div className="steps-card">
            <div className={`steps-card__attempts ${attempts === 1 ? "steps-card__attempts--last" : ""}`}>
              Attempts: {attempts}
            </div>
            <div className="steps-card__list">
              {selected.map((g, i) => {
                const isActive = i === currentIndex;
                const isDone = completed[i];
                return (
                  <div
                    key={i}
                    className={`step ${isActive ? "step--active" : ""} ${isDone ? "step--done" : ""}`}
                  >
                    <div className="step__icon">
                      {isDone ? "✓" : isActive ? "●" : i + 1}
                    </div>
                    <img src={g.img} alt={g.name} className="step__img" />
                    <div className="step__info">
                      <div className="step__name">{g.name}</div>
                      <div className="step__status">
                        {isDone ? "Completed" : isActive ? "Show this gesture" : "Waiting"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="steps-card__status">
              {gesture ? `Detected: ${gesture}` : isCameraOn ? "Waiting for gesture..." : "Camera is off"}
            </div>
            {error && <div className="steps-card__error">{error}</div>}
          </div>
        </div>
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
    </div>

  );
}

export default App;