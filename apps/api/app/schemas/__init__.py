from datetime import date, datetime
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class WorkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    source_code: str | None
    slug: str
    name: str
    purpose: str
    neighborhood: str
    official_status: str
    calculated_status: str
    initial_value: float | None
    current_value: float | None
    paid_value: float | None
    physical_progress: float | None
    financial_progress: float | None
    contract_date: date | None
    start_effective: date | None
    original_end: date | None
    updated_end: date | None
    completion_real: date | None
    mandate_start: int | None
    mandate_end: int | None
    inherited: bool
    updated_at: datetime
    source_name: str
    is_demo: bool


class ContactIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    category: str
    subject: str
    message: str = Field(min_length=10, max_length=5000)
    consent: bool


class AssistantIn(BaseModel):
    question: str = Field(min_length=2, max_length=500)
