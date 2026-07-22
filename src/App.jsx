import React, { useState } from 'react';
import GameArena from './features/TravessiaSegura/GameArena';
import './App.css';

export default function App() {
  const [gameStarted, setGameStarted] = useState(false);

  return (
    <div className="app-container">
      {!gameStarted ? (
        <div className="start-screen">
          <h1>🚦 Mini-Heróis do Trânsito</h1>
          <p>Missão Niterói: Travessia Segura na Praia de Icaraí!</p>
          <button onClick={() => setGameStarted(true)} className="start-btn">
            Começar a Jogar
          </button>
        </div>
      ) : (
        <GameArena />
      )}
    </div>
  );
}