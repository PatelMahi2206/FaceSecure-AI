import { useEffect, useRef, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

function FaceAuthentication({ onLogin, onUseEmailLogin }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  };

  const startCamera = async () => {
    try {
      setError("");

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera access is not supported by this browser.");
        return;
      }

      if (streamRef.current) {
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
        await videoRef.current.play();
      }

      setCameraActive(true);
    } catch (cameraError) {
      console.error("Camera error:", cameraError);

      if (cameraError.name === "NotAllowedError") {
        setError(
          "Camera permission was denied. Please allow camera access and try again."
        );
      } else if (cameraError.name === "NotFoundError") {
        setError("No camera was found on this device.");
      } else {
        setError("Unable to access the camera. Please try again.");
      }

      stopCamera();
    }
  };

  const authenticateFace = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!cameraActive || !video || !canvas) {
      setError("Please start the camera first.");
      return;
    }

    if (!video.videoWidth || !video.videoHeight) {
      setError("Camera is still loading. Please wait a moment.");
      return;
    }

    setScanning(true);
    setError("");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      setError("Unable to capture the camera image.");
      setScanning(false);
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setError("Unable to capture the image.");
          setScanning(false);
          return;
        }

        try {
          const formData = new FormData();
          formData.append("file", blob, "face-login.jpg");

          const response = await fetch(`${API_URL}/api/auth/face-login`, {
            method: "POST",
            body: formData,
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(
              data.detail || data.message || "Face authentication failed."
            );
          }

          const token =
            data.access_token ||
            data.token ||
            data.accessToken;

          if (!token) {
            throw new Error(
              data.message || "Face authentication did not return an access token."
            );
          }

          const user = data.user || {
            employee_id: data.employee_id,
            email: data.email,
            role: data.role,
            name: data.name || "User",
            designation: data.designation || "",
            department: data.department || "",
            status: data.status ?? true,
          };

          localStorage.setItem("access_token", token);
          localStorage.setItem("user", JSON.stringify(user));

          stopCamera();

          onLogin({
            ...data,
            user,
          });
        } catch (authenticationError) {
          console.error("Face authentication error:", authenticationError);

          setError(
            authenticationError.message || "Face authentication failed."
          );
        } finally {
          setScanning(false);
        }
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>FaceSecure AI</h1>
          <p>Intelligent Face Recognition System</p>
        </div>

        <div className="status">
          <span className="status-dot" />
          Authentication Required
        </div>
      </header>

      <main className="auth-main">
        <section className="face-auth-card">
          <div className="face-auth-header">
            <div className="auth-icon">◉</div>
            <h2>Face Authentication</h2>
            <p>Authenticate securely using your registered face.</p>
          </div>

          <div className="auth-camera-container">
            {!cameraActive && (
              <div className="camera-placeholder">
                <div className="camera-icon">◉</div>
                <h3>Camera Ready</h3>
                <p>Start your camera to authenticate.</p>
              </div>
            )}

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`camera ${cameraActive ? "visible" : ""}`}
            />

            {cameraActive && (
              <div className="face-frame" aria-hidden="true">
                <div className="corner top-left" />
                <div className="corner top-right" />
                <div className="corner bottom-left" />
                <div className="corner bottom-right" />
                <div className="scan-line" />
              </div>
            )}

            {scanning && (
              <div className="scanning-overlay">
                <div className="loader" />
                <span>Authenticating face...</span>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden-canvas" />

          <div className="controls">
            {!cameraActive ? (
              <button
                type="button"
                className="primary-button"
                onClick={startCamera}
              >
                Start Camera
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="primary-button"
                  onClick={authenticateFace}
                  disabled={scanning}
                >
                  {scanning ? "Authenticating..." : "Authenticate Face"}
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={stopCamera}
                  disabled={scanning}
                >
                  Stop Camera
                </button>
              </>
            )}
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="auth-divider">
            <span>OR</span>
          </div>

          <button
            type="button"
            className="login-switch-button"
            onClick={onUseEmailLogin}
          >
            Login with Email &amp; Password
          </button>

          <p className="security-note">
            FaceSecure AI supports secure authentication for administrators
            and users.
          </p>
        </section>
      </main>
    </div>
  );
}

export default FaceAuthentication;