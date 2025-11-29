import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib

df = pd.read_csv("dataset.csv")

X = []
y = []

WINDOW_SIZE = 20

for label in df['label'].unique():
    subset = df[df['label'] == label]
    for i in range(0, len(subset) - WINDOW_SIZE, WINDOW_SIZE):
        window = subset.iloc[i:i+WINDOW_SIZE]
        
        features = []
        for axis in ['ax', 'ay', 'az', 'gx', 'gy', 'gz']:
            features.append(window[axis].mean())
            features.append(window[axis].std())
        
        X.append(features)
        y.append(label)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestClassifier(n_estimators=100)
model.fit(X_train, y_train)

preds = model.predict(X_test)
print(f"Accuracy: {accuracy_score(y_test, preds)}")

joblib.dump(model, "model.joblib")
print("Model saved to model.joblib")