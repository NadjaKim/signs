import { useEffect, useRef, useState } from "react";


import thumbUp from "./gestures/thumb_up.jpg";
import thumbDown from "./gestures/thumb_down.jpg";
import closedFist from "./gestures/closed_fist.jpg";
import openPalm from "./gestures/open_palm.jpg";
import victory from "./gestures/victory.jpg";
import pointingUp from "./gestures/pointing_up.jpg";
import iloveyou from "./gestures/iloveyou.jpg";

function App() {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);
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
    const enableCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error(err);
        setError("Нет доступа к камере");
      }
    };

    enableCamera();
    getRandomGestures();
  }, []);

  return (
    <div style={{ textAlign: "center", marginTop: "20px" }}>
      <h1>Camera + Gestures</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          width: "600px",
          border: "2px solid #ccc",
          borderRadius: "10px",
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
              }}
            />
            <p>{g.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;