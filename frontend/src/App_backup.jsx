import { useEffect, useRef, useState } from "react";
import "./App.css";
import Login from "./Login";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [authenticated, setAuthenticated] = useState(
    !!localStorage.getItem("access_token")
  );

  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // =========================
  // LOGIN SUCCESS
  // =========================
  const handleLogin = () => {
    setAuthenticated(true);
    setError("");
  };

  // =========================
  // LOGOUT
  // =========================
  const handleLogout = () => {
    stopCamera();

    localStorage.removeItem("access_token");

    setAuthenticated(false);
    setResult(null);
    setError("");
  };

  // =========================
  // START CAMERA
  // =========================
  const startCamera = async () => {
    try {
      setError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera access is not supported by this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        await videoRef.current.play().catch(() => {});
      }

      setCameraActive(true);
    } catch (err) {
      console.error("Camera error:", err);

      setError(
        "Unable to access the camera. Please allow camera permission and try again."
      );
    }
  };

  // =========================
  // STOP CAMERA
  // =========================
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  };

  // =========================
  // SCAN FACE
  // =========================
  const scanFace = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setError("Camera is not ready.");
      return;
    }

    const token = localStorage.getItem("access_token");

    // No token
    if (!token) {
      setAuthenticated(false);
      setError("Please login before scanning a face.");
      return;
    }

    setScanning(true);
    setError("");
    setResult(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Make sure video has loaded dimensions
    if (!video.videoWidth || !video.videoHeight) {
      setError("Camera image is not ready. Please wait a moment and try again.");
      setScanning(false);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      setError("Unable to capture camera image.");
      setScanning(false);
      return;
    }

    // Capture current camera frame
    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setError("Unable to capture image.");
          setScanning(false);
          return;
        }

        try {
          const formData = new FormData();

          formData.append(
            "file",
            blob,
            "face-scan.jpg"
          );

          const response = await fetch(
            `${API_URL}/api/face/recognize`,
            {
              method: "POST",

              headers: {
                Authorization: `Bearer ${token}`,
              },

              body: formData,
            }
          );

          // Try to read JSON response
          let data;

          try {
            data = await response.json();
          } catch {
            data = {};
          }

          // =========================
          // AUTHENTICATION ERROR
          // =========================
          if (response.status === 401) {
            console.warn("Authentication token expired or invalid.");

            localStorage.removeItem("access_token");

            stopCamera();

            setAuthenticated(false);
            setResult(null);

            setError(
              "Your login session has expired. Please login again."
            );

            return;
          }

          // =========================
          // OTHER API ERROR
          // =========================
          if (!response.ok) {
            throw new Error(
              data.detail ||
              data.message ||
              "Face recognition failed."
            );
          }

          // =========================
          // SUCCESS
          // =========================
          setResult(data);

        } catch (err) {
          console.error("Face recognition error:", err);

          setError(
            err.message ||
            "Face recognition failed."
          );

        } finally {
          setScanning(false);
        }
      },
      "image/jpeg",
      0.9
    );
  };

  // =========================
  // CLEANUP CAMERA
  // =========================
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());

        streamRef.current = null;
      }
    };
  }, []);

  // =========================
  // SHOW LOGIN IF NOT AUTHENTICATED
  // =========================
  if (!authenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // =========================
  // MAIN APPLICATION
  // =========================
  return (
    <div className="app">

      {/* ================= HEADER ================= */}
      <header className="header">

        <div>
          <h1>FaceSecure AI</h1>

          <p>
            Intelligent Face Recognition System
          </p>
        </div>

        <div className="header-actions">

          <div className="status">

            <span
              className={`status-dot ${
                cameraActive ? "active" : ""
              }`}
            />

            {cameraActive
              ? "Scanner Active"
              : "Scanner Offline"}

          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>

        </div>

      </header>


      {/* ================= MAIN ================= */}
      <main className="main">

        {/* ================= SCANNER ================= */}
        <section className="scanner-card">

          <div className="scanner-header">

            <div>

              <h2>
                Face Scanner
              </h2>

              <p>
                Position your face inside the scanning area
              </p>

            </div>

          </div>


          {/* ================= CAMERA ================= */}
          <div className="camera-container">

            {!cameraActive && (

              <div className="camera-placeholder">

                <div className="camera-icon">
                  ◉
                </div>

                <h3>
                  Camera Ready
                </h3>

                <p>
                  Start the camera to begin face scanning.
                </p>

              </div>

            )}


            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`camera ${
                cameraActive ? "visible" : ""
              }`}
            />


            {/* FACE SCANNING FRAME */}
            {cameraActive && (

              <div className="face-frame">

                <div className="corner top-left" />

                <div className="corner top-right" />

                <div className="corner bottom-left" />

                <div className="corner bottom-right" />

                <div className="scan-line" />

              </div>

            )}


            {/* SCANNING OVERLAY */}
            {scanning && (

              <div className="scanning-overlay">

                <div className="loader" />

                <span>
                  Scanning face...
                </span>

              </div>

            )}

          </div>


          {/* HIDDEN CANVAS */}
          <canvas
            ref={canvasRef}
            className="hidden-canvas"
          />


          {/* ================= CONTROLS ================= */}
          <div className="controls">

            {!cameraActive ? (

              <button
                className="primary-button"
                onClick={startCamera}
              >
                Start Camera
              </button>

            ) : (

              <>
                <button
                  className="primary-button"
                  onClick={scanFace}
                  disabled={scanning}
                >
                  {scanning
                    ? "Scanning..."
                    : "Scan Face"}
                </button>

                <button
                  className="secondary-button"
                  onClick={stopCamera}
                  disabled={scanning}
                >
                  Stop Camera
                </button>
              </>

            )}

          </div>


          {/* ================= ERROR ================= */}
          {error && (

            <div className="error-message">
              {error}
            </div>

          )}

        </section>


        {/* ================= RESULT ================= */}
        <section className="result-card">

          <h2>
            Recognition Result
          </h2>


          {/* NO RESULT */}
          {!result && !scanning && (

            <div className="empty-result">

              <div className="result-icon">
                ?
              </div>

              <h3>
                No Scan Yet
              </h3>

              <p>
                Start the camera and scan a face to view
                employee information.
              </p>

            </div>

          )}


          {/* SCANNING */}
          {scanning && (

            <div className="empty-result">

              <div className="result-icon spinning">
                ◌
              </div>

              <h3>
                Analyzing Face
              </h3>

              <p>
                Please wait while FaceSecure analyzes
                the captured image.
              </p>

            </div>

          )}


          {/* ================= RECOGNIZED ================= */}
          {result?.recognized &&
            result.employee && (

              <div className="recognized">

                <div className="success-badge">
                  ✓ Face Recognized
                </div>


                <div className="employee-profile">

                  <div className="avatar">

                    {result.employee.name
                      ?.charAt(0)
                      .toUpperCase()}

                  </div>

                  <h3>
                    {result.employee.name}
                  </h3>

                  <p className="designation">
                    {result.employee.designation}
                  </p>

                </div>


                <div className="employee-info">

                  <div>
                    <span>
                      Employee ID
                    </span>

                    <strong>
                      {result.employee.employee_id}
                    </strong>
                  </div>


                  <div>
                    <span>
                      Email
                    </span>

                    <strong>
                      {result.employee.email}
                    </strong>
                  </div>


                  <div>
                    <span>
                      Phone
                    </span>

                    <strong>
                      {result.employee.phone}
                    </strong>
                  </div>


                  <div>
                    <span>
                      Department
                    </span>

                    <strong>
                      {result.employee.department}
                    </strong>
                  </div>


                  <div>
                    <span>
                      Designation
                    </span>

                    <strong>
                      {result.employee.designation}
                    </strong>
                  </div>


                  <div>
                    <span>
                      Role
                    </span>

                    <strong>
                      {result.employee.role}
                    </strong>
                  </div>


                  <div>
                    <span>
                      Status
                    </span>

                    <strong>
                      {result.employee.status
                        ? "Active"
                        : "Inactive"}
                    </strong>
                  </div>

                </div>

              </div>

            )}


          {/* ================= NOT RECOGNIZED ================= */}
          {result?.recognized === false && (

            <div className="not-recognized">

              <div className="warning-icon">
                !
              </div>

              <h3>
                Data Not Available
              </h3>

              <p>
                {result.message ||
                  "The scanned face is not registered in FaceSecure."}
              </p>

            </div>

          )}

        </section>

      </main>


      {/* ================= FOOTER ================= */}
      <footer>

        <p>
          FaceSecure AI • Secure Facial Recognition
        </p>

      </footer>

    </div>
  );
}

export default App;