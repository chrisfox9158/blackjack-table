# Library imports
import random
from enum import Enum, auto

# Local imports
from config import BLACKJACK_RULES
from config import BETTING

# Objects set-up
class RoundPhase(Enum):
    """Enum-inherited round phases set."""
    BETTING = auto()
    INSURANCE = auto()
    DEALER_BLACKJACK_CHECK = auto()
    PLAYER_TURN = auto()
    DEALER_TURN = auto()
    SETTLEMENT = auto()
    ROUND_OVER = auto()

class Card:
    """Representation of a playing card."""
    def __init__(self, rank, suit):
        self.rank = rank
        self.suit = suit
    
    @property
    def value(self):
        """Return the blackjack value of the card."""
        if self.rank == 1: # Ace
            return 11 # Ace defaults to 11.
        elif self.rank >= 10: # Face cards
            return 10
        else:
            return self.rank # Number cards
    
    def __str__(self):
        """Representation of the card, as a string""" # For developer use, unrelated to ML integration
        ranks = {1: 'Ace', 11: 'Jack', 12: 'Queen', 13: 'King'}
        rank_str = ranks.get(self.rank, str(self.rank))
        return f"{rank_str} of {self.suit}"
    
    def __repr__(self):
        """Configure shortened Card appearance when the list is called."""
        return self.__str__()
    
    def to_dict(self):
        ranks = {1: 'Ace', 11: 'Jack', 12: 'Queen', 13: 'King'}
        return {
            "rank": self.rank,
            "rank_display": ranks.get(self.rank, str(self.rank)),
            "suit": self.suit,
            "value": self.value
        }

class Hand:
    """Representation of a blackjack hand."""
    def __init__(self, cards=None):
        self.cards = cards or []
        self.bet = 0
        self.doubled = False
        self.split = False
        self.is_ace_split = False

    @property
    def values(self):
        """Return the possible values of the hand."""
        total = sum(card.value for card in self.cards)
        num_aces = sum(1 for card in self.cards if card.rank == 1)

        possible_values = [total]
        for _ in range(num_aces):
            if possible_values[0] > 21:
                possible_values[0] -= 10
        return possible_values
    
    @property
    def value(self):
        """Return the best possible hand value."""
        return min(self.values) # Returns minimum value, for later simplicity

    @property
    def is_blackjack(self):
        """Check if the hand is a blackjack."""
        return len(self.cards) == 2 and self.value == 21 and not self.split

    @property
    def is_bust(self):
        """Check if the hand is a bust."""
        return self.value > 21
    
    @property
    def is_soft(self):
        hard_total = sum(1 if card.rank == 1 else card.value for card in self.cards)
        has_ace = any(card.rank == 1 for card in self.cards)
        return has_ace and hard_total + 10 <= 21

    def add_card(self, card):
        """Add a new card to the hand."""
        self.cards.append(card)

    def can_split(self):
        """Check if the hand can be split (selfish check)""" # Additional checks, like maximum splits, will be added later
        if len(self.cards) != 2:
            return False
        return self.cards[0].rank == self.cards[1].rank
    
    def can_double(self):
        """Check if the hand can be doubled"""
        return len(self.cards) == 2 and not self.doubled

    def __str__(self):
        """Representation of the hand, as a string.""" # For developer use, unrelated to ML integration
        return f"Cards: {self.cards}, Value: {self.value}, {'Soft' if self.is_soft else 'Hard'}"
    
    def __repr__(self):
        """Configure shortened Hand appearance when the list is called.""" # Counters memory-location presentation of string representation
        return self.__str__()
    
    def to_dict(self):
        return {
            "cards": [card.to_dict() for card in self.cards],
            "value": self.value,
            "is_soft": self.is_soft,
            "is_bust": self.is_bust,
            "is_blackjack": self.is_blackjack,
            "bet": self.bet,
            "doubled": self.doubled,
            "split": self.split,
            "is_ace_split": self.is_ace_split
        }

class Shoe:
    """Representation of a shoe, or an active-use collection of decks of cards."""
    def __init__(self): # Defaults to 6 decks in the shoe.
        self.num_decks = BLACKJACK_RULES['num_decks']
        self.reshuffle_capacity = BLACKJACK_RULES['reshuffle_capacity']
        self.cards = []
        self.reset()
    
    def reset(self):
        """Reset and shuffle the shoe"""
        self.cards = []

        suits = ["Hearts", "Diamonds", "Clubs", "Spades"]
        ranks = list(range(1, 14))

        for _ in range(self.num_decks):
            for suit in suits:
                for rank in ranks:
                    self.cards.append(Card(rank, suit))
        
        self.shuffle() # Shuffle as part of all resets.

    def shuffle(self):
        """Shuffle the shoe."""
        self.needs_reshuffle = False
        random.shuffle(self.cards)
        self.cards.pop()

    def draw(self):
        """Draw a card from the shoe."""
        if not self.cards:
            raise ValueError("Cannot draw from an empty shoe.")

        if len(self.cards) <= ((self.num_decks * 52) * self.reshuffle_capacity): # automatic reset and shuffle at 25% cards left; waits until new round.
            self.needs_reshuffle = True

        return self.cards.pop()

    def __len__(self):
        """Show the amount of cards remaining in the shoe."""
        return len(self.cards)

class Dealer:
    def __init__(self, dealer_hand):
        self.dealer_hand = dealer_hand

    def reset(self):
        """Reset the dealer hand for a new deal."""
        self.dealer_hand = Hand()

    def showing_card(self):
        """Show the first card of the dealer's hand."""
        first_card = self.dealer_hand.cards[0]
        return first_card
    
    def play_turn(self, shoe):
        """Choose the dealer's action for a hand."""
        while (self.dealer_hand.value < 17) or (self.dealer_hand.value == 17 and self.dealer_hand.is_soft):
            card_drawn = shoe.draw() # Draws a new card.
            self.dealer_hand.add_card(card_drawn) # Adds the card to the dealer hand.

class GameLoop:
    """Connects classes into game-run engine."""
    def __init__(self):
        self.rules_config = BLACKJACK_RULES
        self.betting_config = BETTING

        self.shoe = Shoe()
        self.dealer = Dealer(dealer_hand=Hand())

        self.player_hands = {}
        self.player_bankrolls = {}

        self.insurance_bets = {}
        self.double_bets = {}

        self.round_phase = RoundPhase.BETTING
        self.active_seat_idx = None
        self.active_hand_idx = None
    
    def get_state_for_seat(self, seat_idx):
        """Retrieve full gamestate for a given player seat."""
        phase = self.round_phase.name
        dealer_state = {}
        
        # Dealer initial hand display logic
        if phase not in ["BETTING"]:
            showing_card = self.dealer.showing_card().to_dict()
        else:
            showing_card = None
        if phase in ["DEALER_TURN", "SETTLEMENT", "ROUND_OVER"]:
            hole_card = self.dealer.dealer_hand.cards[1].to_dict()
            dealer_value = self.dealer.dealer_hand.value
        else:
            hole_card = None
            dealer_value = None
        dealer_state["showing_card"] = showing_card
        dealer_state["hole_card"] = hole_card
        dealer_state["dealer_value"] = dealer_value

        # Seat-specific state dict
        player_state = {}
        for loop_seat_idx, hands in self.player_hands.items():
            player_state[loop_seat_idx] = {
                "hands": [hand.to_dict() for hand in hands],
                "bankroll": self.player_bankrolls[loop_seat_idx],
                "is_user": loop_seat_idx == seat_idx
                }
            
        # Option list builder
        if seat_idx == self.active_seat_idx and self.round_phase == RoundPhase.PLAYER_TURN:
            active_hand = self.player_hands[self.active_seat_idx][self.active_hand_idx]
            legal_actions = ["hit", "stand"]
            if active_hand.can_double() and self.player_bankrolls[seat_idx] >= active_hand.bet:
                legal_actions.append("double")
            if active_hand.can_split() and len(self.player_hands[seat_idx]) < self.rules_config['max_split_hands'] and self.player_bankrolls[seat_idx] >= active_hand.bet:
                legal_actions.append("split")
        else:
            legal_actions = []

        # Final outputting of seat-specific gamestate
        return {
            "round_phase": phase,
            "dealer_state": dealer_state, 
            "seats": player_state,
            "active_seat_idx": self.active_seat_idx,
            "active_hand_idx": self.active_hand_idx,
            "legal_actions": legal_actions
            }
    
    def add_player_seat(self, seat_idx):
        """Registers a seat index at the table layout."""
        self.player_hands[seat_idx] = []
        self.player_bankrolls[seat_idx] = self.betting_config['initial_bankroll']

    def reset_for_new_round(self):
        """Prepare for a new round."""

        self.insurance_bets = {}
        self.double_bets = {}
        self.active_seat_idx = 0
        self.active_hand_idx = 0
        self.dealer.reset()
        self.round_phase = RoundPhase.BETTING

    def collect_initial_bets(self, seat_wagers):
        """Collect initial player bets."""

        invalid_wagers = []

        # First pass: 
        for seat_idx, wager in seat_wagers.items():
            if wager < self.betting_config['min_bet'] or wager > self.betting_config['max_bet'] or wager > self.player_bankrolls[seat_idx]:
                invalid_wagers.append((seat_idx, wager))
        
        # Second pass: 
        if invalid_wagers:
            raise ValueError(f"Invalid wagers: {invalid_wagers}")
        for seat_idx, wager in seat_wagers.items():
                new_hand = Hand()
                new_hand.bet = wager
                self.player_hands[seat_idx] = [new_hand]
                self.player_bankrolls[seat_idx] -= wager

    def deal_initial_cards(self):
        """Deal initial cards to players."""

        # First round of cards (players, then dealer)
        for seat_idx in self.player_hands:
            active_hand = self.player_hands[seat_idx][0]
            drawn_card = self.shoe.draw()
            active_hand.add_card(drawn_card)
        self.dealer.dealer_hand.add_card(self.shoe.draw())

        # Second round of cards (players, then dealer)
        for seat_idx in self.player_hands:
            active_hand = self.player_hands[seat_idx][0]
            drawn_card = self.shoe.draw()
            active_hand.add_card(drawn_card)
        self.dealer.dealer_hand.add_card(self.shoe.draw())

    def insurance_bet(self, seat_idx, accepted):
        """Allows player insurance betting when possible."""
        if self.round_phase == RoundPhase.INSURANCE and self.dealer.showing_card().rank == 1:
            active_hand = self.player_hands[seat_idx][0]
            offered_insurance = active_hand.bet * 0.5
            if self.player_bankrolls[seat_idx] >= offered_insurance:
                if accepted:
                    self.insurance_bets[seat_idx] = offered_insurance
                    self.player_bankrolls[seat_idx] -= offered_insurance
                else:
                    self.insurance_bets[seat_idx] = 0
            else:
                raise ValueError("Insufficient bankroll for insurance.") # Frontend UX should hide accept option
        else:
            raise ValueError("Insurance is not currently available.") # Frontend UX should skip insurance

    def check_dealer_blackjack(self):
        """Checks for dealer blackjack if showing 10-value or Ace."""
        if self.dealer.showing_card().value in [10, 11] and self.dealer.dealer_hand.is_blackjack:
            self.round_phase = RoundPhase.SETTLEMENT
        else:
            self.round_phase = RoundPhase.PLAYER_TURN
            self.active_seat_idx = 0
            self.active_hand_idx = 0

    def player_action(self, seat_idx, action):
        if self.round_phase == RoundPhase.PLAYER_TURN and seat_idx == self.active_seat_idx:
            active_hand = self.player_hands[self.active_seat_idx][self.active_hand_idx]
            is_das_legal = (not active_hand.split) or self.rules_config['double_after_split']

            # Split handling
            if action == "split":
                if active_hand.can_split() and len(self.player_hands[seat_idx]) < self.rules_config['max_split_hands']:
                    if self.player_bankrolls[seat_idx] >= active_hand.bet:
                        self.player_bankrolls[seat_idx] -= active_hand.bet

                        # Create new hand, update old hand with new card (second card for new hand comes later)
                        new_hand = Hand()
                        new_hand.bet = active_hand.bet
                        new_hand.split = True
                        active_hand.split = True
                        new_hand.add_card(active_hand.cards.pop(1))

                        if active_hand.cards[0].rank == 1: # Ace split markers
                            active_hand.is_ace_split = True
                            new_hand.is_ace_split = True

                        self.player_hands[seat_idx].insert(self.active_hand_idx + 1, new_hand)
                        active_hand.add_card(self.shoe.draw())

                        if self.is_hand_resolved(active_hand):
                            self.advance_active_hand()
                    else:
                        raise ValueError("Seat lacks bankroll for split.")
                else:
                    raise ValueError("Seat unable to split active hand.")
            
            # Double handling
            elif action == "double":
                if active_hand.can_double() and is_das_legal:
                    if self.player_bankrolls[seat_idx] >= active_hand.bet:
                        self.player_bankrolls[seat_idx] -= active_hand.bet
                        active_hand.bet *= 2
                        active_hand.doubled = True
                        active_hand.add_card(self.shoe.draw())

                        self.advance_active_hand()
                    else:
                        raise ValueError("Seat lacks bankroll for double.")
                else:
                    raise ValueError("Seat unable to double active hand.")
            
            # Hit handling
            elif action == "hit":
                drawn_card = self.shoe.draw()
                active_hand.add_card(drawn_card)

                if self.is_hand_resolved(active_hand):
                    self.advance_active_hand()

            # Stand handling
            elif action == "stand":
                self.advance_active_hand()
            else:
                raise ValueError("Invalid action.")
        else:
            raise ValueError("Unexpected phase or seat.")
        
    def is_hand_resolved(self, hand):
        return hand.is_blackjack or hand.value >= 21 or hand.is_ace_split
    
    def advance_active_hand(self):
        """Advance to next active hand."""
        while True:
            if self.active_hand_idx + 1 < len(self.player_hands[self.active_seat_idx]):
                self.active_hand_idx += 1
            elif self.active_seat_idx + 1 < len(self.player_hands):
                self.active_seat_idx += 1
                self.active_hand_idx = 0
            else:
                self.round_phase = RoundPhase.DEALER_TURN
                self.active_seat_idx = None
                self.active_hand_idx = None
                break
            
            active_hand = self.player_hands[self.active_seat_idx][self.active_hand_idx]
            if self.is_hand_resolved(active_hand): continue
            else: break

    def execute_dealer_turn_phase(self):
        """Execute dealer phase, based on ruleset."""

        # Active hands tracker
        any_hands_active = False
        for seat_idx in self.player_hands:
            for hand in self.player_hands[seat_idx]:
                if not hand.is_bust:
                    any_hands_active = True
        
        if any_hands_active == False:
            pass
        else:
            self.dealer.play_turn(self.shoe)
        
        self.round_phase = RoundPhase.SETTLEMENT
    
    def evaluate_settlement(self):
        """Run payout after a round."""

        # Payouts (escrow system; returns investment + winnings)
        for seat_idx in self.player_hands:
            for hand in self.player_hands[seat_idx]:
                if hand.is_bust:
                    print(f"Player {seat_idx} hand busted.")
                elif self.dealer.dealer_hand.is_bust or hand.value > self.dealer.dealer_hand.value:
                    if hand.is_blackjack:
                        self.player_bankrolls[seat_idx] += hand.bet * (1 + self.rules_config['blackjack_payout'])
                        print(f"Player {seat_idx} won with a Blackjack, winning {hand.bet * self.rules_config['blackjack_payout']} units!")
                    else:
                        self.player_bankrolls[seat_idx] += hand.bet * 2
                        print(f"Player {seat_idx} won with {hand}, winning {hand.bet} units!")
                elif hand.value == self.dealer.dealer_hand.value:
                    if hand.is_blackjack: # Dealer is never Blackjack here; this ensures payouts work on a "push" Blackjack.
                        self.player_bankrolls[seat_idx] += hand.bet * (1 + self.rules_config['blackjack_payout'])
                        print(f"Player {seat_idx} won with a Blackjack, winning {hand.bet * self.rules_config['blackjack_payout']} units!")
                    else:
                        self.player_bankrolls[seat_idx] += hand.bet
                        print(f"Player {seat_idx} pushed!")
                else:
                    print(f"Dealer wins against Player {seat_idx} for this hand.")
    
    def round_cleanup(self):
        """Run cleanup after a round."""

        # Cleanup (wipe layout, reshuffle if necessary)
        self.remove_broke_seats()
        self.player_hands = {}
        if self.shoe.needs_reshuffle == True:
            self.shoe.reset()

    def remove_broke_seats(self):
        """Remove seats who cannot afford another round."""

        survivor_seats = []
        for seat_idx, bankroll in self.player_bankrolls.items():
            if bankroll >= self.betting_config['min_bet']:
                survivor_seats.append(seat_idx)

        new_bankrolls = {}
        new_hand_seats = {}
        for new_idx, old_idx in enumerate(survivor_seats):
            new_bankrolls[new_idx] = self.player_bankrolls[old_idx]
            new_hand_seats[new_idx] = self.player_hands[old_idx]
        self.player_bankrolls = new_bankrolls
        self.player_hands = new_hand_seats

    def play_game(self):
        """Drive the terminal blackjack game, round by round."""

        self.add_player_seat(0)

        while len(self.player_bankrolls) > 0 and self.keep_playing:
            self.reset_for_new_round()
            print(" ")
            print("-" * 10, " New Round! ", "-" * 10)

            print(" ")
            print(f"Current bankroll balance: {self.player_bankrolls.get(0)}")

            # Betting handling
            bet_placed = False
            while not bet_placed:
                try:
                    wager = int(input("Place your bet: "))
                    self.collect_initial_bets({0: wager})
                    bet_placed = True
                except ValueError:
                    print("Input not supported. Try again.")
            
            # Initial setups for the round
            self.deal_initial_cards()
            print(" ")
            for seat_idx, hands in self.player_hands.items():
                print(f"Player {seat_idx}: {hands[0]}")

            print(" ")
            print(f"Dealer showing: {self.dealer.showing_card()}")
            self.evaluate_initial_deal()

            # Player, dealer, payout turns for the round
            if not self.round_ended:
                self.execute_player_turns_phase()
                self.execute_dealer_turn_phase()
                self.evaluate_settlement()
            
            # Round cleanup
            self.round_cleanup()

            # Request to keep playing
            if self.player_bankrolls.get(0) is not None:
                print(" ")
                print(f"Current bankroll balance: {self.player_bankrolls.get(0)}")
                request_keep_playing = input("Keep playing? (y/n): ")
                if request_keep_playing.lower().strip() in ["n", "no"]:
                    self.keep_playing = False
                else:
                    self.keep_playing = True
            else:
                print("You're out of chips. Game over.")
                self.keep_playing = False

# Run the game
if __name__ == "__main__":
    game = GameLoop()
    game.play_game()