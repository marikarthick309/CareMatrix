"""
CareMatrix — Local Python Server & Static File Host
Run locally with: python app.py
Serves the unified flat architecture at http://127.0.0.1:5000
"""

from flask import Flask, send_from_directory
import os

app = Flask(__name__, static_folder=".")

@app.route("/")
def index():
    return send_from_directory(".", "index.html")

@app.route("/<path:path>")
def serve_file(path):
    return send_from_directory(".", path)

if __name__ == "__main__":
    port = 5000
    print(f"\n CareMatrix Hospital System running locally at: http://127.0.0.1:{port}\n")
    app.run(host="0.0.0.0", port=port, debug=True)
