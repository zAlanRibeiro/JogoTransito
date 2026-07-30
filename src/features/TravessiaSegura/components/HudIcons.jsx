import React from 'react';
import { Star, Heart, Hourglass, CheckCircle2, AlertTriangle, AlertOctagon, ShieldAlert, ChevronLeft, ChevronRight, Trophy, RotateCcw, Pause, Play, Gamepad2, Home, Smartphone } from 'lucide-react';

/* Ícones do HUD — usando lucide-react (npm install lucide-react) em vez de
   emoji ou bitmap pixel a pixel desenhado à mão. Mesma API de antes, então
   nada mais precisa mudar no GameArena.jsx. */

export function StarIcon({ size = 18, color = '#ff7b00', className, style }) {
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

// Aviso "grave" (custou vida) — ícone mais forte que o triângulo de aviso
// leve, pra diferenciar gravidade só pelo formato/peso do ícone.
export function GraveWarningIcon({ size = 22, color = '#ffffff', className, style }) {
  return <AlertOctagon size={size} color={color} strokeWidth={2.5} className={className} style={style} />;
}

export function InfractionIcon({ size = 16, color = '#8a6d00', className, style }) {
  return <ShieldAlert size={size} color={color} strokeWidth={2} className={className} style={style} />;
}

export function ArrowLeftIcon({ size = 26, color = '#ffffff', className, style }) {
  return <ChevronLeft size={size} color={color} strokeWidth={3} className={className} style={style} />;
}

export function ArrowRightIcon({ size = 26, color = '#ffffff', className, style }) {
  return <ChevronRight size={size} color={color} strokeWidth={3} className={className} style={style} />;
}

export function TrophyIcon({ size = 18, color = '#ff7b00', className, style }) {
  return <Trophy size={size} color={color} strokeWidth={2} className={className} style={style} />;
}

export function RestartIcon({ size = 16, color = '#ffffff', className, style }) {
  return <RotateCcw size={size} color={color} strokeWidth={2.5} className={className} style={style} />;
}

export function PauseIcon({ size = 28, color = '#ff7b00', className, style }) {
  return <Pause size={size} color={color} fill={color} strokeWidth={2} className={className} style={style} />;
}

export function PlayIcon({ size = 16, color = '#ffffff', className, style }) {
  return <Play size={size} color={color} fill={color} strokeWidth={2} className={className} style={style} />;
}

export function GamepadIcon({ size = 16, color = '#1e3c72', className, style }) {
  return <Gamepad2 size={size} color={color} strokeWidth={2.2} className={className} style={style} />;
}

export function HomeIcon({ size = 16, color = '#1e3c72', className, style }) {
  return <Home size={size} color={color} strokeWidth={2.2} className={className} style={style} />;
}

export function CelularIcon({ size = 48, color = '#ffffff', className, style }) {
  return <Smartphone size={size} color={color} strokeWidth={2} className={className} style={style} />;
}