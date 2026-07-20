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

@app.route("/deal", methods=["POST"])
def deal():
    game.deal_initial_cards()
    return jsonify(game.get_state_for_seat(0))

@app.route("/insurance", methods=["POST"])
def insurance():
    accepted = request.json["accepted"]
    game.insurance_bet(0, accepted)
    return jsonify(game.get_state_for_seat(0))

@app.route("/dealer-check", methods=["POST"])
def dealer_check():
    game.check_dealer_blackjack()
    return jsonify(game.get_state_for_seat(0))

@app.route("/action", methods=["POST"])
def action():
    action = request.json["action"]
    game.player_action(0, action)
    return jsonify(game.get_state_for_seat(0))

@app.route("/dealer-turn", methods=["POST"])
def dealer_turn():
    game.execute_dealer_turn_phase()
    return jsonify(game.get_state_for_seat(0))

@app.route("/settle", methods=["POST"])
def settle():
    game.evaluate_settlement()
    return jsonify(game.get_state_for_seat(0))