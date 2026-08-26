import { useEffect, useRef, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  department: "",
  designation: "",
  role: "user",
  status: true,
  password: "",
};

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Add / Edit User
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(emptyForm);

  // Face Registration
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [faceUser, setFaceUser] = useState(null);
  const [faceLoading, setFaceLoading] = useState(false);
  const [faceError, setFaceError] = useState("");
  const [faceSuccess, setFaceSuccess] = useState("");
  const [faceCameraActive, setFaceCameraActive] = useState(false);

  const faceVideoRef = useRef(null);
  const faceCanvasRef = useRef(null);
  const faceStreamRef = useRef(null);

  // =====================================================
  // TOKEN
  // =====================================================

  const getToken = () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      throw new Error("Authentication token not found.");
    }

    return token;
  };

  // =====================================================
  // FETCH USERS
  // =====================================================

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      const response = await fetch(`${API_URL}/api/users/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            "Unable to load users."
        );
      }

      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Fetch users error:", err);

      setError(
        err.message || "Unable to load users."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // CAMERA CLEANUP
  // =====================================================

  const stopFaceCamera = () => {
    if (faceStreamRef.current) {
      faceStreamRef.current
        .getTracks()
        .forEach((track) => track.stop());

      faceStreamRef.current = null;
    }

    if (faceVideoRef.current) {
      faceVideoRef.current.srcObject = null;
    }

    setFaceCameraActive(false);
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    fetchUsers();

    return () => {
      if (faceStreamRef.current) {
        faceStreamRef.current
          .getTracks()
          .forEach((track) => track.stop());
      }
    };
  }, []);

  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleChange = (e) => {
    const {
      name,
      value,
      type,
      checked,
    } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  // =====================================================
  // ADD USER
  // =====================================================

  const openAddModal = () => {
    setEditingUser(null);
    setForm({ ...emptyForm });
    setError("");
    setShowModal(true);
  };

  // =====================================================
  // EDIT USER
  // =====================================================

  const openEditModal = (user) => {
    setEditingUser(user);

    setForm({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      department: user.department || "",
      designation: user.designation || "",
      role: user.role || "user",
      status: user.status ?? true,
      password: "",
    });

    setError("");
    setShowModal(true);
  };

  // =====================================================
  // CLOSE USER MODAL
  // =====================================================

  const closeModal = () => {
    if (saving) {
      return;
    }

    setShowModal(false);
    setEditingUser(null);
    setForm({ ...emptyForm });
    setError("");
  };

  // =====================================================
  // OPEN FACE MODAL
  // =====================================================

  const openFaceModal = (user) => {
    stopFaceCamera();

    setFaceUser(user);
    setFaceError("");
    setFaceSuccess("");
    setFaceLoading(false);
    setShowFaceModal(true);
  };

  // =====================================================
  // CLOSE FACE MODAL
  // =====================================================

  const closeFaceModal = () => {
    if (faceLoading) {
      return;
    }

    stopFaceCamera();

    setShowFaceModal(false);
    setFaceUser(null);
    setFaceError("");
    setFaceSuccess("");
  };

  // =====================================================
  // START CAMERA
  // =====================================================

  const startFaceCamera = async () => {
    try {
      setFaceError("");
      setFaceSuccess("");

      if (!navigator.mediaDevices?.getUserMedia) {
        setFaceError(
          "Camera access is not supported by this browser."
        );
        return;
      }

      if (faceStreamRef.current) {
        return;
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
            facingMode: "user",
          },
          audio: false,
        });

      faceStreamRef.current = stream;

      if (faceVideoRef.current) {
        faceVideoRef.current.srcObject = stream;

        await faceVideoRef.current
          .play()
          .catch(() => {});
      }

      setFaceCameraActive(true);
    } catch (err) {
      console.error(
        "Face registration camera error:",
        err
      );

      setFaceError(
        "Unable to access the camera. Please allow camera permission and try again."
      );

      setFaceCameraActive(false);
    }
  };

  // =====================================================
  // REGISTER FACE
  // =====================================================

  const registerFace = async () => {
    if (!faceUser) {
      setFaceError("No user selected.");
      return;
    }

    if (
      !faceVideoRef.current ||
      !faceCanvasRef.current
    ) {
      setFaceError("Camera is not ready.");
      return;
    }

    if (!faceCameraActive) {
      setFaceError(
        "Please start the camera first."
      );
      return;
    }

    const video = faceVideoRef.current;
    const canvas = faceCanvasRef.current;

    if (!video.videoWidth || !video.videoHeight) {
      setFaceError(
        "Camera image is not ready. Please wait a moment."
      );
      return;
    }

    setFaceLoading(true);
    setFaceError("");
    setFaceSuccess("");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      setFaceError(
        "Unable to capture camera image."
      );
      setFaceLoading(false);
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
          setFaceError(
            "Unable to capture image."
          );
          setFaceLoading(false);
          return;
        }

        try {
          const token = getToken();

          // IMPORTANT:
          // This was corrupted in your previous code.
          const formData = new FormData();

          formData.append(
            "file",
            blob,
            "face-registration.jpg"
          );

          const response = await fetch(
            `${API_URL}/api/face/register?employee_id=${encodeURIComponent(
              faceUser.employee_id
            )}`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: formData,
            }
          );

          let data = {};

          try {
            data = await response.json();
          } catch {
            data = {};
          }

          if (!response.ok) {
            throw new Error(
              data.detail ||
                data.message ||
                "Face registration failed."
            );
          }

          setFaceSuccess(
            data.message ||
              "Face registered successfully."
          );

          stopFaceCamera();

          await fetchUsers();
        } catch (err) {
          console.error(
            "Face registration error:",
            err
          );

          setFaceError(
            err.message ||
              "Face registration failed."
          );
        } finally {
          setFaceLoading(false);
        }
      },
      "image/jpeg",
      0.9
    );
  };

  // =====================================================
  // CREATE USER
  // =====================================================

  const createUser = async () => {
    const token = getToken();

    const response = await fetch(
      `${API_URL}/api/users/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          department:
            form.department || null,
          designation:
            form.designation || null,
          role: form.role,
          status: form.status,
          password: form.password,
        }),
      }
    );

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data.detail ||
          data.message ||
          "Unable to create user."
      );
    }

    return data;
  };

  // =====================================================
  // UPDATE USER
  // =====================================================

  const updateUser = async () => {
    if (!editingUser) {
      throw new Error(
        "No user selected for editing."
      );
    }

    const token = getToken();

    const response = await fetch(
      `${API_URL}/api/users/${editingUser.employee_id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || null,
          department:
            form.department || null,
          designation:
            form.designation || null,
          role: form.role,
          status: form.status,
        }),
      }
    );

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data.detail ||
          data.message ||
          "Unable to update user."
      );
    }

    return data;
  };

  // =====================================================
  // SAVE USER
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setError("");

    try {
      if (!editingUser) {
        if (!form.password) {
          throw new Error(
            "Password is required when creating a user."
          );
        }

        await createUser();
      } else {
        await updateUser();
      }

      setShowModal(false);
      setEditingUser(null);
      setForm({ ...emptyForm });

      await fetchUsers();
    } catch (err) {
      console.error(
        "Save user error:",
        err
      );

      setError(
        err.message ||
          "Unable to save user."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // DELETE USER
  // =====================================================

  const deleteUser = async (user) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${user.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      const token = getToken();

      const response = await fetch(
        `${API_URL}/api/users/${user.employee_id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(
          data.detail ||
            data.message ||
            "Unable to delete user."
        );
      }

      await fetchUsers();
    } catch (err) {
      console.error(
        "Delete user error:",
        err
      );

      setError(
        err.message ||
          "Unable to delete user."
      );
    }
  };

  // =====================================================
  // STATISTICS
  // =====================================================

  const totalUsers = users.length;

  const activeUsers = users.filter(
    (user) => user.status === true
  ).length;

  const inactiveUsers = users.filter(
    (user) => user.status === false
  ).length;

  const adminUsers = users.filter(
    (user) => user.role === "admin"
  ).length;

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="admin-dashboard">

      {/* =================================================
          DASHBOARD HEADER
      ================================================= */}

      <div className="dashboard-header">
        <div>
          <h2>Admin Dashboard</h2>

          <p>
            Manage users and FaceSecure AI system access.
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={fetchUsers}
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* =================================================
          STATISTICS
      ================================================= */}

      <div className="dashboard-stats">

        <div className="stat-card">
          <div className="stat-icon">👥</div>

          <div>
            <span>Total Users</span>
            <strong>{totalUsers}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✓</div>

          <div>
            <span>Active Users</span>
            <strong>{activeUsers}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">!</div>

          <div>
            <span>Inactive Users</span>
            <strong>{inactiveUsers}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">★</div>

          <div>
            <span>Administrators</span>
            <strong>{adminUsers}</strong>
          </div>
        </div>

      </div>

      {/* =================================================
          USER MANAGEMENT
      ================================================= */}

      <section className="admin-users-card">

        <div className="section-header">
          <div>
            <h3>User Management</h3>

            <p>
              View and manage registered FaceSecure AI users.
            </p>
          </div>

          <button
            className="add-user-button"
            onClick={openAddModal}
          >
            + Add User
          </button>
        </div>

        {error && (
          <div className="admin-error">
            {error}
          </div>
        )}

        {loading ? (
          <div className="admin-loading">
            <div className="admin-spinner" />
            <p>Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">
              👥
            </div>

            <h3>No users found</h3>

            <p>
              There are currently no users registered
              in the system.
            </p>
          </div>
        ) : (
          <div className="users-table-wrapper">

            <table className="users-table">

              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {users.map((user) => (
                  <tr
                    key={user.employee_id}
                  >

                    <td>
                      <strong>
                        #{user.employee_id}
                      </strong>
                    </td>

                    <td>
                      <div className="user-name-cell">

                        <div className="table-avatar">
                          {user.name
                            ?.charAt(0)
                            .toUpperCase() || "U"}
                        </div>

                        <span>
                          {user.name}
                        </span>

                      </div>
                    </td>

                    <td>
                      {user.email}
                    </td>

                    <td>
                      {user.department || "-"}
                    </td>

                    <td>
                      {user.designation || "-"}
                    </td>

                    <td>
                      <span
                        className={
                          user.role === "admin"
                            ? "table-role admin-role"
                            : "table-role user-role"
                        }
                      >
                        {user.role === "admin"
                          ? "Administrator"
                          : "User"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={
                          user.status
                            ? "table-status active-status"
                            : "table-status inactive-status"
                        }
                      >
                        {user.status
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    <td>
                      <div className="table-actions">

                        <button
                          className="table-action-button face-action"
                          onClick={() =>
                            openFaceModal(user)
                          }
                        >
                          Register Face
                        </button>

                        <button
                          className="table-action-button edit-action"
                          onClick={() =>
                            openEditModal(user)
                          }
                        >
                          Edit
                        </button>

                        <button
                          className="table-action-button delete-action"
                          onClick={() =>
                            deleteUser(user)
                          }
                        >
                          Delete
                        </button>

                      </div>
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>
        )}

      </section>

      {/* =================================================
          ADD / EDIT USER MODAL
      ================================================= */}

      {showModal && (
        <div className="user-modal-overlay">

          <div className="user-modal">

            <div className="user-modal-header">

              <div>
                <h2>
                  {editingUser
                    ? "Edit User"
                    : "Add New User"}
                </h2>

                <p>
                  {editingUser
                    ? "Update user information."
                    : "Create a new FaceSecure AI user."}
                </p>
              </div>

              <button
                className="modal-close-button"
                onClick={closeModal}
                disabled={saving}
                type="button"
              >
                ×
              </button>

            </div>

            <form
              className="user-form"
              onSubmit={handleSubmit}
            >

              <div className="form-grid">

                <div className="admin-form-group">
                  <label>Name</label>

                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label>Email</label>

                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="user@example.com"
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label>Phone</label>

                  <input
                    type="text"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Phone number"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Department</label>

                  <input
                    type="text"
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    placeholder="e.g. IT"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Designation</label>

                  <input
                    type="text"
                    name="designation"
                    value={form.designation}
                    onChange={handleChange}
                    placeholder="e.g. Software Engineer"
                  />
                </div>

                <div className="admin-form-group">
                  <label>Role</label>

                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                  >
                    <option value="user">
                      User
                    </option>

                    <option value="admin">
                      Administrator
                    </option>
                  </select>
                </div>

                {!editingUser && (
                  <div className="admin-form-group">

                    <label>Password</label>

                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Create password"
                      required
                    />

                  </div>
                )}

              </div>

              <label className="status-checkbox">

                <input
                  type="checkbox"
                  name="status"
                  checked={form.status}
                  onChange={handleChange}
                />

                <span>
                  Account Active
                </span>

              </label>

              {error && (
                <div className="admin-error modal-error">
                  {error}
                </div>
              )}

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingUser
                      ? "Update User"
                      : "Create User"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* =================================================
          FACE REGISTRATION MODAL
      ================================================= */}

      {showFaceModal && faceUser && (
        <div className="user-modal-overlay">

          <div className="user-modal face-registration-modal">

            {/* Header */}

            <div className="user-modal-header">

              <div>
                <h2>
                  Register Face
                </h2>

                <p>
                  Register the facial data for this employee.
                </p>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={closeFaceModal}
                disabled={faceLoading}
                aria-label="Close"
              >
                ×
              </button>

            </div>

            {/* Selected Employee */}

            <div className="face-user-info">

              <div className="table-avatar">
                {faceUser.name
                  ?.charAt(0)
                  .toUpperCase() || "U"}
              </div>

              <div className="face-user-details">

                <strong>
                  {faceUser.name}
                </strong>

                <span>
                  Employee ID: #{faceUser.employee_id}
                </span>

                <span>
                  {faceUser.email}
                </span>

              </div>

            </div>

            {/* Camera */}

            <div className="face-registration-camera">

              {!faceCameraActive && (
                <div className="face-camera-placeholder">

                  <div className="camera-icon">
                    ◉
                  </div>

                  <h3>
                    Camera Ready
                  </h3>

                  <p>
                    Start the camera to register
                    this user's face.
                  </p>

                </div>
              )}

              <video
                ref={faceVideoRef}
                autoPlay
                playsInline
                muted
                className={`camera ${
                  faceCameraActive
                    ? "visible"
                    : ""
                }`}
              />

              {/* Face Position Frame */}

              {faceCameraActive && (
                <div
                  className="face-frame"
                  aria-hidden="true"
                >
                  <div className="corner top-left" />
                  <div className="corner top-right" />
                  <div className="corner bottom-left" />
                  <div className="corner bottom-right" />
                </div>
              )}

              {/* Registering Overlay */}

              {faceLoading && (
                <div className="scanning-overlay">

                  <div className="loader" />

                  <span>
                    Registering face...
                  </span>

                </div>
              )}

            </div>

            {/* Hidden Canvas */}

            <canvas
              ref={faceCanvasRef}
              className="hidden-canvas"
            />

            {/* Instructions */}

            <div className="face-registration-instructions">

              <p>
                Position the user's face clearly
                inside the frame.
              </p>

              <p>
                Make sure the lighting is sufficient
                and the face is clearly visible.
              </p>

            </div>

            {/* Error */}

            {faceError && (
              <div className="admin-error">
                {faceError}
              </div>
            )}

            {/* Success */}

            {faceSuccess && (
              <div className="admin-success">
                {faceSuccess}
              </div>
            )}

            {/* Controls */}

            <div className="modal-actions face-modal-actions">

              {!faceCameraActive ? (
                <button
                  type="button"
                  className="primary-button"
                  onClick={startFaceCamera}
                  disabled={faceLoading}
                >
                  Start Camera
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={registerFace}
                    disabled={faceLoading}
                  >
                    {faceLoading
                      ? "Registering..."
                      : "Register Face"}
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={stopFaceCamera}
                    disabled={faceLoading}
                  >
                    Stop Camera
                  </button>
                </>
              )}

              <button
                type="button"
                className="secondary-button"
                onClick={closeFaceModal}
                disabled={faceLoading}
              >
                Close
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default AdminDashboard;