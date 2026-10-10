import React from 'react';
import {Composition} from 'remotion';
import {TypeCard} from './TypeCard';
import {Stamp} from './Stamp';

// width/height/fps/duration are supplied at render time by render.mjs (the canvas follows the edit).
export const Root: React.FC = () => (
  <>
    <Composition id="TypeCard" component={TypeCard as React.FC<any>} width={1080} height={1920} fps={30} durationInFrames={90}
      defaultProps={{lines: [{text: 'Nine hours, standing', emph: ['standing']}], preset: 'serif_statement'}} />
    <Composition id="Stamp" component={Stamp as React.FC<any>} width={1080} height={1920} fps={30} durationInFrames={90}
      defaultProps={{place: 'Azad Maidan, Mumbai', time: '14:20', note: 'Filmed by the editor'}} />
  </>
);
