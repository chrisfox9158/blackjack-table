// Primary state fetching
fetch("/state")
    .then(response => response.json())
    .then(data => {
        console.log(data);
        updateBanner(data);
    
        // Render cards for state
        const dealerCards = getDealerCardsArray(data.dealer_state);
        renderCards(dealerCards, document.getElementById("dealer-cards"));
        renderCards(data.seats[0].hands[0].cards, document.getElementsByClassName("cards")[0])
    });

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

// Card render function
function renderCards(cardsArray, containerElement) {
    containerElement.innerHTML = "";
    for (const card of cardsArray) {
        const cardElement = document.createElement("div");
        cardElement.textContent = card.rank_display + " of " + card.suit;
        containerElement.appendChild(cardElement);
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