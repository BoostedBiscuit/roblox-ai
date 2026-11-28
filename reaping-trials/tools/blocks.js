// tools/blocks.js: reads the "=== NAME === … === END ===" blocks (NARRATION, CUE SHEET) from the top comment of a scene file.
export function readBlock(html, name) {
  const m = new RegExp(`=== ${name} ===[^\\n]*\\n([\\s\\S]*?)=== END ===`).exec(html);
  if (!m) return [];
  return m[1].split('\n').map((l) => l.trimEnd()).filter((l) => l.trim() && !/^\s*(#|at\s|time\s)/i.test(l));
}
export function narrationLines(html) {
  return readBlock(html, 'NARRATION').map((l) => {
    const m = /^\s*(\+?[\d.]+)\s+(\S+)\s+(.+)$/.exec(l);
    if (!m) throw new Error(`bad NARRATION line: "${l}"  (expected: <seconds | +gap> <who> <text>)`);
    const raw = m[3].trim();
    // "12.5" = starts at 12.5 s · "+0.6" = starts 0.6 s after the previous line ends
    return { at: m[1].startsWith('+') ? null : parseFloat(m[1]), gap: m[1].startsWith('+') ? parseFloat(m[1]) : null, who: m[2], raw, text: raw.replace(/[*⬆↑]/g, '').replace(/\s+/g, ' ') };   // *word* = yellow caption · word⬆ = the voice rises on that word
  });
}
