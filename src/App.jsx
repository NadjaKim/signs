import { useEffect, useRef, useState } from "react";

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  
  const [error, setError] = useState(null);
  const [gesture, setGesture] = useState("");

  useEffect(() => {
    // 1. Устанавливаем WebSocket соединение с бэкендом
    wsRef.current = new WebSocket("ws://localhost:8000/ws/gesture");

    wsRef.current.onmessage = (event) => {
      // Получаем ответ от бэкенда и обновляем стейт
      setGesture(event.data);
    };

    wsRef.current.onerror = (err) => {
      console.error("Ошибка WebSocket:", err);
    };

    // 2. Включаем камеру
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

    // Очистка при размонтировании компонента
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    // 3. Запускаем цикл отправки кадров
    const intervalId = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ws = wsRef.current;

      // Убеждаемся, что видео идет и сокет открыт
      if (video && canvas && ws?.readyState === WebSocket.OPEN) {
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          const context = canvas.getContext("2d");
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          // Рисуем текущий кадр видео на канвасе
          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Конвертируем канвас в Blob (JPEG) и отправляем
          canvas.toBlob(
            (blob) => {
              if (blob) {
                ws.send(blob);
              }
            },
            "image/jpeg",
            0.7 // Качество 70% для сжатия и скорости передачи
          );
        }
      }
    }, 100); // <-- 100 мс (10 кадров в секунду). Это оптимально!

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <h1>Camera Stream</h1>

      {/* Показываем распознанный жест */}
      <h2 style={{ color: "green", minHeight: "40px" }}>
        {gesture ? `Распознан жест: ${gesture}` : "Жест не распознан / Ожидание..."}
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

      {/* Скрытый канвас для захвата кадров */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

export default App;