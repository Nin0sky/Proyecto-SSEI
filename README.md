# Proyecto SSEI

Base implementada para iniciar el desarrollo de un sistema SSEI con arquitectura por capas:

- `src/domain`: Entidades del negocio.
- `src/application`: Casos de uso.
- `src/infrastructure`: Persistencia y acceso a datos.
- `src/interfaces`: Modelos de entrada y salida de API.
- `src/main.py`: Punto de entrada de FastAPI.

## Requisitos

- Python 3.10+
- pip

## Instalacion

```bash
python -m pip install -r requirements.txt
```

## Ejecucion

```bash
python -m uvicorn src.main:app --reload
```

La API queda disponible en:

- http://127.0.0.1:8000
- http://127.0.0.1:8000/docs

## Pruebas

```bash
python -m pytest -q
```

## Endpoints iniciales

- `GET /health`
- `GET /requirements`
- `POST /requirements`
- `PATCH /requirements/{requirement_id}/status`

## Estructura

```text
src/
  application/
    use_cases.py
  domain/
    models.py
  infrastructure/
    db.py
    repositories.py
  interfaces/
    schemas.py
  main.py
```

## Siguiente paso recomendado

Migrar la informacion de tus documentos (`ERS`, `Matriz de casos de uso`, `MER`) hacia los endpoints para consolidar backlog y trazabilidad.
