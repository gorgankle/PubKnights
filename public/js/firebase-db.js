// --- js/firebase-db.js ---
// Global Cloud Leaderboard System

const firebaseConfig = {
    apiKey: "AIzaSyDLXL1I0a_jmtDY61JEEL-VIrMlz6kSYeI",
    authDomain: "pub-knights---the-beta.firebaseapp.com",
    projectId: "pub-knights---the-beta",
    storageBucket: "pub-knights---the-beta.firebasestorage.app",
    messagingSenderId: "862685138219",
    appId: "1:862685138219:web:a9f63fbcbb09d98d4b496e"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 1. Upload Current Player Stats
window.syncHighscore = function() {
    // Prevent syncing if the player hasn't loaded in yet
    if (!player || player.level === undefined) return;
    
    // Grab the name from the input box, default to Unknown Knight
    const nameInput = document.getElementById("char-name-input");
    const playerName = (nameInput && nameInput.value.trim() !== "") ? nameInput.value.trim() : "Unknown Knight";

    // Set or Merge the document in the "highscores" collection using the player's name as the ID
    db.collection("highscores").doc(playerName).set({
        name: playerName,
        level: player.level,
        gold: player.gold,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true })
    .then(() => console.log("☁️ Data synced to Cloud Firestore."))
    .catch((error) => console.error("Error writing to cloud: ", error));
};

// 2. Fetch and Render the Leaderboard
window.fetchAndDisplayLeaderboard = function() {
    const listContainer = document.getElementById("leaderboard-list");
    if (!listContainer) return;
    
    listContainer.innerHTML = `<div style="text-align: center; color: #bbaaa0; font-size: 12px; margin-top: 20px;">Fetching from the cloud... 📡</div>`;

    // Fetch the top 10, sorting by Level first, then Gold!
    db.collection("highscores")
      .orderBy("level", "desc")
      .orderBy("gold", "desc")
      .limit(10)
      .get()
      .then((querySnapshot) => {
          listContainer.innerHTML = ""; // Clear loading text
          let rank = 1;
          
          if (querySnapshot.empty) {
              listContainer.innerHTML = `<div style="text-align: center; color: #776c62; font-size: 12px; margin-top: 20px;">The Hall of Legends is currently empty.</div>`;
              return;
          }

          querySnapshot.forEach((doc) => {
              let data = doc.data();
              let medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "🏅";
              let bg = rank === 1 ? "#2c241b" : "#1a1512";
              let border = rank === 1 ? "1px solid #f1c40f" : "1px solid #4a3b2c";
              
              listContainer.innerHTML += `
                  <div style="display: flex; justify-content: space-between; align-items: center; background: ${bg}; padding: 8px 12px; border-radius: 4px; border: ${border};">
                      <div style="font-size: 13px; font-weight: bold; color: #f4ebd9;">
                          <span style="width: 25px; display: inline-block;">${medal}</span> ${data.name}
                      </div>
                      <div style="text-align: right; font-size: 11px;">
                          <div style="color: #2ecc71; font-weight: bold;">Lvl ${data.level}</div>
                          <div style="color: #f1c40f;">${data.gold.toLocaleString()}g</div>
                      </div>
                  </div>
              `;
              rank++;
          });
      })
      .catch((error) => {
          console.log("Error getting highscores:", error);
          listContainer.innerHTML = `<div style="text-align: center; color: #c0392b; font-size: 12px; margin-top: 20px;">Failed to connect to the cloud.</div>`;
      });
};

// 3. Open Menu Wrapper
window.openLeaderboard = function() {
    setGameState('LEADERBOARD');
    fetchAndDisplayLeaderboard();
};