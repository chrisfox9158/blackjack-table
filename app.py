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

# Routes
@app.route("/join", methods=["POST"])
def join():
    game.add_player_seat(0)
    return jsonify(game.get_state_for_seat(0))

@app.route("/bet", methods=["POST"])
def bet():
    wager = request.json["wager"]
    game.collect_initial_bets({0: wager})
    return jsonify(game.get_state_for_seat(0))