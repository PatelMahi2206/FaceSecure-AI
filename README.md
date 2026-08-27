# FaceSecure AI

A full-stack AI-powered face recognition and employee management system built with React, FastAPI, PostgreSQL, and InsightFace.

FaceSecure AI allows administrators to manage employees, register facial biometric data, and recognize registered users through a camera-based face recognition system.

## 🚀 Live Demo

**Frontend:**  
https://face-secure-ai-dodw.vercel.app/

**Backend API:**  
https://facesecure-ai.onrender.com/

**API Documentation:**  
https://facesecure-ai.onrender.com/docs

---

## ✨ Features

### 🔐 Authentication
- Secure user login
- JWT-based authentication
- Password hashing
- Role-based access control
- Administrator and regular user roles

### 👨‍💼 Admin Dashboard
Administrators can:

- View all registered users
- Add new users
- Edit user information
- Delete users
- Activate/deactivate accounts
- Register facial data for employees
- View employee information
- Manage administrator accounts

### 🧑‍💻 Face Recognition
- Camera-based face capture
- Face detection using InsightFace
- Facial embedding generation
- Embedding storage in PostgreSQL
- Cosine similarity-based recognition
- Recognition threshold validation
- Returns employee information when a face is recognized
- Returns `Data is not available` when no matching face exists

### 🗄️ Database
The application uses PostgreSQL hosted on Neon.

Main database entities include:

- Users
- Face Embeddings

---

## 🏗️ System Architecture

```text
                    ┌─────────────────────┐
                    │      User / Admin   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   React Frontend    │
                    │      Vercel         │
                    └──────────┬──────────┘
                               │ HTTPS
                               ▼
                    ┌─────────────────────┐
                    │   FastAPI Backend   │
                    │       Render        │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       ┌────────────┐   ┌──────────────┐  ┌────────────┐
       │ PostgreSQL │   │  InsightFace │  │    JWT     │
       │    Neon    │   │ Face Engine  │  │   Auth     │
       └────────────┘   └──────────────┘  └────────────┘