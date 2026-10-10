import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {family, loadFonts, palette, Visual} from './tokens';

export type StampProps = {
  place?: string; time?: string; note?: string; position?: 'upper' | 'lower'; visual?: Visual;
};

// A documentary context stamp: place, date/time and an attribution note in mono, typed on with a thin rule.
export const Stamp: React.FC<StampProps> = ({place, time, note, position = 'upper', visual}) => {
  loadFonts();
  const frame = useCurrentFrame();
  const {width, height, durationInFrames} = useVideoConfig();
  const pal = palette(visual);
  const s = (30 * width) / 1080;
  const rule = interpolate(frame, [0, 14], [0, 1], {extrapolateRight: 'clamp'});
  const out = interpolate(frame, [durationInFrames - 8, durationInFrames - 1], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const chars = (t: string, start: number) => t.slice(0, Math.max(0, Math.floor((frame - start) * 1.6)));
  const top = position === 'upper' ? height * 0.14 : undefined;
  const bottom = position === 'lower' ? height * 0.21 : undefined;
  return (
    <AbsoluteFill style={{opacity: out}}>
      <div style={{position: 'absolute', left: width * 0.06, top, bottom, fontFamily: family('mono', visual), color: pal.paper, fontSize: s, letterSpacing: '0.08em', textTransform: 'uppercase', textShadow: '0 1px 12px rgba(0,0,0,0.5)'}}>
        <div style={{width: width * 0.09 * rule, height: Math.max(2, s * 0.09), backgroundColor: pal.accent, marginBottom: s * 0.6}} />
        {place && <div>{chars(place, 4)}</div>}
        {time && <div style={{color: pal.signal}}>{chars(time, 10)}</div>}
        {note && <div style={{marginTop: s * 0.5, fontSize: s * 0.78, color: pal.paper, opacity: 0.82, textTransform: 'none', letterSpacing: '0.02em'}}>{chars(note, 16)}</div>}
      </div>
    </AbsoluteFill>
  );
};
