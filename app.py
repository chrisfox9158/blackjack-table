# Library imports
from flask import Flask, request, jsonify

# Local imports
from blackjack_engine import GameLoop

# App and Game object declarations
app = Flask(__name__)
game = GameLoop()

# Universal error handling
@app.errorhandler(ValueError)
def handle_value_error(error):
    return jsonify({"error": str(error)}), 400

