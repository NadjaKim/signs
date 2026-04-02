import { useEffect, useRef, useState } from "react";

function App() {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
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
  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <h1>Camera Stream</h1>

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
    </div>
  );
}

export default App;