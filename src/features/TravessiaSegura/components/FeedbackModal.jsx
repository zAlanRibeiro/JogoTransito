import React from 'react';

export default function FeedbackModal({ isOpen, type, title, message, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className={`modal-content ${type}`}>
        <h3>{type === 'success' ? '🎉 ' : '🛑 '}{title}</h3>
        <p>{message}</p>
        <button className="modal-btn" onClick={onClose}>
          Continuar
        </button>
      </div>
    </div>
  );
}