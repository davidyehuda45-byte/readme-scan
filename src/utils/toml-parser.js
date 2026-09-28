/**
 * Lightweight, zero-dependency TOML parser specifically designed for Cargo.toml and pyproject.toml.
 * Parses tables, subtables, string/number/boolean values, arrays, and inline tables.
 */

export function parseToml(tomlString) {
  const result = {};
  let currentTarget = result;

  const lines = tomlString.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    line = stripComment(line);
    if (!line) continue;

    const tableMatch = line.match(/^\[([^\]]+)\]$/);
    if (tableMatch) {
      const path = tableMatch[1].split('.').map((p) => p.trim().replace(/^["']|["']$/g, ''));
      currentTarget = result;
      for (const segment of path) {
        if (!currentTarget[segment] || typeof currentTarget[segment] !== 'object' || Array.isArray(currentTarget[segment])) {
          currentTarget[segment] = {};
        }
        currentTarget = currentTarget[segment];
      }
      continue;
    }

    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const rawKey = line.slice(0, eqIdx).trim().replace(/^["']|["']$/g, '');
      let rawVal = line.slice(eqIdx + 1).trim();

      if (rawVal.startsWith('[') && !isBracketBalanced(rawVal)) {
        while (i + 1 < lines.length && !isBracketBalanced(rawVal)) {
          i++;
          const nextLine = stripComment(lines[i].trim());
          rawVal += ' ' + nextLine;
        }
      }

      currentTarget[rawKey] = parseTomlValue(rawVal);
    }
  }

  return result;
}

function stripComment(str) {
  let inDouble = false;
  let inSingle = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const prev = i > 0 ? str[i - 1] : null;
    if (ch === '"' && prev !== '\\' && !inSingle) {
      inDouble = !inDouble;
    } else if (ch === "'" && !inDouble) {
      inSingle = !inSingle;
    } else if (ch === '#' && !inDouble && !inSingle) {
      return str.slice(0, i).trim();
    }
  }
  return str.trim();
}

function isBracketBalanced(str) {
  let count = 0;
  let inDouble = false;
  let inSingle = false;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const prev = i > 0 ? str[i - 1] : null;
    if (ch === '"' && prev !== '\\' && !inSingle) inDouble = !inDouble;
    else if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (!inDouble && !inSingle) {
      if (ch === '[') count++;
      if (ch === ']') count--;
    }
  }
  return count <= 0;
}

function parseTomlValue(val) {
  val = val.trim();

  if (val === 'true') return true;
  if (val === 'false') return false;

  if ((val.startsWith('"""') && val.endsWith('"""')) || (val.startsWith("'''") && val.endsWith("'''"))) {
    return val.slice(3, -3).trim();
  }
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    return val.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
  }

  if (/^-?\d+(\.\d+)?$/.test(val)) {
    return Number(val);
  }

  if (val.startsWith('[') && val.endsWith(']')) {
    const inner = val.slice(1, -1).trim();
    if (!inner) return [];
    return splitArrayItems(inner).map(parseTomlValue);
  }

  if (val.startsWith('{') && val.endsWith('}')) {
    const inner = val.slice(1, -1).trim();
    if (!inner) return {};
    const res = {};
    const items = splitArrayItems(inner);
    for (const item of items) {
      const eq = item.indexOf('=');
      if (eq !== -1) {
        const k = item.slice(0, eq).trim().replace(/^["']|["']$/g, '');
        const v = item.slice(eq + 1).trim();
        res[k] = parseTomlValue(v);
      }
    }
    return res;
  }

  return val;
}

function splitArrayItems(str) {
  const items = [];
  let current = '';
  let inDouble = false;
  let inSingle = false;
  let bracketDepth = 0;
  let braceDepth = 0;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const prev = i > 0 ? str[i - 1] : null;

    if (ch === '"' && prev !== '\\' && !inSingle) inDouble = !inDouble;
    else if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (!inDouble && !inSingle) {
      if (ch === '[') bracketDepth++;
      else if (ch === ']') bracketDepth--;
      else if (ch === '{') braceDepth++;
      else if (ch === '}') braceDepth--;
      else if (ch === ',' && bracketDepth === 0 && braceDepth === 0) {
        items.push(current.trim());
        current = '';
        continue;
      }
    }
    current += ch;
  }

  if (current.trim()) {
    items.push(current.trim());
  }

  return items;
}

export default parseToml;
