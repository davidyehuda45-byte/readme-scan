/**
 * Lightweight ANSI color utility with zero dependencies.
 * Respects NO_COLOR environment variable and non-TTY outputs.
 */

const isColorSupported =
  !process.env.NO_COLOR &&
  process.env.TERM !== 'dumb' &&
  (Boolean(process.stdout.isTTY) || Boolean(process.env.FORCE_COLOR));

function style(start, end) {
  return (str) => (isColorSupported ? `\x1b[${start}m${str}\x1b[${end}m` : String(str));
}

export const colors = {
  reset: style(0, 0),
  bold: style(1, 22),
  dim: style(2, 22),
  italic: style(3, 23),
  underline: style(4, 24),

  black: style(30, 39),
  red: style(31, 39),
  green: style(32, 39),
  yellow: style(33, 39),
  blue: style(34, 39),
  magenta: style(35, 39),
  cyan: style(36, 39),
  white: style(37, 39),
  gray: style(90, 39),

  bgRed: style(41, 49),
  bgGreen: style(42, 49),
  bgYellow: style(43, 49),
  bgBlue: style(44, 49),
  bgCyan: style(46, 49),
};

export default colors;
