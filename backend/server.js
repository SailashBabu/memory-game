const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes");
const http = require("http");
const { Server } = require("socket.io");

dotenv.config();

const app = express();
const PORT = 5000;
const server = http.createServer(app);

app.use(cors());
app.use(bodyParser.json());

mongoose
  .connect("mongodb://127.0.0.1:27017/memory-game")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Error connecting to MongoDB", err.message));

app.use("/api/games", userRoutes);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

const waitingPlayers = {};
const gameInstances = {};

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
  
    // Handle player joining a game
    socket.on("joinGame", ({ name, theme, level }) => {
      console.log(`${name} is looking for a game with theme: ${theme}, level: ${level}`);
  
      const key = `${theme}-${level}`;
      if (waitingPlayers[key]) {
        const opponentSocket = waitingPlayers[key];
        delete waitingPlayers[key];
  
        const gameId = `${socket.id}-${opponentSocket.socket.id}`;
        gameInstances[gameId] = {
          players: [
            { socket, name, matchedCount:0 ,id: socket.id, turn: true }, // First player starts
            { socket: opponentSocket.socket, name: opponentSocket.name,matchedCount:0, id: opponentSocket.socket.id, turn: false },
          ],
          theme,
          level,
          cards: shuffleCards(theme, level),
          flippedCards: [],
          matchedPairs: 0, // Track matched pairs
        };
  
        const game = gameInstances[gameId];
  
        // Notify both players they are matched and send initial game state
        game.players.forEach((player, index) => {
          player.socket.emit("matched", {
            opponent: game.players[1 - index].name,
            gameId,
            cards: game.cards,
            playerName: player.name,
            
            isTurn: player.turn, // Indicate whose turn it is initially
          });
        });
  
        console.log(`Match created: ${game.players[0].name} vs ${game.players[1].name}`);
      } else {
        waitingPlayers[key] = { socket, name };
        socket.emit("waiting", { message: "Waiting for an opponent..." });
      }
    });
  
    // Handle card flips (broadcast to both players)
    socket.on("cardFlipped", ({ gameId, cardId }) => {
      const game = gameInstances[gameId];
      if (game) {
        const currentPlayerIndex = game.players.findIndex((p) => p.socket.id === socket.id);
        const nextPlayerIndex = 1 - currentPlayerIndex;
  
        // Check if it's the current player's turn
        if (!game.players[currentPlayerIndex].turn) {
          return; // Ignore flips from the player if it's not their turn
        }
  
        // Update flipped cards in the game instance
        game.flippedCards.push({ cardId, player: game.players[currentPlayerIndex].name });
  
        // Broadcast card flip to both players
        game.players.forEach((player) => {
          player.socket.emit("cardFlipped", { cardId, flippedBy: game.players[currentPlayerIndex].name });
        });
  
        // Check for match logic
        if (game.flippedCards.length === 2) {
          const [first, second] = game.flippedCards;
          if (game.cards[first.cardId] === game.cards[second.cardId]) {
            console.log(`${game.players[currentPlayerIndex].name} found a match!`);
            
            game.players[currentPlayerIndex].matchedCount++;
            // Notify both players of the match
            game.players.forEach((player) => {
              player.socket.emit("matchFound", {
                matchedBy: game.players[currentPlayerIndex].name,
                cardIds: [first.cardId, second.cardId],
              });
            });
  
            // Increment matched pairs count
            game.matchedPairs++;
            game.flippedCards = []; // Clear flipped cards
  
            // Check if all pairs are matched
            if (game.players[currentPlayerIndex].matchedCount === game.cards.length / 2) {
              console.log(`Game over! Winner: ${game.players[currentPlayerIndex].name}`);
  
              // Notify both players of the game summary
              game.players.forEach((player) => {
                player.socket.emit("gameSummary", {
                  winner: game.players[currentPlayerIndex].name,
                  message: "Game over! All cards matched!",
                });
              });
  
              // Remove game instance
              delete gameInstances[gameId];
            }
          } else {
            console.log(`${game.players[currentPlayerIndex].name} did not match. Passing turn.`);
  
            // Notify players of no match
            game.players.forEach((player) => {
              player.socket.emit("noMatch", {
                cardIds: [first.cardId, second.cardId],
              });
            });
  
            // Flip back the unmatched cards after a delay and switch turns
            setTimeout(() => {
              game.players[currentPlayerIndex].turn = false;
              game.players[nextPlayerIndex].turn = true;
              game.flippedCards = []; // Reset flipped cards
              game.players.forEach((player) => {
                player.socket.emit("turnSwitch", {
                  currentPlayer: game.players[nextPlayerIndex].name,
                  isYourTurn: player.id === game.players[nextPlayerIndex].id,
                });
              });
            }, 1000);
          }
        }
      }
    });
  
    // Handle player disconnection
    socket.on("disconnect", () => {
      console.log("A user disconnected:", socket.id);
  
      // Remove from waiting list
      Object.keys(waitingPlayers).forEach((key) => {
        if (waitingPlayers[key]?.socket.id === socket.id) {
          delete waitingPlayers[key];
        }
      });
  
      // Handle disconnection during a game
      Object.keys(gameInstances).forEach((gameId) => {
        const game = gameInstances[gameId];
        if (game.players.some((player) => player.socket.id === socket.id)) {
          game.players.forEach((player) => {
            if (player.socket.id !== socket.id) {
              player.socket.emit("opponentLeft", { message: "Your opponent left the game." });
            }
          });
          delete gameInstances[gameId];
        }
      });
    });
  });
  

// Shuffle cards based on theme and level
const shuffleCards = (theme, level) => {
  const themes = {
    nature: ['🌲', '🌸', '🌻', '🍁', '🍄', '🌴', '🌼', '🌿', '🍃', '🌾', '🍂', '🌷', '🐚', '💐', '🥀', '🪵', '☘️', '🪸'],
    architecture: ['🏛️', '🏠', '🏢', '🏰', '🏙️', '🏚️', '🛖', '🏩', '⛩️', '🕍', '🏤', '🏥', '🏗️', '🕋', '🏭', '🛤️', '🏕️', '🛣️'],
    space: ['🌌', '⭐', '🌠', '🪐', '🚀', '🌑', '🌕', '🛸', '☄️', '🌙', '🛰️', '🌟', '💫', '⚡', '💥', '✨', '☀️', '⛅']
  };

  const cardSet = themes[theme];
  const levelMap = { easy: 3, medium: 6, hard: 9 };
  const totalCards = levelMap[level];
  const selectedIcons = cardSet.slice(0, totalCards);
  return [...selectedIcons, ...selectedIcons].sort(() => Math.random() - 0.5);
};

server.listen(5000, "0.0.0.0", () => {
  console.log("server is running on port 5000");
});
