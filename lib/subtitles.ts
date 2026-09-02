/**
 * Subtitle parsing and conversion utilities (SRT and WebVTT).
 */

export type SubtitleCue = {
  id?: string;
  start: number; // seconds
  end: number;   // seconds
  text: string;
};

function parseTimestamp(timeStr: string): number {
  const clean = timeStr.trim().replace(',', '.');
  const parts = clean.split(':');
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  }
  if (parts.length === 2) {
    const minutes = parseFloat(parts[0]);
    const seconds = parseFloat(parts[1]);
    return minutes * 60 + seconds;
  }
  return parseFloat(clean) || 0;
}

function formatSrtTimestamp(seconds: number): string {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = Math.floor(safe % 60);
  const millis = Math.floor((safe % 1) * 1000);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`;
}

export function parseSubtitles(content: string): SubtitleCue[] {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const cues: SubtitleCue[] = [];

  let i = 0;
  // Skip WEBVTT header if present
  if (lines[0]?.trim().startsWith('WEBVTT')) {
    i = 1;
    while (i < lines.length && lines[i].trim() !== '') {
      i++;
    }
  }

  while (i < lines.length) {
    const line = lines[i]?.trim();
    if (!line) {
      i++;
      continue;
    }

    let timeLine = line;
    // Check if current line is a cue identifier
    if (!line.includes('-->') && i + 1 < lines.length && lines[i + 1].includes('-->')) {
      i++;
      timeLine = lines[i].trim();
    }

    if (timeLine.includes('-->')) {
      const [startStr, endStrWithSettings] = timeLine.split('-->');
      const endStr = endStrWithSettings?.trim().split(' ')[0];

      if (startStr && endStr) {
        const start = parseTimestamp(startStr);
        const end = parseTimestamp(endStr);

        i++;
        const textLines: string[] = [];
        while (i < lines.length && lines[i]?.trim() !== '') {
          textLines.push(lines[i].trim());
          i++;
        }

        const text = textLines.join('\n');
        if (text) {
          cues.push({ start, end, text });
        }
      }
    }
    i++;
  }

  return cues;
}

export function cuesToSrt(cues: SubtitleCue[]): string {
  return cues
    .map((cue, index) => {
      const num = index + 1;
      const start = formatSrtTimestamp(cue.start);
      const end = formatSrtTimestamp(cue.end);
      return `${num}\n${start} --> ${end}\n${cue.text}\n`;
    })
    .join('\n');
}

export function cuesToAss(cues: SubtitleCue[], videoWidth = 1280, videoHeight = 720): string {
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,24,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,2,1,2,20,20,25,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const formatAssTime = (seconds: number) => {
    const safe = Math.max(0, seconds);
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = Math.floor(safe % 60);
    const cs = Math.floor((safe % 1) * 100);
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  };

  const events = cues
    .map((cue) => {
      const start = formatAssTime(cue.start);
      const end = formatAssTime(cue.end);
      const text = cue.text.replace(/\n/g, '\\N');
      return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
    })
    .join('\n');

  return `${header}\n${events}`;
}
