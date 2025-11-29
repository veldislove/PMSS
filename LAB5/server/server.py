from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict
import pandas as pd
import joblib
import os
import uvicorn
from sklearn.ensemble import RandomForestClassifier

app = FastAPI()

DATASET_FILE = "dataset.csv"
MODEL_FILE = "model.joblib"

clf = None

def load_model():
    global clf
    if os.path.exists(MODEL_FILE):
        try:
            clf = joblib.load(MODEL_FILE)
            print("Model loaded successfully.")
        except Exception as e:
            print(f"Warning: Model file is corrupted. Starting fresh. Error: {e}")
            clf = None

load_model()

class SensorData(BaseModel):
    ax: float; ay: float; az: float
    gx: float; gy: float; gz: float
    label: str

@app.post("/collect")
async def collect_data(data: List[SensorData]):
    df = pd.DataFrame([d.dict() for d in data])
    header = not os.path.exists(DATASET_FILE)
    df.to_csv(DATASET_FILE, mode='a', header=header, index=False)
    return {"status": "saved", "count": len(df)}

@app.get("/stats")
async def get_dataset_stats():
    if not os.path.exists(DATASET_FILE):
        return {}
    df = pd.read_csv(DATASET_FILE)
    return df['label'].value_counts().to_dict()

@app.post("/train")
async def train_model():
    if not os.path.exists(DATASET_FILE):
        return {"status": "error", "message": "No data"}
    
    df = pd.read_csv(DATASET_FILE)
    if len(df) < 50:
        return {"status": "error", "message": "Need more data"}

    X = []
    y = []
    WINDOW_SIZE = 20

    for label in df['label'].unique():
        subset = df[df['label'] == label]
        for i in range(0, len(subset) - WINDOW_SIZE, WINDOW_SIZE):
            window = subset.iloc[i:i+WINDOW_SIZE]
            feats = []
            for axis in ['ax', 'ay', 'az', 'gx', 'gy', 'gz']:
                feats.append(window[axis].mean())
                feats.append(window[axis].std())
            X.append(feats)
            y.append(label)

    if not X: return {"status": "error", "message": "Windowing failed"}

    model = RandomForestClassifier(n_estimators=100)
    model.fit(X, y)
    joblib.dump(model, MODEL_FILE)
    
    global clf
    clf = model
    return {"status": "success", "accuracy": "Model Retrained"}

@app.post("/predict")
async def predict(data: List[float]):
    global clf
    if clf is None: load_model()
    if clf is None: return {"class": "Need Training"}
    try:
        return {"class": clf.predict([data])[0]}
    except:
        return {"class": "Error"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)