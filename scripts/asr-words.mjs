// Word timestamps for German speech with a local whisper-tiny model (no network).
// Usage: node scripts/asr-words.mjs <audio> <from,to;from,to;...> > words.json
// Each slice (seconds, keep them around 10 s) is transcribed on its own - the
// model loses track when it has to stitch long recordings together.
import { pipeline, env } from "@huggingface/transformers";
import { execFileSync } from "node:child_process";
import path from "node:path";

env.allowRemoteModels = false;
env.localModelPath = path.join(import.meta.dirname, "../node_modules/sts-whisper-tiny/models");

const [audioPath, sliceArg] = process.argv.slice(2);
const SR = 16000;
const raw = execFileSync("ffmpeg", ["-loglevel", "error", "-i", audioPath, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], {
  maxBuffer: 1 << 30,
});
const audio = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
const slices = sliceArg.split(";").map((s) => s.split(",").map(Number));

const asr = await pipeline("automatic-speech-recognition", "Xenova/whisper-tiny", { dtype: "q8" });
const words = [];
for (const [from, to] of slices) {
  const part = audio.subarray(Math.round(from * SR), Math.round(to * SR));
  const out = await asr(part, { language: "german", task: "transcribe", return_timestamps: "word", no_repeat_ngram_size: 3 });
  for (const c of out.chunks ?? []) {
    words.push({ text: c.text.trim(), start: +(from + c.timestamp[0]).toFixed(2), end: +(from + (c.timestamp[1] ?? c.timestamp[0])).toFixed(2) });
  }
}
process.stdout.write(JSON.stringify(words));
