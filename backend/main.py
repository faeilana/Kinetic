import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from arize_client import log_predictions

load_dotenv()

DB_PATH = Path(__file__).parent / "kinetic.db"


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            confidence REAL NOT NULL,
            hip_y REAL,
            shoulder_y REAL,
            hip_x REAL,
            timestamp INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            score INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Kinetic Runner API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class Prediction(BaseModel):
    action: str
    confidence: float
    hip_y: float
    shoulder_y: float
    hip_x: float
    timestamp: int


class PredictionBatch(BaseModel):
    predictions: list[Prediction]


class ScoreSubmission(BaseModel):
    score: int


@app.post("/api/predictions")
async def submit_predictions(batch: PredictionBatch):
    conn = sqlite3.connect(DB_PATH)
    for p in batch.predictions:
        conn.execute(
            "INSERT INTO predictions (action, confidence, hip_y, shoulder_y, hip_x, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
            (p.action, p.confidence, p.hip_y, p.shoulder_y, p.hip_x, p.timestamp),
        )
    conn.commit()
    conn.close()

    log_predictions(batch.predictions)

    return {"status": "ok", "count": len(batch.predictions)}


@app.post("/api/scores")
async def submit_score(submission: ScoreSubmission):
    conn = sqlite3.connect(DB_PATH)
    conn.execute("INSERT INTO scores (score) VALUES (?)", (submission.score,))
    conn.commit()
    conn.close()
    return {"status": "ok"}


@app.get("/api/scores/top")
async def get_top_scores():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.execute(
        "SELECT score, created_at FROM scores ORDER BY score DESC LIMIT 10"
    )
    scores = [{"score": row[0], "created_at": row[1]} for row in cursor.fetchall()]
    conn.close()
    return {"scores": scores}


@app.get("/api/health")
async def health():
    return {"status": "healthy"}
