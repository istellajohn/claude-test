import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {outQuint, inOutCubic} from './ease';
import {family, loadFonts, palette, Visual} from './tokens';

export type Line = {text: string; emph?: string[]; hit?: number};
export type TypeCardProps = {
  preset?: 'serif_statement' | 'grotesk_impact' | 'mono_stamp';
  lines: Line[];
  align?: 'left' | 'center';
  position?: 'lower' | 'middle' | 'upper';
  background?: 'none' | 'ink';       // 'ink' = full-frame title card
  size?: number;                      // px at 1080 wide
  holdOut?: number;                   // frames for exit
  stagger?: number;                   // frames between lines
  visual?: Visual;
};

// Lines rise out of a mask (overflow hidden) with a long out-quint ease; emphasised words are set in the
// italic cut. 'grotesk_impact' does not ease: each line hits on a given frame (sync it to a beat).
export const TypeCard: React.FC<TypeCardProps> = ({
  preset = 'serif_statement', lines, align = 'left', position = 'lower', background = 'none', size = 88,
  holdOut = 8, stagger = 6, visual,
}) => {
  loadFonts();
  const frame = useCurrentFrame();
  const {width, height, durationInFrames, fps} = useVideoConfig();
  const pal = palette(visual);
  const s = (size * width) / 1080;
  const fam = family(preset === 'serif_statement' ? 'display' : preset === 'mono_stamp' ? 'mono' : 'text', visual);
  const upper = preset === 'grotesk_impact';
  const padL = width * 0.06, padR = width * 0.12, padT = height * 0.13, padB = height * 0.2;
  const justify = position === 'upper' ? 'flex-start' : position === 'middle' ? 'center' : 'flex-end';
  const exit = interpolate(frame, [durationInFrames - holdOut, durationInFrames - 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const exitOpacity = 1 - inOutCubic(exit);
  return (
    <AbsoluteFill style={{backgroundColor: background === 'ink' ? pal.ink : 'transparent'}}>
      <AbsoluteFill style={{padding: `${padT}px ${padR}px ${padB}px ${padL}px`, justifyContent: justify, alignItems: align === 'center' ? 'center' : 'flex-start', opacity: exitOpacity}}>
        {lines.map((ln, i) => {
          const start = ln.hit ?? i * stagger;
          const local = frame - start;
          let y = 0, op = 1;
          if (preset === 'grotesk_impact') {
            op = local >= 0 ? 1 : 0;
          } else {
            const p = outQuint(Math.max(0, Math.min(1, local / (fps * 0.9))));
            y = (1 - p) * 110;
            op = local >= 0 ? 1 : 0;
          }
          const words = ln.text.split(' ');
          const emph = new Set((ln.emph ?? []).map((w) => w.toLowerCase().replace(/[.,!?;:]/g, '')));
          return (
            <div key={i} style={{overflow: 'hidden', paddingBottom: s * 0.14, marginBottom: s * 0.02}}>
              <div style={{
                transform: `translateY(${y}%)`, opacity: op, fontFamily: fam, fontSize: s, lineHeight: 1.02, color: pal.paper,
                textAlign: align, textTransform: upper ? 'uppercase' : 'none', fontWeight: upper ? 800 : 400, letterSpacing: upper ? '-0.01em' : preset === 'mono_stamp' ? '0.08em' : '-0.015em',
                textShadow: background === 'none' ? '0 2px 24px rgba(0,0,0,0.35)' : 'none',
              }}>
                {words.map((w, j) => {
                  const e = emph.has(w.toLowerCase().replace(/[.,!?;:]/g, ''));
                  return <span key={j} style={{fontStyle: e && preset === 'serif_statement' ? 'italic' : 'normal', color: e && preset !== 'serif_statement' ? pal.accent : pal.paper}}>{w}{j < words.length - 1 ? ' ' : ''}</span>;
                })}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
