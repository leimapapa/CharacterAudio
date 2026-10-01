export interface SettingInfo {
  key: string;
  title: string;
  category: 'Pitch & Speed' | 'Tone & Formant' | 'Expression & Emotion' | 'Spatial & Atmosphere' | 'Master & Editing';
  plainEnglishSummary: string;
  animationUseCases: string;
  characterExamples: string[];
  repeatabilityTip: string;
  recommendedRange?: string;
}

export const SETTING_INFO_MAP: Record<string, SettingInfo> = {
  pitchSemitones: {
    key: 'pitchSemitones',
    title: 'Pitch Shift (Semitones)',
    category: 'Pitch & Speed',
    plainEnglishSummary: 'Changes how high or deep the voice sounds musically, measured in musical half-steps (semitones). 12 semitones equals a full octave.',
    animationUseCases: 'The single most important setting for defining character age and size. Shifting pitch up makes voices sound smaller, younger, or squeakier. Shifting down makes voices sound physically gigantic, ancient, or menacing.',
    characterExamples: [
      '+12 to +18: Squeaky rodents, tiny fairies, cute mascots, chipmunks',
      '+4 to +8: Child characters, nervous apprentices, hyperactive goblins',
      '0: Normal human adult voice',
      '-4 to -8: Gruff warriors, old kings, lumberjacks',
      '-12 to -18: Giant ogres, stone golems, demon lords, ancient dragons'
    ],
    repeatabilityTip: 'For consistent character lines, keep this exact semitone value identical across all takes for that character.',
    recommendedRange: '-24 to +24 semitones (±2 octaves)'
  },

  pitchFineCents: {
    key: 'pitchFineCents',
    title: 'Fine Tune Detune (Cents)',
    category: 'Pitch & Speed',
    plainEnglishSummary: 'Micro-adjusts the pitch in tiny increments (100 cents = 1 semitone). Allows subtle detuning between musical notes.',
    animationUseCases: 'Used to add eerie imperfection, a slightly sickly or off-key wobble, or to tune the voice to match a specific musical key in background scoring.',
    characterExamples: [
      '+20 to +40 cents: Squeakier cartoon emphasis without jumping a full musical note',
      '-20 to -40 cents: Unsettling ghostly detune or drunken tavern brawler'
    ],
    repeatabilityTip: 'Keep at 0 for clean characters, or record a small fixed offset (e.g. +15 cents) to give a character a trademark unique vocal signature.',
    recommendedRange: '-100 to +100 cents'
  },

  pitchMode: {
    key: 'pitchMode',
    title: 'Pitch Mode (Granular vs Tape Varispeed)',
    category: 'Pitch & Speed',
    plainEnglishSummary: 'Decides whether pitch shifting changes the speaking speed or keeps the word duration untouched.',
    animationUseCases: 'Granular mode shifts pitch independently while letting you dial in speaking pace separately. Tape Varispeed ties pitch and speed together, mimicking classic 1960s vinyl tape-speedup (like Alvin and the Chipmunks or classic Looney Tunes).',
    characterExamples: [
      'Granular: Modern cinematic animation where characters must speak with normal timing but a different pitch',
      'Tape Varispeed: Classic retro cartoon comedy, sped-up tape recorder jokes, or sluggish dragging giant tape'
    ],
    repeatabilityTip: 'Choose one mode per character and stick with it. Varispeed will change your animation timing if pitch is altered.',
    recommendedRange: 'Granular (Independent) or Tape Varispeed (Linked)'
  },

  speed: {
    key: 'speed',
    title: 'Playback Speed / Tempo',
    category: 'Pitch & Speed',
    plainEnglishSummary: 'Controls how quickly words are delivered without altering musical pitch (in Granular mode). 1.0x is original speed.',
    animationUseCases: 'Reflects mental energy, anxiety, or physical heft. Fast speech communicates neurotic sidekicks, fast-talking salesmen, or panicked animals. Slow speech communicates heavy, sleepy, or dim-witted characters.',
    characterExamples: [
      '1.3x to 1.8x: Panicked sidekick, caffeinated squirrel, auctioneer rabbit',
      '1.0x: Standard natural dialogue pace',
      '0.6x to 0.8x: Sluggish swamp ogre, slow-moving tree ent, sleepy sloth'
    ],
    repeatabilityTip: 'Dialogue pacing is critical for lip sync. Note down the exact speed factor to match across all dialogue scenes.',
    recommendedRange: '0.3x to 2.5x'
  },

  formantShift: {
    key: 'formantShift',
    title: 'Formant Shift (Throat / Vocal Tract Size)',
    category: 'Tone & Formant',
    plainEnglishSummary: 'Alters the perceived anatomical size of the vocal tract (throat, mouth, and chest cavity) without changing the musical pitch of the vocal cords.',
    animationUseCases: 'Prevents the "Mickey Mouse" artifact when shifting pitch. Lowering formant gives a voice an enormous chest cavity and heavy throat resonance; raising formant creates the sound of a tiny skull and miniature windpipe.',
    characterExamples: [
      '+4 to +8: Tiny woodland sprite, insect creature, doll voice',
      '-4 to -8: Deep-chested warrior, giant brute, ancient wizard'
    ],
    repeatabilityTip: 'Pair positive pitch with negative formant for an uncanny high-voiced monster, or low pitch with positive formant for a tiny creature trying to sound scary.',
    recommendedRange: '-12 to +12'
  },

  lowGain: {
    key: 'lowGain',
    title: 'Low Bass Rumble (250Hz)',
    category: 'Tone & Formant',
    plainEnglishSummary: 'Boosts or cuts deep chest frequencies below 250Hz.',
    animationUseCases: 'Adds physical weight and menace. Boosting low frequencies makes cartoon characters sound heavier and more imposing on large speakers. Cutting lows makes characters sound lightweight, paper-thin, or miniature.',
    characterExamples: [
      '+6 to +12 dB: Thunderous villains, roaring beasts, mech commanders',
      '-6 to -12 dB: Tiny mice, hovering fairies, radio transmissions'
    ],
    repeatabilityTip: 'Cut lows on miniature characters to prevent muddy low-end buildup in your cartoon audio mix.',
    recommendedRange: '-15 dB to +15 dB'
  },

  midGain: {
    key: 'midGain',
    title: 'Mid Body & Nasal Presence (1200Hz)',
    category: 'Tone & Formant',
    plainEnglishSummary: 'Controls the vocal presence and nasal honk around 1200Hz where cartoon speech intelligibility lives.',
    animationUseCases: 'Boosting mids creates punchy, nasal cartoon characters (think duck bills, bird beaks, or nerdy cartoon sidekicks). Cutting mids creates a scooped, hollow, ethereal vocal texture.',
    characterExamples: [
      '+4 to +8 dB: Squawking birds, nerdy sidekicks, telephone operators',
      '-3 to -6 dB: Hollow specters, whispering phantoms'
    ],
    repeatabilityTip: 'If a character line gets lost behind loud animation sound effects (explosions, music), bump mid gain +3dB.',
    recommendedRange: '-15 dB to +15 dB'
  },

  highGain: {
    key: 'highGain',
    title: 'High Air & Sizzle (4000Hz+)',
    category: 'Tone & Formant',
    plainEnglishSummary: 'Adjusts the sparkle, crispness, and sibilance ("s", "t", and breath sounds) at 4kHz and above.',
    animationUseCases: 'Gives small magical creatures an airy sparkle or hyperactive characters crisp articulation. Cutting highs makes giants sound muddy and subterranean.',
    characterExamples: [
      '+4 to +6 dB: Cute pixies, cheerful mascots, whispering wind spirits',
      '-4 to -8 dB: Cavern trolls, muddy subterranean crawlers'
    ],
    repeatabilityTip: 'Avoid boosting beyond +6dB if the original recording has harsh mic sibilance.',
    recommendedRange: '-15 dB to +15 dB'
  },

  filterType: {
    key: 'filterType',
    title: 'Speaker & Filter Characteristic',
    category: 'Tone & Formant',
    plainEnglishSummary: 'Applies an acoustic frequency shaping filter: Clean (none), Walkie-Talkie (bandpass), Muffled (lowpass), or Thin (highpass).',
    animationUseCases: 'Places the character speaking through practical props in the animation story: Walkie for intercoms/astronaut helmets; Lowpass for talking through closed doors or underwater; Highpass for 1930s vintage gramophone phonograph voices.',
    characterExamples: [
      'Bandpass: Spaceship pilot, bank security guard, taxi dispatcher',
      'Lowpass: Trapped in a wooden crate, speaking underwater, muffled giant',
      'Highpass: Old animated newsreel announcer, transistor radio'
    ],
    repeatabilityTip: 'Essential for scenes where characters speak over an intercom or through walls.',
    recommendedRange: 'Clean, Walkie (Bandpass), Muffled (Lowpass), Thin (Highpass)'
  },

  filterCutoff: {
    key: 'filterCutoff',
    title: 'Filter Cutoff Frequency',
    category: 'Tone & Formant',
    plainEnglishSummary: 'Sets the center or border frequency where the filter takes effect (300Hz to 8000Hz).',
    animationUseCases: 'Fine-tunes how severe the muffled or telephone effect sounds. A lower cutoff on lowpass sounds deeper underwater; a tighter cutoff on bandpass makes a walkie-talkie sound more tinny and retro.',
    characterExamples: [
      '1200Hz on Lowpass: Heavily muffled through thick dungeon wall',
      '1850Hz on Bandpass: Perfect police scanner / walkie-talkie frequency'
    ],
    repeatabilityTip: 'Keep the cutoff fixed for a specific prop or environment to maintain audio realism.',
    recommendedRange: '300 Hz to 8000 Hz'
  },

  vibratoDepth: {
    key: 'vibratoDepth',
    title: 'Tremble Vibrato (Nervous / Flutter)',
    category: 'Expression & Emotion',
    plainEnglishSummary: 'Modulates the vocal volume and pitch with a rhythmic tremor curve (0% to 100%).',
    animationUseCases: 'Simulates intense emotional vulnerability: shivering in freezing arctic winds, terrified henchmen about to face the villain, or the frail, shaking voice of an ancient 200-year-old grandfather clock character.',
    characterExamples: [
      '50% to 80%: Panicked henchman, freezing snowman, trembling scaredy-cat',
      '20% to 40%: Old mountain wizard, fragile fairy queen'
    ],
    repeatabilityTip: 'Great for comedic scenes where a brave character suddenly gets terrified.',
    recommendedRange: '0% (none) to 100% (extreme tremble)'
  },

  vibratoRate: {
    key: 'vibratoRate',
    title: 'Vibrato Wobble Speed',
    category: 'Expression & Emotion',
    plainEnglishSummary: 'How many times per second the voice wobbles (1Hz to 14Hz).',
    animationUseCases: 'A fast wobble (9-12Hz) sounds like frantic teeth-chattering and panic. A slow wobble (2-4Hz) sounds like an eerie singing ghost or dramatic theatrical villain.',
    characterExamples: [
      '9.0 to 12.0 Hz: Frantic teeth-chattering, electrocuted shock, sheer terror',
      '3.0 to 5.0 Hz: Ghostly specter, singing mermaid, theatrical queen'
    ],
    repeatabilityTip: 'Pair 9Hz with 60% depth for instantaneous cartoon panic.',
    recommendedRange: '1.0 Hz to 14.0 Hz'
  },

  robotizeMix: {
    key: 'robotizeMix',
    title: 'Robot / Ring Modulator Mix',
    category: 'Expression & Emotion',
    plainEnglishSummary: 'Blends in a ring-modulated synthesizer tone that multiplies the voice signal, creating metallic harmonic sidebands.',
    animationUseCases: 'The classic sci-fi sound design effect for Daleks, cyborg warriors, AI onboard computers, and malevolent killer drones.',
    characterExamples: [
      '60% to 80%: Battle droid, mechanized sentry, retro arcade robot',
      '30% to 40%: Cybernetic pilot wearing a high-tech voice scrambler'
    ],
    repeatabilityTip: 'Use with low reverb and bandpass filter for an iconic 1980s cartoon robot voice.',
    recommendedRange: '0% (off) to 100% (pure synthetic robot)'
  },

  robotizeFreq: {
    key: 'robotizeFreq',
    title: 'Robot Carrier Frequency',
    category: 'Expression & Emotion',
    plainEnglishSummary: 'The pitch of the metallic oscillator multiplied with the vocal track (30Hz to 320Hz).',
    animationUseCases: 'Low frequencies (40-80Hz) produce deep clanking mech armor; higher frequencies (180-280Hz) produce chirpy, insectoid, or alien robot sounds.',
    characterExamples: [
      '65 to 85 Hz: Heavy tank mech, menacing Terminator-style droid',
      '200 to 280 Hz: Glitchy micro-drone, chirping alien bot'
    ],
    repeatabilityTip: 'Locks in the signature tone of a specific robot model in your cartoon.',
    recommendedRange: '30 Hz to 320 Hz'
  },

  saturation: {
    key: 'saturation',
    title: 'Villain Growl Overdrive (Saturation)',
    category: 'Expression & Emotion',
    plainEnglishSummary: 'Applies gentle non-linear wave clipping to warm up the voice with gritty harmonic distortion.',
    animationUseCases: 'Gives clean voice actors the raspy, gravelly throat distortion of evil warlords, dragons, and demons without shredding the actor’s vocal cords in real life.',
    characterExamples: [
      '30% to 50%: Grumpy swamp ogre, menacing pirate captain, tavern bouncer',
      '60% to 85%: Infernal demon lord, enraged berserker, rabid wolf-man'
    ],
    repeatabilityTip: 'Even a subtle 10-15% saturation adds warm vintage tape richness to cartoon lines.',
    recommendedRange: '0% (crystal clean) to 100% (heavy savage roar)'
  },

  chorusMix: {
    key: 'chorusMix',
    title: 'Fairy Chorus / Doubler',
    category: 'Expression & Emotion',
    plainEnglishSummary: 'Clones the voice with subtle time delays and gentle stereo pitch wavers.',
    animationUseCases: 'Creates the impression that multiple beings are speaking in unison: an army of miniature minions, a sparkling twin fairy, or a hive-mind alien collective.',
    characterExamples: [
      '40% to 65%: Magical sprite, hive-mind insect queen, enchanted oracle',
      '20% to 30%: Thicker animated hero voice with comic-book presence'
    ],
    repeatabilityTip: 'Creates lush stereo width that stands out against mono sound effects.',
    recommendedRange: '0% to 100%'
  },

  reverbType: {
    key: 'reverbType',
    title: 'Reverb Chamber Environment',
    category: 'Spatial & Atmosphere',
    plainEnglishSummary: 'Selects the acoustic impulse simulation representing the physical animated space where the character is standing.',
    animationUseCases: 'A character inside a castle must sound different than one in a bedroom or a cave. This impulse convolver places the voice in an authentic physical space.',
    characterExamples: [
      'Small Room: Bedroom dialogue, inside an automobile, quiet office',
      'Concert Hall: Royal throne room, amphitheater speech, school auditorium',
      'Echo Cave: Underground mine, monster lair, rocky canyon',
      'Tin Can: Inside an iron helmet, metal trash can, sewer drain pipe',
      'Cathedral: Ancient temple, ruined stone sanctuary, divine courtroom',
      'Cosmic Space: Void of space, interdimensional spirit realm'
    ],
    repeatabilityTip: 'Match this setting to the background artwork of your cartoon scene.',
    recommendedRange: 'Room, Hall, Cave, Tin Can, Cathedral, Cosmic Space, or Dry'
  },

  reverbMix: {
    key: 'reverbMix',
    title: 'Reverb Wet Mix',
    category: 'Spatial & Atmosphere',
    plainEnglishSummary: 'Percentage blend of the reverberant room echo vs. the direct dry vocal microphone signal.',
    animationUseCases: 'Controls perceived distance. Low reverb (10-20%) keeps the character close to the cartoon camera; high reverb (40-60%) pushes the character far into the background or creates an epic supernatural presence.',
    characterExamples: [
      '10% to 20%: Intimate cartoon close-up shot',
      '30% to 45%: Wide shot of character inside a large stone hall',
      '60%+: Disembodied ghost or god voice echoing from the clouds'
    ],
    repeatabilityTip: 'For intimate comedy dialogue, keep reverb under 25% so comedic punchlines stay razor sharp.',
    recommendedRange: '0% (dry) to 100% (drenched)'
  },

  delayMix: {
    key: 'delayMix',
    title: 'Echo Delay Mix',
    category: 'Spatial & Atmosphere',
    plainEnglishSummary: 'Blends distinct rhythmic slapback or canyon echoes after the original words.',
    animationUseCases: 'Essential for characters shouting across valleys, cavernous factory floors, or comedic slapstick repeats ("Hello... ello... llo...").',
    characterExamples: [
      '20% to 40%: Canyon shout, echoing dungeon boss, ghostly transmission'
    ],
    repeatabilityTip: 'Combine with high feedback for cartoon megaphone or cliffside screaming gags.',
    recommendedRange: '0% to 80%'
  },

  delayTime: {
    key: 'delayTime',
    title: 'Echo Delay Time',
    category: 'Spatial & Atmosphere',
    plainEnglishSummary: 'The time gap between the voice and its first echo bounce (0.05s to 0.8s).',
    animationUseCases: 'Short delay (50-100ms) creates tight vintage slapback comedy; long delay (300-600ms) creates vast grand-canyon echoes.',
    characterExamples: [
      '80ms: Retro rockabilly cartoon announcer slapback',
      '350ms: Shouting across a mountain pass'
    ],
    repeatabilityTip: 'For repeatable character lines, lock this to the tempo of the cartoon scene.',
    recommendedRange: '0.05s (50ms) to 0.8s (800ms)'
  },

  delayFeedback: {
    key: 'delayFeedback',
    title: 'Echo Delay Feedback',
    category: 'Spatial & Atmosphere',
    plainEnglishSummary: 'How much of the echo feeds back into itself, controlling how many times the echo repeats before dying out.',
    animationUseCases: 'Low feedback gives 1 or 2 quick bounces; high feedback keeps repeating endlessly down an abandoned hallway.',
    characterExamples: [
      '20% to 30%: Subtle 2-bounce slap',
      '50% to 70%: Endless dungeon echo'
    ],
    repeatabilityTip: 'Keep under 60% during fast talking to prevent words from stepping on each other.',
    recommendedRange: '0% to 80%'
  },

  outputGain: {
    key: 'outputGain',
    title: 'Master Level (Volume)',
    category: 'Master & Editing',
    plainEnglishSummary: 'Overall volume multiplier applied after all DSP effects and limiter compression.',
    animationUseCases: 'Allows you to normalize take volumes so that a quiet whisper take can match the loudness of a shouting take when creating multiple lines for the same character.',
    characterExamples: [
      '1.0x (100%): Standard unity gain',
      '0.7x to 0.9x: Taming loud scream takes',
      '1.2x to 1.5x: Boosting quiet, intimate whispers'
    ],
    repeatabilityTip: 'Keep eye on the Output VU meter so levels stay out of the red clipping zone.',
    recommendedRange: '10% to 200%'
  },

  audioTrim: {
    key: 'audioTrim',
    title: 'Audio Trim & IN/OUT Markers',
    category: 'Master & Editing',
    plainEnglishSummary: 'Draggable markers on the waveform defining the active start and end region of the audio take.',
    animationUseCases: 'Voice actors frequently pause, cough, or take deep breaths before speaking. Trimming ensures your cartoon voice clip fires on the exact animation frame without dead air.',
    characterExamples: [
      'Snappy comedic timing: Trim directly to the first consonant burst'
    ],
    repeatabilityTip: 'Trimming dead silence guarantees consistent timing when importing takes into animation software.',
    recommendedRange: 'Any range within file duration'
  },

  audioFade: {
    key: 'audioFade',
    title: 'Fade In & Fade Out Envelopes',
    category: 'Master & Editing',
    plainEnglishSummary: 'Smooth micro-volume ramps at the start and end of the audio clip to prevent digital pops and clicks.',
    animationUseCases: 'Microphone signals rarely cut off at zero-crossings. A 0.02s fade-in and 0.05s fade-out creates professional, click-free audio takes ready for broadcast animation.',
    characterExamples: [
      '0.02s - 0.05s: Standard click prevention on speech',
      '0.5s+: Dramatic slow vocal swell for ghosts or magical chants'
    ],
    repeatabilityTip: 'Set 0.02s fade-in on every take to guarantee clean dialogue editing in Premiere, Blender, or Toon Boom.',
    recommendedRange: '0.0s to 1.5s'
  }
};
