import React from 'react';
import { Star, Heart, Hourglass, CheckCircle2, AlertTriangle } from 'lucide-react';

/* Ícones do HUD — usando lucide-react (npm install lucide-react) em vez de
   emoji ou bitmap pixel a pixel desenhado à mão. Mesma API de antes, então
   nada mais precisa mudar no GameArena.jsx. */

export function StarIcon({ size = 18, color = '#ffb100', className, style }) {
  return <Star size={size} color={color} fill={color} strokeWidth={1.5} className={className} style={style} />;
}

export function HeartIcon({ filled = true, size = 16, className, style }) {
  const color = filled ? '#e74c3c' : '#d8d2d2';
  return <Heart size={size} color={color} fill={color} strokeWidth={1.5} className={className} style={style} />;
}

export function HourglassIcon({ size = 18, color = '#ffffff', className, style }) {
  return <Hourglass size={size} color={color} strokeWidth={2.5} className={className} style={style} />;
}

export function CheckIcon({ size = 18, color = '#ffffff', className, style }) {
  return <CheckCircle2 size={size} color={color} strokeWidth={2.5} className={className} style={style} />;
}

export function WarningIcon({ size = 18, color = '#3a2a00', className, style }) {
  return <AlertTriangle size={size} color={color} strokeWidth={2.5} className={className} style={style} />;
}