import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {family, loadFonts, palette, Visual} from './tokens';

export type ThesisProps = {
  parts: {t: string; accent?: boolean}[];   // e.g. [{t:'women will not be '},{t:'silenced', accent:true}]
  position?: 'lower' | 'middle';
  size?: number;                              // px at 1080 on the short side
  fadeIn?: number;                            // frames
  fadeOut?: number;                           // frames
  visual?: Visual;
};

// One sentence, set quietly in the serif, lowercase, with a single red word. It swaps in place with no animation
// beyond a short fade, so the picture carries the movement and the sentence carries the voice.
export const Thesis: React.FC<ThesisProps> = ({parts, position = 'lower', size = 118, fadeIn = 8, fadeOut = 0, visual}) => {
  loadFonts();
  const frame = useCurrentFrame();
  const {width, height, durationInFrames} = useVideoConfig();
  const pal = palette(visual);
  const s = (size * Math.min(width, height)) / 1080;
  const op = Math.min(1, interpolate(frame, [0, Math.max(1, fadeIn)], [0, 1], {extrapolateRight: 'clamp'})) *
    (fadeOut ? interpolate(frame, [durationInFrames - fadeOut, durationInFrames - 1], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1);
  return (
    <AbsoluteFill style={{justifyContent: position === 'middle' ? 'center' : 'flex-end', alignItems: 'center', paddingBottom: position === 'middle' ? 0 : height * 0.12, opacity: op}}>
      <div style={{fontFamily: family('display', visual), fontSize: s, lineHeight: 1.04, letterSpacing: '-0.012em', color: pal.paper, textAlign: 'center', textShadow: '0 2px 22px rgba(0,0,0,0.6), 0 0 2px rgba(0,0,0,0.5)', padding: '0 5%'}}>
        {parts.map((p, i) => <span key={i} style={{color: p.accent ? '#E0141F' : pal.paper}}>{p.t}</span>)}
      </div>
    </AbsoluteFill>
  );
};
