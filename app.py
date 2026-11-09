import sys
from pathlib import Path
import uvicorn

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from backend.server import app


def main():
    print("=" * 75)
    print("SKILLSPRINT AI — ENTERPRISE DUAL-PIPELINE ONBOARDING PLATFORM")
    print("=" * 75)
    print("-> Server running on: http://127.0.0.1:8000")
    print("-> Swagger API Docs: http://127.0.0.1:8000/docs")
    print("-> React Frontend:   http://127.0.0.1:8000 (or http://localhost:5173 for Vite Dev)")
    print("-> Press Ctrl+C to stop server.\n")
    uvicorn.run("backend.server:app", host="127.0.0.1", port=8000, reload=False)

if __name__ == "__main__":
    main()
