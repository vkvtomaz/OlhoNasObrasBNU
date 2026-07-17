import os

os.environ["DATABASE_URL"] = "sqlite:///./test.db"
from fastapi.testclient import TestClient
from app.core.database import engine
from app.models import Base
from app.main import app

Base.metadata.create_all(engine)
client = TestClient(app)


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_assistant_has_limits_and_source():
    response = client.post("/api/v1/assistant", json={"question": "O que é aditivo?"})
    assert response.status_code == 200
    assert response.json()["source"] == "/metodologia"
    assert "não substitui" in response.json()["notice"]


def test_contact_requires_consent():
    response = client.post(
        "/api/v1/contacts",
        json={
            "name": "Pessoa",
            "email": "pessoa@example.org",
            "category": "erro",
            "subject": "Teste",
            "message": "Mensagem com detalhes suficientes",
            "consent": False,
        },
    )
    assert response.status_code == 422
