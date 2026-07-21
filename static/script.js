// Player /join seat addition and initial fetching (automatic)
fetch("/join", { method: "POST" })
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
    updateInsuranceOptions(data);
    updateActionButtons(data);
    updatePlayAgain(data);
    renderHands(data);

    const dealerCards = getDealerCardsArray(data.dealer_state);
    renderCards(dealerCards, document.getElementById("dealer-cards"));

    autoAdvance(data);
}

// Automatic phase advancement
function autoAdvance(data) {
    const phaseRoutes = {
        "DEALING": "/deal",
        "DEALER_BLACKJACK_CHECK": "/dealer-check",
        "DEALER_TURN": "/dealer-turn",
        "SETTLEMENT": "/settle"
    };

    const nextRoute = phaseRoutes[data.round_phase];
    if (nextRoute) {
        setTimeout(() => {
            fetch(nextRoute, { method: "POST" })
                .then(response => response.json())
                .then(newData => {
                    renderAll(newData);
                });
        }, 1500);
    }
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

// INSURANCE phase handlers
function updateInsuranceOptions(data) {
    const insuranceDiv = document.getElementById("insurance-options");
    if (data.round_phase === "INSURANCE") {
        insuranceDiv.hidden = false;
    } else {
        insuranceDiv.hidden = true;
    }
}

function acceptInsurance() {
    fetch("/insurance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: true })
    })
    .then(response => response.json())
    .then(data => {
        renderAll(data);
    })
}

function declineInsurance() {
    fetch("/insurance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: false })
    })
    .then(response => response.json())
    .then(data => {
        renderAll(data);
    })
}

// PLAYER_TURN phase handlers
function updateActionButtons(data) {
    const actionButtons = [
        { id: "hit-button", action: "hit" },
        { id: "stand-button", action: "stand" },
        { id: "double-button", action: "double"},
        { id: "split-button", action: "split"}
    ];

    for (const entry of actionButtons) {
        const button = document.getElementById(entry.id);
        button.disabled = !data.legal_actions.includes(entry.action);
    }
}

function hitAction() {
    fetch("/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "hit" })
    })
    .then(response => response.json())
    .then(data => {
        renderAll(data);
    });
}

function standAction() {
    fetch("/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stand" })
    })
    .then(response => response.json())
    .then(data => {
        renderAll(data);
    });
}

function doubleAction() {
    fetch("/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "double" })
    })
    .then(response => response.json())
    .then(data => {
        renderAll(data);
    });
}

function splitAction() {
    fetch("/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "split" })
    })
    .then(response => response.json())
    .then(data => {
        renderAll(data);
    });
}

// ROUND_OVER phase handlers
function playAgain() {
    fetch("/new-round", { method: "POST" })
        .then(response => response.json())
        .then(data => {
            renderAll(data);
        });
}

function updatePlayAgain(data) {
    const playAgainDiv = document.getElementById("play-again-option");
    if (data.round_phase === "ROUND_OVER") {
        playAgainDiv.hidden = false;
    } else {
        playAgainDiv.hidden = true;
    }
}

// Button wiring
document.getElementById("place-bet").addEventListener("click", submitBet);
document.getElementById("accept-button").addEventListener("click", acceptInsurance);
document.getElementById("decline-button").addEventListener("click", declineInsurance);
document.getElementById("hit-button").addEventListener("click", hitAction);
document.getElementById("stand-button").addEventListener("click", standAction);
document.getElementById("double-button").addEventListener("click", doubleAction);
document.getElementById("split-button").addEventListener("click", splitAction);
document.getElementById("play-again-button").addEventListener("click", playAgain);