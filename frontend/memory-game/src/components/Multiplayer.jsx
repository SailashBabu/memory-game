
import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import "../styles/Multiplayer.css";
import MultiplayerCard from "./MultiplayerCard";// Import Card component
import MultiplayerPopup from "./MultiplayerPopup";
// import Card from "./Card";
const socket = io("http://127.0.0.1:5000"); // Connect to the backend server

const themes = {
  nature: "Nature 🌳",
  space: "Space 🚀",
  architecture: "Architecture 🏛",
};

const levels = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};


const Multiplayer = () => {
  const [step, setStep] = useState(1);
  const [theme, setTheme] = useState(null);
  const [level, setLevel] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [searching, setSearching] = useState(false);
  const [opponent, setOpponent] = useState(null);
  const [waitingMessage, setWaitingMessage] = useState("");
  const [gameId, setGameId] = useState(null);
  const [cards, setCards] = useState([]); // Track card data
  const [flippedCards, setFlippedCards] = useState([]); // Track flipped card indices
  const [isYourTurn, setIsYourTurn] = useState(false);
  const [turnMessage, setTurnMessage] = useState("");
  const [showPopup, setShowPopup] = useState(false);
 // var winnerName;
  const [winnerName, setWinnerName] = useState("");
  //const [isGameOver, setIsGameOver] = useState(false);

  const nextStep = () => setStep((prev) => prev + 1);
  
  const searchForPlayer = () => {
    setSearching(true);
    socket.emit("joinGame", { name: playerName, theme, level });

    socket.on("waiting", (data) => {
      setWaitingMessage(data.message);
    });

    socket.on("matched", (data) => {
      setSearching(false);
      setOpponent(data.opponent);
      setGameId(data.gameId);
      setCards(data.cards.map((card) => ({ content: card, isFlipped: false }))); // Initialize cards
      setIsYourTurn(data.isTurn);
      setTurnMessage(data.isTurn ? "Your turn!" : `${data.opponent}'s turn!`);
      nextStep();
    });
  };

  const handleCardClick = (index) => {
    if (!isYourTurn) {
      alert("It's not your turn!");
      return;
    }
    if (cards[index].isFlipped) {
      return; // Ignore already flipped cards
    }

    // Flip the card locally
    const updatedCards = [...cards];
    updatedCards[index].isFlipped = true;
    setCards(updatedCards);

    // Add the card index to flippedCards array
    const updatedFlippedCards = [...flippedCards, index];
    setFlippedCards(updatedFlippedCards);

    // Emit card flip to server
    socket.emit("cardFlipped", { gameId, cardId: index });

    // If 2 cards are flipped
    if (updatedFlippedCards.length === 2) {
      const [first, second] = updatedFlippedCards;
      if (cards[first].content === cards[second].content) {
        // Cards match, keep them flipped
        setFlippedCards([]);
      } else {
        // Cards don't match, flip them back after a delay and switch turns
        setTimeout(() => {
          const resetCards = [...updatedCards];
          resetCards[first].isFlipped = false;
          resetCards[second].isFlipped = false;
          setCards(resetCards);
          setFlippedCards([]);
          socket.emit("turnSwitch", { gameId }); // Switch turns after mismatch
        }, 1000);
      }
    }
  };

  const reset = () => {
    setStep(1);
    setTheme(null);
    setLevel(null);
    setPlayerName("");
    setOpponent(null);
    setSearching(false);
    setWaitingMessage("");
    setGameId(null);
    setCards([]);
    setFlippedCards([]);
    setIsYourTurn(false);
    setTurnMessage("");
    setShowPopup(false);
  };

  useEffect(() => {
    socket.on("cardFlipped", ({ cardId }) => {
      const updatedCards = [...cards];
      updatedCards[cardId].isFlipped = true;
      setCards(updatedCards);
    });

    socket.on("turnSwitch", ({ currentPlayer, isYourTurn }) => {
      setIsYourTurn(isYourTurn);
      setTurnMessage(isYourTurn ? "Your turn!" : `${currentPlayer}'s turn!`);
    });

    socket.on("opponentLeft", (data) => {
      alert(data.message);
      reset();
    });
    
    socket.on("gameSummary",(data)=>{
        setStep(5);
        setWinnerName(data.winner);
        //console.log(winner);
        setShowPopup(true);
    });
  }, [cards,showPopup]);
  const themeBackgrounds ={
    nature : "linear-gradient(rgba(128, 128, 128, 0.4), rgba(169, 169, 169, 0.4)),url('/images/nature2.jpg')",
    space : "linear-gradient(rgba(25, 25, 112, 0.5), rgba(0, 0, 139, 0.5)),url('/images/space.jpg')",
    architecture : "linear-gradient(rgba(128, 128, 128, 0.4), rgba(169, 169, 169, 0.4)),url('/images/Architecture.jpg')",
    
};
  useEffect(() => {
      if (theme) {
        document.body.style.background = themeBackgrounds[theme];
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.height = "100vh";
        document.body.style.margin = "0"; 
        document.body.style.padding = "0";
      } else {
        document.body.style.background = "linear-gradient(rgba(30, 60, 114, 0.6), rgba(42, 82, 152, 0.6)),url('/images/home.avif')";
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.height = "100vh";
        document.body.style.margin = "0"; // Reset margins for full body coverage
        document.body.style.padding = "0"; // Reset padding
        
      }
    }, [theme]);
    
  return (
    <div className="multiplayer">
      <h1>Multiplayer Mode</h1>

      {step === 1 && (
        <div className="theme-selector">
          <h2>Select Theme:</h2>
          {Object.entries(themes).map(([key, label]) => (
            <button key={key} onClick={() => setTheme(key)}>
              {label}
            </button>
          ))}
          {theme && <button onClick={nextStep}>Next</button>}
        </div>
      )}

      {step === 2 && (
        <div className="level-selector">
          <h2>Select Difficulty:</h2>
          {Object.entries(levels).map(([key, label]) => (
            <button key={key} onClick={() => setLevel(key)}>
              {label}
            </button>
          ))}
          {level && <button onClick={nextStep}>Next</button>}
        </div>
      )}

      {step === 3 && (
        <div className="online-play">
          <h2>Enter Your Name:</h2>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Your name"
          />
          <button onClick={searchForPlayer} disabled={!playerName || searching}>
            {searching ? "Searching..." : "Search for Player"}
          </button>
          {waitingMessage && <p>{waitingMessage}</p>}
        </div>
      )}

      {step === 4 && (
        <div className="game-start">
          <h2>Game Ready!</h2>
          <p>
            Theme: {themes[theme]} | Difficulty: {levels[level]}
          </p>
          <p>
            Player 1: {playerName} | Player 2: {opponent}
          </p>
          <p>{turnMessage}</p>
          <div className="game-board">
            {cards.map((card, index) => (
              <MultiplayerCard
                key={index}
                card={card.content}
                index={index}
                isFlipped={card.isFlipped}
                onClick={handleCardClick}
              />
            ))}
          </div>
        </div>
      )}


      {step === 5 && showPopup && winnerName && (
        <div className="game-start">
          <MultiplayerPopup
              winnerName = {winnerName}
              close ={()=>{
                  reset();
                  setShowPopup(false);
              }}
          />
          </div>
        )}

      <button className="reset-btn" onClick={reset}>
        Reset
      </button>
    </div>
  );
};

export default Multiplayer;
