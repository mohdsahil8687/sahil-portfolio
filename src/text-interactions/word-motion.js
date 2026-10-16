// Pure helpers shared by the controller and its input/animation checks.
const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'word' }) : null;

export function wordAt(text, offset) {
  const words = segmenter
    ? [...segmenter.segment(text)].filter(part => part.isWordLike).map(part => ({ start: part.index, end: part.index + part.segment.length }))
    : [...text.matchAll(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)].map(match => ({ start: match.index, end: match.index + match[0].length }));
  return words.find(word => offset >= word.start && offset < word.end)
    || words.find(word => offset === word.end) || null;
}

export function wordPose(box, point, heading = false, body = false) {
  const x = Math.max(-1, Math.min(1, (point.x - box.left) / Math.max(1, box.width) * 2 - 1));
  const y = Math.max(-1, Math.min(1, (point.y - box.top) / Math.max(1, box.height) * 2 - 1));
  const strength = body ? .6 : heading ? 1.5 : 1;
  const scale = Math.min(body ? 1.025 : heading ? 1.065 : 1.04, 1 + 6 / Math.max(1, box.width));
  return `perspective(900px) translate3d(${(x * strength).toFixed(3)}px,${(y * strength - (body ? .35 : 1)).toFixed(3)}px,0) rotateX(${(-y * (body ? .5 : 2)).toFixed(3)}deg) rotateY(${(x * (body ? .6 : 2.5)).toFixed(3)}deg) scale(${scale})`;
}

export const REST_POSE = 'perspective(900px) translate3d(0,0,0) rotateX(0deg) rotateY(0deg) scale(1)';
