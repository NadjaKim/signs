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

    wsRef.current.onmessage = (event) => {
      setGesture(event.data);
    };

    getRandomGestures();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  useEffect(() => {
    const enableCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        setError("Не удалось получить доступ к камере");
      }
    };

    const disableCamera = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
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
  }, [isCameraOn]);

  useEffect(() => {
    if (!isCounting) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(interval);
          setIsCounting(false);
          setIsLocked(false);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isCounting]);

  const normalize = (str) => str?.toLowerCase().replace(/[_\s]+/g, "").trim();

  useEffect(() => {
    if (isCounting || isBlocked || isSuccess) return;
    if (!gesture || selected.length === 0) return;

    const expectedGesture = selected[currentIndex]?.name;

    if (normalize(gesture) === normalize(expectedGesture)) {
      setCompleted((prev) => {
        const updated = [...prev];
        updated[currentIndex] = true;
        return updated;
      });

      if (currentIndex + 1 === 3) {
        setIsSuccess(true);
        return;
      }

      setCurrentIndex((prev) => prev + 1);
      setCountdown(5);
      setIsCounting(true);
      setIsLocked(true);
    } else {
      const newAttempts = attempts - 1;
      setAttempts(newAttempts);

      if (newAttempts <= 0) {
        setIsBlocked(true);
        return;
      }

      getRandomGestures();
      setCurrentIndex(0);
      setCompleted([false, false, false]);

      setCountdown(5);
      setIsCounting(true);
      setIsLocked(true);
    }
  }, [isCounting, gesture]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!isCameraOn) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ws = wsRef.current;

      if (video && canvas && ws?.readyState === WebSocket.OPEN) {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          const context = canvas.getContext("2d");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          canvas.toBlob((blob) => {
            if (blob) ws.send(blob);
          }, "image/jpeg", 0.7);
        }
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, [isCameraOn]);

  return (
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
          <div className="camera-card__media" style={{ position: "relative" }}>
            {!isCameraOn && (
              <div className="camera-card__placeholder">
                <div className="camera-card__placeholder-text">Camera is off</div>
              </div>
            )}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              className={`camera-card__video ${!isCameraOn ? "camera-card__video--hidden" : ""}`}
            />

            {isCounting && (
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                fontSize: "120px",
                fontWeight: "bold",
                color: "#00ffcc",
                textShadow: "0 0 20px rgba(0,255,200,0.8)",
                pointerEvents: "none"
              }}>
                {countdown}
              </div>
            )}

            {isBlocked && (
              <div style={{
                position: "absolute",
                bottom: "20px",
                width: "100%",
                textAlign: "center",
                fontSize: "48px",
                fontWeight: "bold",
                color: "red",
                pointerEvents: "none"
              }}>
                ATTEMPTS ENDED
              </div>
            )}

            {isSuccess && (
              <div style={{
                position: "absolute",
                bottom: "20px",
                width: "100%",
                textAlign: "center",
                fontSize: "48px",
                fontWeight: "bold",
                color: "lime",
                pointerEvents: "none"
              }}>
                SUCCESS! All gestures completed.
              </div>
            )}
          </div>

          <button
            className={`camera-card__button ${isCameraOn ? "camera-card__button--off" : ""}`}
            onClick={() => setIsCameraOn((prev) => !prev)}
          >
            {isCameraOn ? "Turn Off Camera" : "Turn On Camera"}
          </button>
        </div>

        <div className="steps-card">
          <div style={{
            fontSize: "28px",
            fontWeight: "bold",
            color: attempts === 1 ? "red" : "#00ffcc",
            marginBottom: "10px"
          }}>
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
  );
}

export default App;