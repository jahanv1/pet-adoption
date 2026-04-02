from pydantic import BaseModel
from typing import Optional


# --- Shelter ---
class ShelterRegister(BaseModel):
    name: str
    address: str
    capacity: int
    contact_no: str
    email: str
    password: str


class ShelterLogin(BaseModel):
    email: str
    password: str


# --- Adopter ---
class AdopterRegister(BaseModel):
    name: str
    address: str
    contact_no: str
    email: str
    password: str


class AdopterLogin(BaseModel):
    email: str
    password: str


# --- Animal ---
class AnimalCreate(BaseModel):
    name: str
    species: str
    breed: str
    age: int
    gender: str
    dob: Optional[str] = None
    status: str = "available"
    shelter_id: str
    foster_id: Optional[str] = None
    image_emoji: Optional[str] = "🐾"
    image_url: Optional[str] = None
    description: Optional[str] = ""
    story: Optional[str] = ""
    traits: Optional[list] = []


# --- Medical Details ---
class MedicalDetails(BaseModel):
    animal_id: str
    weight: Optional[float] = None
    temperature: Optional[float] = None
    last_checkup: Optional[str] = None
    vaccination_done: bool = False
    last_vaccine_date: Optional[str] = None


# --- Donation ---
class Donation(BaseModel):
    donor_name: str
    amount: float
    shelter_id: str
    staff_id: Optional[str] = None


# --- Trusted Foster ---
class TrustedFoster(BaseModel):
    name: str
    contact: str
    email: str
    duration: str
    shelter_id: str
