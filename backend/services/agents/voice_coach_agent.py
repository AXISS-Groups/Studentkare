"""
services.agents.voice_coach_agent — AI Voice & Speech Coach Agent.

Analyzes a transcript for pace (words per minute), filler-word usage, and
generates coaching tips.  Deterministic word/filler detection.
"""
from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field

FILLERS = ["um", "uh", "basically", "you know", "like", "actually", "so", "okay", "right"]


class VoiceCoachingRequest(BaseModel):
    transcript_text: str
    audio_duration_seconds: float = 10.0


class VoiceCoachingResponse(BaseModel):
    words_per_minute: float = 0.0
    filler_word_count: int = 0
    detected_fillers: List[str] = Field(default_factory=list)
    coaching_tips: List[str] = Field(default_factory=list)


class VoiceCoachAgent:
    async def analyze_speech(self, req: VoiceCoachingRequest) -> VoiceCoachingResponse:
        import re
        text = req.transcript_text
        words = [w for w in re.split(r"\s+", text.strip()) if w]
        word_count = len(words)
        minutes = max(req.audio_duration_seconds, 1.0) / 60.0
        wpm = round(word_count / minutes, 1)

        lowered = text.lower()
        detected: List[str] = []
        for filler in FILLERS:
            count = lowered.count(filler)
            if count > 0:
                detected.append(filler)

        tips: List[str] = []
        if "um" in detected or "uh" in detected:
            tips.append("Reduce hesitation fillers by pausing instead of saying 'um'.")
        if "basically" in detected or "you know" in detected:
            tips.append("Replace conversational fillers with concise, structured phrasing.")
        if wpm < 110:
            tips.append("Pace is measured; consider a slightly faster cadence for energy.")
        elif wpm > 180:
            tips.append("Slow down to improve articulation and retention.")
        if not tips:
            tips.append("Clear and confident delivery. Keep the structure.")

        return VoiceCoachingResponse(
            words_per_minute=wpm,
            filler_word_count=len(detected),
            detected_fillers=detected,
            coaching_tips=tips,
        )


voice_coach_agent = VoiceCoachAgent()
