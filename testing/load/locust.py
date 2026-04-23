"""
Entrada alternativa para ejecutar Locust con `-f testing/load/locust.py`.
Reexporta los usuarios definidos en `locustfile.py`.
"""

from pathlib import Path
import sys

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from locustfile import FrontendUser, SupabaseReadUser  # noqa: F401
