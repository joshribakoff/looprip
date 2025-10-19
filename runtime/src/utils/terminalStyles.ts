const ESC = '\u001B[';

export type Styler = (value: string) => string;

const create = (openCode: number, closeCode: number): Styler => {
  const open = `${ESC}${openCode}m`;
  const close = `${ESC}${closeCode}m`;
  return (value: string) => `${open}${value}${close}`;
};

const createColor = (code: number): Styler => create(code, 39);
const createBgColor = (code: number): Styler => create(code, 49);

export const reset = `${ESC}0m`;
export const bold = create(1, 22);
export const dim = create(2, 22);
export const italic = create(3, 23);
export const underline = create(4, 24);
export const inverse = create(7, 27);
export const hidden = create(8, 28);
export const strikethrough = create(9, 29);

export const black = createColor(30);
export const red = createColor(31);
export const green = createColor(32);
export const yellow = createColor(33);
export const blue = createColor(34);
export const magenta = createColor(35);
export const cyan = createColor(36);
export const white = createColor(37);
export const gray = createColor(90);
export const redBright = createColor(91);
export const greenBright = createColor(92);
export const yellowBright = createColor(93);
export const blueBright = createColor(94);
export const magentaBright = createColor(95);
export const cyanBright = createColor(96);
export const whiteBright = createColor(97);

export const bgBlack = createBgColor(40);
export const bgRed = createBgColor(41);
export const bgGreen = createBgColor(42);
export const bgYellow = createBgColor(43);
export const bgBlue = createBgColor(44);
export const bgMagenta = createBgColor(45);
export const bgCyan = createBgColor(46);
export const bgWhite = createBgColor(47);
export const bgGray = createBgColor(100);
export const bgRedBright = createBgColor(101);
export const bgGreenBright = createBgColor(102);
export const bgYellowBright = createBgColor(103);
export const bgBlueBright = createBgColor(104);
export const bgMagentaBright = createBgColor(105);
export const bgCyanBright = createBgColor(106);
export const bgWhiteBright = createBgColor(107);

export function applyStyles(value: string, ...styles: Styler[]): string {
  return styles.reduce((acc, style) => style(acc), value);
}

// eslint-disable-next-line no-control-regex -- we rely on ANSI escape sequences here
const ANSI_PATTERN = /\u001B\[[0-9;]*m/g;

export function stripStyles(value: string): string {
  return value.replace(ANSI_PATTERN, '');
}
