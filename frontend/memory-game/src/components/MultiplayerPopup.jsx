import React from "react";
import "../styles/MultiplayerPopup.css";

export default function MultiplayerPopup({ winnerName, close }) {

//   const badgeIcons = {
//     gold: "🥇",
//     silver : "🥈",
//     bronze : "🥉",
//   };
  return (
    <div className="popup">
      <div className="popup-content">
        <h2>🎉 Game Completed! 🎉</h2>

        <p> The winner is {winnerName} !</p>
        <button onClick={close}>Close</button>
      </div>
    </div>
  );
}