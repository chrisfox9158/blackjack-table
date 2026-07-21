// Primary state fetching
fetch("/state")
    .then(response => response.json())
    .then(data => {
        console.log(data);
        renderAll(data);
    });

// Render all 
function renderAll(data) {
    if (!data.seats[0]) {
        return;
    }

    updateBanner(data);
    updateBankroll(data);
    renderHands(data);

    // Render cards for state
    const dealerCards = getDealerCardsArray(data.dealer_state);
    renderCards(dealerCards, document.getElementById("dealer-cards"));
}

// Card and hands (bets + cards) render functions
function renderCards(cardsArray, containerElement) {
    containerElement.innerHTML = "";
    for (const card of cardsArray) {
        const cardElement = document.createElement("div");
        cardElement.textContent = card.rank_display + " of " + card.suit;
        containerElement.appendChild(cardElement);
    }
}

function renderHands(data) {
    const handsContainer = document.getElementById("hands-container");
    handsContainer.innerHTML = "";
    for (const hand of data.seats[0].hands) {
        const handGroupDiv = document.createElement("div");
        handGroupDiv.className = "hand-group";
        const cardsDiv = document.createElement("div");
        cardsDiv.className = "cards";
        const betDiv = document.createElement("div");
        betDiv.className = "bet";

        betDiv.textContent = hand.bet;
        renderCards(hand.cards, cardsDiv);
        handGroupDiv.appendChild(cardsDiv);
        handGroupDiv.appendChild(betDiv);

        handsContainer.appendChild(handGroupDiv);
    }
}

// Dealer hand translator (with placeholder hole-card)
function getDealerCardsArray(dealerState) {
    let cardsArray = [];
    if (dealerState.showing_card === null) {
        return cardsArray;
    } else if (dealerState.hole_card === null) {
        cardsArray.push(dealerState.showing_card);
        cardsArray.push({rank_display: "?", suit: "hidden_card"});
        return cardsArray;
    } else {
        cardsArray.push(dealerState.showing_card);
        cardsArray.push(dealerState.hole_card);
        return cardsArray;
    }
}

// Info banner update function
function updateBanner(data) {
    const banner = document.getElementById("message-banner");
    banner.hidden = false;
    if (data.round_phase === "BETTING") {
        banner.textContent = "Place your bet";
    } else if (data.round_phase === "PLAYER_TURN") {
        banner.textContent = "Your turn";
    } else {
        banner.hidden = true;
    }
}

// BETTING phase handlers
function updateBankroll(data) {
    const bankrollElement = document.getElementById("bankroll-chips");
    bankrollElement.textContent = data.seats[0].bankroll;
}

function submitBet() {
    const bet = Number(document.getElementById("bet-input").value);
    fetch("/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wager: bet })
    })
    .then(response => response.json())
    .then(data => {
        renderAll(data);
    })
}