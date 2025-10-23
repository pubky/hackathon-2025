# Audio Files

This directory contains audio files for ConsentKy feedback sounds.

## Files

- `wait.mp3` - Waiting music that plays when a user has signed and is waiting for their partner to sign

## Implementation

The audio system uses the Web Audio API to provide:

1. **Session Created Sound** - Programmatically generated three-tone ascending melody (C-E-G)
2. **Signature Complete Sound** - Programmatically generated two-tone confirmation chime (A-C)
3. **Waiting Music** - Loops the `wait.mp3` file with fade-in/fade-out effects

## Technical Details

- Sound effects are generated using Web Audio API oscillators
- The waiting music is loaded from `/sounds/wait.mp3` and played in a loop
- Volume is controlled at 50% (0.5) for the music, 30% (0.3) for sound effects
- All audio respects user preferences stored in localStorage
- Smooth fade-in (0.5s) when starting music
- Smooth fade-out (0.5s) when stopping music

## User Controls

Users can toggle:
- Sound effects (session creation, signature complete)
- Waiting music (can be disabled independently)
- Settings persist across sessions via localStorage
