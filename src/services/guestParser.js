const MAX_NAME_LENGTH = 40;
const CONNECTOR_RE = /\s*(?:&|,|\/|\band\b|\bn\b)\s*/i;
const LEADING_COUNT_RE = /^(\d{1,2})\s+(?=\S)/;

/**
 * Parses "+name" / "-name" tokens out of a message. A sign only counts as a
 * token boundary when it starts the line or is preceded by whitespace, so
 * hyphenated names ("Jean-Paul") are left alone. A single "+" chunk can hold
 * multiple names joined by "&", ",", "/", "and" or "n" (e.g. "+Brad & Justin",
 * "+aaron n +jack"). A leading "+1 " / "+2 " count is stripped so "+1 abigail
 * bro" resolves to the name "abigail bro" rather than two tokens.
 *
 * Returns an array of { sign: '+'|'-', name: string }.
 */
function parseGuestTokens(content) {
  const results = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const boundaryRe = /(^|\s)([+-])/g;
    const matches = [...line.matchAll(boundaryRe)];
    if (matches.length === 0) continue;

    for (let i = 0; i < matches.length; i++) {
      const sign = matches[i][2];
      const start = matches[i].index + matches[i][1].length + 1;
      const end = i + 1 < matches.length ? matches[i + 1].index + matches[i + 1][1].length : line.length;
      let rest = line.slice(start, end).trim();
      if (!rest) continue;

      rest = rest.replace(LEADING_COUNT_RE, '');
      if (!rest) continue;

      const pieces = rest
        .split(CONNECTOR_RE)
        .map((s) => s.replace(/\s+/g, ' ').trim())
        .filter(Boolean);

      for (const name of pieces) {
        if (name.length > MAX_NAME_LENGTH) continue;
        if (/^\d+$/.test(name)) continue;
        results.push({ sign, name });
      }
    }
  }

  return results;
}

function normalize(name) {
  return name.toLowerCase().trim();
}

/** True if a "-name" cancellation token should cancel a previously added guest entry. */
function nameMatches(guestName, cancelName) {
  const a = normalize(guestName);
  const b = normalize(cancelName);
  if (a === b) return true;
  const aFirst = a.split(' ')[0];
  const bFirst = b.split(' ')[0];
  return aFirst === bFirst;
}

module.exports = { parseGuestTokens, nameMatches };
