import React from "react";

// Master level for every sound effect; lowered when a voice-over is present
// so the effects only sit underneath the speaker.
export const SfxGain = React.createContext(1);
export const useSfxGain = () => React.useContext(SfxGain);
