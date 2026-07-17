from datetime import date, datetime, timezone
from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Work(Base):
    __tablename__ = "works"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source_code: Mapped[str | None] = mapped_column(String(40), unique=True, nullable=True)
    slug: Mapped[str] = mapped_column(String(160), unique=True)
    name: Mapped[str] = mapped_column(String(240))
    purpose: Mapped[str] = mapped_column(Text)
    neighborhood: Mapped[str] = mapped_column(String(120))
    official_status: Mapped[str] = mapped_column(String(60))
    calculated_status: Mapped[str] = mapped_column(String(120))
    initial_value: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    current_value: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    paid_value: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    physical_progress: Mapped[float | None] = mapped_column(Float, nullable=True)
    financial_progress: Mapped[float | None] = mapped_column(Float, nullable=True)
    contract_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    start_effective: Mapped[date | None] = mapped_column(Date, nullable=True)
    original_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    updated_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    completion_real: Mapped[date | None] = mapped_column(Date, nullable=True)
    mandate_start: Mapped[int | None] = mapped_column(Integer, nullable=True)
    mandate_end: Mapped[int | None] = mapped_column(Integer, nullable=True)
    inherited: Mapped[bool] = mapped_column(Boolean, default=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    source_name: Mapped[str] = mapped_column(String(120), default="Portal EngeGOV")
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    contracts: Mapped[list["Contract"]] = relationship(cascade="all, delete-orphan")
    documents: Mapped[list["Document"]] = relationship(cascade="all, delete-orphan")
    changes: Mapped[list["Change"]] = relationship(cascade="all, delete-orphan")


class Contract(Base):
    __tablename__ = "contracts"
    id: Mapped[int] = mapped_column(primary_key=True)
    work_id: Mapped[int] = mapped_column(ForeignKey("works.id"))
    number: Mapped[str] = mapped_column(String(80))
    contractor: Mapped[str] = mapped_column(String(180))


class Document(Base):
    __tablename__ = "documents"
    id: Mapped[int] = mapped_column(primary_key=True)
    work_id: Mapped[int] = mapped_column(ForeignKey("works.id"))
    title: Mapped[str] = mapped_column(String(200))
    kind: Mapped[str] = mapped_column(String(80))
    source_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)


class Change(Base):
    __tablename__ = "changes"
    id: Mapped[int] = mapped_column(primary_key=True)
    work_id: Mapped[int] = mapped_column(ForeignKey("works.id"))
    field: Mapped[str] = mapped_column(String(80))
    old_value: Mapped[str | None] = mapped_column(String(240), nullable=True)
    new_value: Mapped[str | None] = mapped_column(String(240), nullable=True)
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class Contact(Base):
    __tablename__ = "contacts"
    id: Mapped[int] = mapped_column(primary_key=True)
    protocol: Mapped[str] = mapped_column(String(40), unique=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(180))
    category: Mapped[str] = mapped_column(String(80))
    subject: Mapped[str] = mapped_column(String(180))
    message: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
