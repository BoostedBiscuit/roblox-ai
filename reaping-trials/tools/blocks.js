// tools/blocks.js: reads the "=== NAME === … === END ===" blocks (NARRATION, CUE SHEET) from the top comment of a scene file.
export function readBlock(html, name) {
  const m = new RegExp(`=== ${name} ===[^\\n]*\\n([\\s\\S]*?)=== END ===`).exec(html);
  if (!m) return [];
  return m[1].split('\n').map((l) => l.trimEnd()).filter((l) => l.trim() && !/^\s*(#|at\s|time\s)/i.test(l));
}
export function narrationLines(html) {
  return readBlock(html, 'NARRATION').map((l) => {
    const m = /^\s*([\d.]+)\s+(\S+)\s+(.+)$/.exec(l);
    if (!m) throw new Error(`bad NARRATION line: "${l}"  (expected: <seconds> <who> <text>)`);
    const raw = m[3].trim();
    return { at: parseFloat(m[1]), who: m[2], raw, text: raw.replace(/\*/g, '').replace(/\s+/g, ' ') };
  });
}
