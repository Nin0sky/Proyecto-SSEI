from fastapi.testclient import TestClient

from src.infrastructure.db import get_connection, init_db
from src.main import app

def _reset_db() -> None:
    init_db()
    with get_connection() as connection:
        connection.execute("DELETE FROM requirement_use_case_traces")
        connection.execute("DELETE FROM use_cases")
        connection.execute("DELETE FROM requirements")
        connection.commit()


def test_traceability_flow() -> None:
    _reset_db()

    with TestClient(app) as client:
        requirement_response = client.post(
            "/requirements",
            json={
                "title": "Login de usuarios",
                "description": "El sistema debe permitir autenticacion de usuarios",
                "priority": "alta",
            },
        )
        assert requirement_response.status_code == 201
        requirement_id = requirement_response.json()["id"]

        use_case_response = client.post(
            "/use-cases",
            json={
                "code": "CU-01",
                "name": "Iniciar sesion",
                "description": "Usuario se autentica con correo y contrasena",
            },
        )
        assert use_case_response.status_code == 201
        use_case_id = use_case_response.json()["id"]

        link_response = client.post(f"/requirements/{requirement_id}/use-cases/{use_case_id}")
        assert link_response.status_code == 201
        assert link_response.json()["requirement_id"] == requirement_id
        assert link_response.json()["use_case_id"] == use_case_id

        requirement_use_cases_response = client.get(f"/requirements/{requirement_id}/use-cases")
        assert requirement_use_cases_response.status_code == 200
        requirement_use_cases = requirement_use_cases_response.json()
        assert len(requirement_use_cases) == 1
        assert requirement_use_cases[0]["id"] == use_case_id

        traceability_response = client.get("/traceability")
        assert traceability_response.status_code == 200
        traces = traceability_response.json()
        assert len(traces) == 1
        assert traces[0]["requirement_id"] == requirement_id
        assert traces[0]["use_case_id"] == use_case_id


def test_duplicate_link_returns_conflict() -> None:
    _reset_db()

    with TestClient(app) as client:
        requirement_response = client.post(
            "/requirements",
            json={
                "title": "Recuperar contrasena",
                "description": "El sistema debe permitir recuperar contrasena",
                "priority": "media",
            },
        )
        requirement_id = requirement_response.json()["id"]

        use_case_response = client.post(
            "/use-cases",
            json={
                "code": "CU-02",
                "name": "Recuperar acceso",
                "description": "Usuario solicita reestablecer su clave",
            },
        )
        use_case_id = use_case_response.json()["id"]

        first_link = client.post(f"/requirements/{requirement_id}/use-cases/{use_case_id}")
        assert first_link.status_code == 201

        second_link = client.post(f"/requirements/{requirement_id}/use-cases/{use_case_id}")
        assert second_link.status_code == 409
        assert second_link.json()["detail"] == "Traceability link already exists"


def test_link_with_missing_requirement_returns_not_found() -> None:
    _reset_db()

    with TestClient(app) as client:
        use_case_response = client.post(
            "/use-cases",
            json={
                "code": "CU-03",
                "name": "Gestionar perfil",
                "description": "Usuario modifica su informacion personal",
            },
        )
        assert use_case_response.status_code == 201
        use_case_id = use_case_response.json()["id"]

        missing_link = client.post(f"/requirements/9999/use-cases/{use_case_id}")
        assert missing_link.status_code == 404
        assert missing_link.json()["detail"] == "Requirement or use case not found"
