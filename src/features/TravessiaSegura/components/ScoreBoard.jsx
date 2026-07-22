import React from 'react';

export default function ScoreBoard({ score }) {
  return (
    <div className="scoreboard">
      <span>⭐ Pontos: {score}</span>
    </div>
  );
}