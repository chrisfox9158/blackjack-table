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

    updateBanners(data);
    updateBankroll(data);
    updateInsuranceOptions(data);
    updateBetOption(data);
    updateActionButtons(data);
    updatePlayAgain(data);
    renderHands(data);
    renderShoe();

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
        const svgNS = "http://www.w3.org/2000/svg";
        const cardSvg = document.createElementNS(svgNS, "svg");
        cardSvg.setAttribute("class", "card");
        cardSvg.setAttribute("viewBox", "0 0 169.075 244.640");
        cardSvg.setAttribute("width", "110");
        cardSvg.setAttribute("height", "154");

        const useEl = document.createElementNS(svgNS, "use");
        const fragmentId = card.fragmentId || getCardFragmentId(card);
        useEl.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "/static/svg-cards.svg#" + fragmentId);
        cardSvg.appendChild(useEl);

        containerElement.appendChild(cardSvg);
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
        const outcomeDiv = document.createElement("div");
        outcomeDiv.className = "outcome";
        const betDiv = document.createElement("div");
        betDiv.className = "bet";

        renderCards(hand.cards, cardsDiv);

        const outcomeText = getHandOutcomeStrings(hand.outcome);
        if (outcomeText) {
            outcomeDiv.textContent = outcomeText;
            outcomeDiv.hidden = false;
        } else {
            outcomeDiv.hidden = true;
        }

        betDiv.textContent = hand.bet;
        if (data.round_phase === "ROUND_OVER") {
            betDiv.hidden = true;
        }

        handGroupDiv.appendChild(cardsDiv);
        handGroupDiv.appendChild(outcomeDiv);
        handGroupDiv.appendChild(betDiv);

        handsContainer.appendChild(handGroupDiv);
    }
}

// Shoe rendering
function renderShoe() {
    const shoeContainer = document.getElementById("shoe");
    const shoeCards = Array(6).fill({ fragmentId: "back" });
    renderCards(shoeCards, shoeContainer);
}

// Card name translator for SVG assets
function getCardFragmentId(card) {
    const suitMap = {
        "Hearts": "heart",
        "Diamonds": "diamond",
        "Clubs": "club",
        "Spades": "spade"
    };
    const rankMap = {
        11: "jack",
        12: "queen",
        13: "king"
    };
    const suitName = suitMap[card.suit];
    const rankName = rankMap[card.rank] || card.rank;
    return suitName + "_" + rankName;
}

// Dealer hand translator (with placeholder hole-card)
function getDealerCardsArray(dealerState) {
    if (dealerState.showing_card === null) {
        return [];
    } else if (dealerState.cards === null) {
        return [dealerState.showing_card, { fragmentId: "back" }];
    } else {
        return dealerState.cards;
    }
}

// Hand outcome translator
function getHandOutcomeStrings(outcome) {
    const outcomeText = {
        "bust": "Bust",
        "player_blackjack_win": "Blackjack!",
        "player_win": "Win!",
        "blackjack_push": "Push",
        "push": "Push",
        "loss": "Loss"
    };
    return outcomeText[outcome];
}

// Banner updates
function updateBanners(data) {
    const container = document.getElementById("banner-container");
    const messageBanner = document.getElementById("message-banner");
    const insuranceBanner = document.getElementById("insurance-banner");
    const messageText = messageBanner.querySelector("span");
    const insuranceText = insuranceBanner.querySelector("span");

    const acceptedInsurance = data.seats[0].insurance_bet > 0;
    const insuranceLost = data.round_phase === "PLAYER_TURN" && acceptedInsurance;
    const insuranceWon = data.round_phase === "SETTLEMENT" && acceptedInsurance && data.dealer_state.is_blackjack;
    const showYourTurn = data.round_phase === "PLAYER_TURN" && !acceptedInsurance;

    if (insuranceLost || insuranceWon) {
        insuranceText.textContent = repeatForScroll(insuranceLost ? "Insurance lost!" : "Insurance won!");
        insuranceBanner.hidden = false;
        messageBanner.hidden = true;
        container.classList.add("active");
    } else if (showYourTurn) {
        messageText.textContent = repeatForScroll("Your turn");
        messageBanner.hidden = false;
        insuranceBanner.hidden = true;
        container.classList.add("active");
    } else {
        container.classList.remove("active");
    }
}

function repeatForScroll(text) {
    return (text + "          •          ").repeat(6);
}

// BETTING phase handlers
function updateBankroll(data) {
    const bankrollElement = document.getElementById("bankroll-chips");
    bankrollElement.textContent = data.seats[0].bankroll;
}

function updateBetOption(data) {
    const betFormDiv = document.getElementById("bet-form");
    if (data.round_phase === "BETTING") {
        betFormDiv.hidden = false;
    } else {
        betFormDiv.hidden = true;
    }
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

// Button wiring and additional listeners
document.getElementById("place-bet").addEventListener("click", submitBet);
document.getElementById("accept-button").addEventListener("click", acceptInsurance);
document.getElementById("decline-button").addEventListener("click", declineInsurance);
document.getElementById("hit-button").addEventListener("click", hitAction);
document.getElementById("stand-button").addEventListener("click", standAction);
document.getElementById("double-button").addEventListener("click", doubleAction);
document.getElementById("split-button").addEventListener("click", splitAction);
document.getElementById("play-again-button").addEventListener("click", playAgain);

const betInput = document.getElementById("bet-input");
betInput.addEventListener("focus", () => {
    betInput.dataset.placeholder = betInput.placeholder;
    betInput.placeholder = "";
});
betInput.addEventListener("blur", () => {
    if (betInput.dataset.placeholder) {
        betInput.placeholder = betInput.dataset.placeholder;
    }
});