// Primary state fetching
fetch("/state")
    .then(response => response.json())
    .then(data => {
        console.log(data);
        updateBanner(data);
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