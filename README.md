# PawsHome — Pet Adoption & Shelter Management System 🐾

A full-stack pet adoption platform connecting shelters and adopters.

**Stack:** React + Vite · FastAPI · MongoDB (Motor async driver)

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB running locally on port `27017`

---

### 1. Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment variables
cp .env.example .env

# Start the server
uvicorn main:app --reload
```

API runs at **http://localhost:8000**
Interactive docs: **http://localhost:8000/docs**

> On first start, the database is automatically seeded with demo accounts and 10 sample animals.

**Demo credentials**
| Role    | Email                  | Password |
|---------|------------------------|----------|
| Shelter | demo@shelter.com       | demo123  |
| Adopter | demo@adopter.com       | demo123  |

---

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env

# Start the dev server
npm run dev
```

App runs at **http://localhost:5173**

---

## Project Structure

```
pet-adoption/
├── backend/
│   ├── main.py              # FastAPI app + startup seeder
│   ├── database.py          # MongoDB / Motor connection
│   ├── requirements.txt
│   ├── .env.example
│   ├── auth/
│   │   └── jwt_handler.py   # JWT creation & verification
│   ├── models/
│   │   └── schemas.py       # Pydantic request/response models
│   └── routes/
│       ├── auth.py          # /auth/shelter/* and /auth/adopter/*
│       └── animals.py       # /animals CRUD
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── index.css         # Global styles + custom paw cursor
        ├── api/axios.js      # Axios instance with JWT interceptor
        ├── context/AuthContext.jsx
        ├── components/
        │   ├── Navbar.jsx
        │   ├── AnimalCard.jsx
        │   └── ProtectedRoute.jsx
        └── pages/
            ├── Landing.jsx
            ├── ShelterLogin.jsx
            ├── ShelterDashboard.jsx
            ├── AdopterLogin.jsx
            └── AdopterDashboard.jsx
```

---

## API Reference

| Method | Endpoint                   | Auth | Description                  |
|--------|----------------------------|------|------------------------------|
| POST   | /auth/shelter/register     | ✗    | Register a new shelter       |
| POST   | /auth/shelter/login        | ✗    | Shelter login → JWT          |
| POST   | /auth/adopter/register     | ✗    | Register a new adopter       |
| POST   | /auth/adopter/login        | ✗    | Adopter login → JWT          |
| GET    | /animals/                  | ✗    | List animals (filterable)    |
| GET    | /animals/{id}              | ✗    | Get single animal            |
| POST   | /animals/                  | ✓    | Add animal (shelter only)    |
| PATCH  | /animals/{id}/status       | ✓    | Update animal status         |

**Query params for GET /animals/:** `status`, `species`, `shelter_id`

---

## Database Collections

| Collection       | Key fields                                                      |
|------------------|-----------------------------------------------------------------|
| shelters         | name, address, capacity, contact_no, email, password_hash      |
| adopters         | name, address, contact_no, email, password_hash                |
| animals          | name, species, breed, age, gender, status, shelter_id          |
| medical_details  | animal_id, weight, temperature, vaccination_done               |
| donations        | donor_name, amount, shelter_id, staff_id                       |
| trusted_foster   | name, contact, email, duration, shelter_id                     |

---

## Features

- JWT auth with separate tokens for shelters and adopters
- Protected routes on the frontend
- Auto-seeded demo data on first backend run
- Custom paw-print cursor site-wide
- Warm, playful UI with Nunito + Fredoka One fonts
- Fully responsive layout
- Animal filtering by species and free-text search
