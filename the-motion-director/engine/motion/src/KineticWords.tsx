import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {family, loadFonts, palette, Visual} from './tokens';

export type KWord = {text: string; start: number; end: number; red?: boolean};  // frames
export type KineticProps = {words: KWord[]; visual?: Visual; hold?: number};

// Voice-driven type: ONE word at a time, on the frame it is spoken. Content words are set big in Anton capitals;
// small function words drop to the lowercase serif at a smaller size, as in the reference cuts. Words flagged red are the
// ones the voice leans on. Nothing animates except a three-frame hit, so the picture and the voice carry the movement.
const SMALL = new Set(['you', 'can', 'us', 'in', 'the', 'a', 'off', 'are']);

export const KineticWords: React.FC<KineticProps> = ({words, visual, hold = 5}) => {
  loadFonts();
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const pal = palette(visual);
  const idx = words.findIndex((w, i) => frame >= w.start && frame < Math.max(w.end, (words[i + 1]?.start ?? w.end + 999)));
  const w = idx >= 0 ? words[idx] : undefined;
  if (!w) return null;
  const nextStart = words[idx + 1]?.start ?? 1e9;
  if (frame > w.end + hold && nextStart > w.end + hold) return null;   // a pause: let the picture breathe
  const clean = w.text.replace(/[.,!?;:]/g, '');
  const small = SMALL.has(clean.toLowerCase()) && !w.red;
  const local = frame - w.start;
  const pop = 1 + Math.max(0, 1 - local / 3) * 0.12;
  const base = Math.min(width, height);
  const chars = Math.max(2, clean.length);
  const size = small ? base * 0.12 : Math.min(base * 0.34, (width * 0.78) / (chars * 0.5));
  const col = w.red ? '#E0141F' : pal.paper;
  const style: React.CSSProperties = small
    ? {fontFamily: family('display', visual), fontSize: size, textTransform: 'lowercase', letterSpacing: '-0.01em'}
    : {fontFamily: "'Anton', 'Hanken Grotesk', sans-serif", fontSize: size, textTransform: 'uppercase', letterSpacing: '0.01em', lineHeight: 1};
  return (
    <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
      <div style={{...style, color: col, transform: `scale(${pop})`, textShadow: '0 3px 26px rgba(0,0,0,0.7), 0 0 3px rgba(0,0,0,0.6)', whiteSpace: 'nowrap'}}>{w.text.replace(/[.,!?;:]$/, '')}</div>
    </AbsoluteFill>
  );
};
