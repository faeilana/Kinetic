import os
from uuid import uuid4

ARIZE_SPACE_ID = os.getenv("ARIZE_SPACE_ID")
ARIZE_API_KEY = os.getenv("ARIZE_API_KEY")

_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client

    if not ARIZE_SPACE_ID or not ARIZE_API_KEY:
        return None

    try:
        from arize.api import Client

        _client = Client(space_id=ARIZE_SPACE_ID, api_key=ARIZE_API_KEY)
        return _client
    except Exception as e:
        print(f"Failed to initialize Arize client: {e}")
        return None


def log_predictions(predictions):
    client = _get_client()
    if client is None:
        return

    try:
        from arize.utils.types import Environments, ModelTypes

        for p in predictions:
            client.log(
                model_id="movement-runner",
                model_version="1.0",
                model_type=ModelTypes.SCORE_CATEGORICAL,
                environment=Environments.PRODUCTION,
                prediction_id=str(uuid4()),
                prediction_label=p.action,
                prediction_score=p.confidence,
                features={
                    "hip_y": p.hip_y,
                    "shoulder_y": p.shoulder_y,
                    "hip_x": p.hip_x,
                },
            )
    except Exception as e:
        print(f"Arize logging error: {e}")
