// tools/blocks.js: reads the "=== NAME === … === END ===" blocks (NARRATION, CUE SHEET) from the top comment of a scene file.
export function readBlock(html, name) {
  const m = new RegExp(`=== ${name} ===[^\\n]*\\n([\\s\\S]*?)=== END ===`).exec(html);
  if (!m) return [];
  return m[1].split('\n').map((l) => l.trimEnd()).filter((l) => l.trim() && !/^\s*(#|at\s|time\s)/i.test(l));
}
// NARRATION line:  <seconds | +gap>  <who>[@label]  <text>  [|| English subtitle]
//   "12.5" = starts at 12.5 s · "+0.6" = starts 0.6 s after the previous line ends
//   who@label  gives the line a name the scene and the CUE SHEET can use (label.s = its start, label.e = its end)
//   text || English   (Echo lines) the Japanese text is spoken, the English is shown under it
export function narrationLines(html) {
  return readBlock(html, 'NARRATION').map((l) => {
    const m = /^\s*(\+?[\d.]+)\s+(\S+)\s+(.+)$/.exec(l);
    if (!m) throw new Error(`bad NARRATION line: "${l}"  (expected: <seconds | +gap> <who>[@label] <text>)`);
    const [who, label] = m[2].split('@');
    let raw = m[3].trim(), en = null;
    if (raw.includes('||')) [raw, en] = raw.split('||').map((x) => x.trim());
    return { at: m[1].startsWith('+') ? null : parseFloat(m[1]), gap: m[1].startsWith('+') ? parseFloat(m[1]) : null, who, label: label || null, en, raw, text: raw.replace(/[*⬆↑]/g, '').replace(/\s+/g, ' ') };   // *word* = yellow caption · word⬆ = the voice rises on that word
  });
}
