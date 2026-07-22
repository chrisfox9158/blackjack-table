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
    dealCardsSequentially(dealerCards, document.getElementById("dealer-cards"), "dealer");

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
    const phaseDelays = {
        "DEALING": 2500,
        "DEALER_BLACKJACK_CHECK": 3200,
        "DEALER_TURN": 1500,
        "SETTLEMENT": 1500
    };

    const nextRoute = phaseRoutes[data.round_phase];
    if (nextRoute) {
        setTimeout(() => {
            fetch(nextRoute, { method: "POST" })
                .then(response => response.json())
                .then(newData => {
                    renderAll(newData);
                });
        }, phaseDelays[data.round_phase]);
    }
}

// Hand, Card, and holders rendering
function renderHands(data) {
    const handsContainer = document.getElementById("hands-container");
    handsContainer.innerHTML = "";
    for (const [index, hand] of data.seats[0].hands.entries()) {
        const handGroupDiv = document.createElement("div");
        handGroupDiv.className = "hand-group";
        const cardsDiv = document.createElement("div");
        cardsDiv.className = "cards";

        const isActiveHand = data.round_phase === "PLAYER_TURN" && index === data.active_hand_idx;
        if (isActiveHand) {
            cardsDiv.classList.add("active");
        }

        const outcomeDiv = document.createElement("div");
        outcomeDiv.className = "outcome";
        const betDiv = document.createElement("div");
        betDiv.className = "bet";
        betDiv.textContent = hand.bet;
        if (data.round_phase === "ROUND_OVER") {
            betDiv.hidden = true;
        }

        handGroupDiv.appendChild(cardsDiv);
        handGroupDiv.appendChild(outcomeDiv);
        handGroupDiv.appendChild(betDiv);
        handsContainer.appendChild(handGroupDiv);

        dealCardsSequentially(hand.cards, cardsDiv, "seat0-hand" + index, () => {
            betDiv.classList.add("visible");
            if (isActiveHand) {
                setTimeout(() => {
                    cardsDiv.classList.add("active");
                }, 500);
            }
        });

        const outcomeText = getHandOutcomeStrings(hand.outcome);
        if (outcomeText) {
            outcomeDiv.textContent = outcomeText;
            outcomeDiv.hidden = false;
        } else {
            outcomeDiv.hidden = true;
        }
    }
}

function renderShoe() {
    const shoeContainer = document.getElementById("shoe");
    const shoeCards = Array(6).fill({ fragmentId: "back" });
    renderCardsInstant(shoeCards, shoeContainer);
}

function appendOneCard(card, containerElement) {
    const svgNS = "http://www.w3.org/2000/svg";
    const cardSvg = document.createElementNS(svgNS, "svg");
    cardSvg.setAttribute("class", "card deal-in");
    cardSvg.setAttribute("viewBox", "0 0 169.075 244.640");
    cardSvg.setAttribute("width", "110");
    cardSvg.setAttribute("height", "154");

    const useEl = document.createElementNS(svgNS, "use");
    const fragmentId = card.fragmentId || getCardFragmentId(card);
    useEl.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "/static/svg-cards.svg#" + fragmentId);
    cardSvg.appendChild(useEl);

    containerElement.appendChild(cardSvg);
}

function appendOneCardInstant(card, containerElement) {
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

function renderCardsInstant(cardsArray, containerElement) {
    containerElement.innerHTML = "";
    for (const card of cardsArray) {
        appendOneCardInstant(card, containerElement);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateHolderSize(n) {
    const overlapStep = 30;
    return {
        width: 110 + (n - 1) * overlapStep + 32,
        height: 154 + 32
    };
}

async function growHolderFor(containerElement, key, cardCount) {
    const size = calculateHolderSize(cardCount);

    if (!revealedHands.has(key)) {
        revealedHands.add(key);
        saveRevealedHands();
        containerElement.style.width = "110px";
        containerElement.style.height = "154px";
        containerElement.classList.add("revealed");
        await sleep(300);
        containerElement.classList.add("expanded");
        await sleep(50);
    }

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            containerElement.style.width = size.width + "px";
            containerElement.style.height = size.height + "px";
        });
    });
    await sleep(300);
}

const dealingInProgress = new Set();
async function dealCardsSequentially(cardsArray, containerElement, key, onExpanded) {
    while (dealingInProgress.has(key)) {
        await sleep(50);
    }
    dealingInProgress.add(key);

    try {
        containerElement.innerHTML = "";

        if (cardsArray.length === 0) {
            containerElement.classList.remove("revealed", "expanded", "active");
            containerElement.style.width = "";
            containerElement.style.height = "";
            if (onExpanded) onExpanded();
            return;
        }

        if (revealedHands.has(key)) {
            containerElement.classList.add("revealed", "expanded");
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const size = calculateHolderSize(cardsArray.length);
                    containerElement.style.width = size.width + "px";
                    containerElement.style.height = size.height + "px";
                });
            });
        }

        for (const [i, card] of cardsArray.entries()) {
            const cardKey = key + "-" + i + "-" + (card.fragmentId || getCardFragmentId(card));
            const alreadyDealt = key !== "shoe" && dealtCards.has(cardKey);

            if (alreadyDealt) {
                appendOneCardInstant(card, containerElement);
                continue;
            }

            await growHolderFor(containerElement, key, i + 1);
            await sleep(320);
            appendOneCard(card, containerElement);

            if (key !== "shoe") {
                dealtCards.add(cardKey);
                saveDealtCards();
            }

            await sleep(400);
        }

        if (onExpanded) onExpanded();
    } finally {
        dealingInProgress.delete(key);
    }
}

const revealedHands = loadRevealedHands();
function loadRevealedHands() {
    const saved = sessionStorage.getItem("revealedHands");
    return saved ? new Set(JSON.parse(saved)) : new Set();
}
function saveRevealedHands() {
    sessionStorage.setItem("revealedHands", JSON.stringify([...revealedHands]));
}

const dealtCards = loadDealtCards();
function loadDealtCards() {
    const saved = sessionStorage.getItem("dealtCards");
    return saved ? new Set(JSON.parse(saved)) : new Set();
}
function saveDealtCards() {
    sessionStorage.setItem("dealtCards", JSON.stringify([...dealtCards]));
}

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

function getDealerCardsArray(dealerState) {
    if (dealerState.showing_card === null) {
        return [];
    } else if (dealerState.cards === null) {
        return [dealerState.showing_card, { fragmentId: "back" }];
    } else {
        return dealerState.cards;
    }
}

// Hand outcome strings
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

// Banner systems
function repeatForScroll(text) {
    return (text + "               ").repeat(20);
}

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
        messageText.textContent = repeatForScroll("Your turn!");
        messageBanner.hidden = false;
        insuranceBanner.hidden = true;
        container.classList.add("active");
    } else {
        container.classList.remove("active");
    }
}

// Bankroll and betting updates
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

// Insurance systems
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

// Action button handlers
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
    const activeCards = document.querySelector(".cards.active");
    if (activeCards && activeCards.children[1]) {
        activeCards.children[1].classList.add("fade-out");
    }
    setTimeout(() => {
        fetch("/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "split" })
        })
        .then(response => response.json())
        .then(data => {
            renderAll(data);
        });
    }, 300);
}

// Play again request
function playAgain() {
    fetch("/new-round", { method: "POST" })
        .then(response => response.json())
        .then(data => {
            revealedHands.clear();
            saveRevealedHands();
            dealtCards.clear();
            saveDealtCards();
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

// Event listeners
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