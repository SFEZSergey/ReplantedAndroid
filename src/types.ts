export type UiLanguage = 'system' | 'ru' | 'en';

export type ControlKind = 'button' | 'stick' | 'dpad' | 'toggle';

export interface TouchControlItem {
  id: string;
  kind: ControlKind;
  bit: number;
  label: string;
  defaultX: number;
  defaultY: number;
  defaultSize: number;
  defaultOn: boolean;
  x: number;
  y: number;
  scale: number;
  on: boolean;
  vector: [number, number];
}

export interface DriverPackage {
  id: string;
  name: string;
  version: string;
  libraryName: string;
  author?: string;
  description?: string;
}

export interface LauncherConfig {
  gpuDriver: string; // 'builtin' | 'system' | driverId
  gpuTurbo: boolean; // APS5_GPU_TURBO
  fpsLimit: '60' | '45' | '30'; // APS5_FPS_LIMIT
  outputRes: 'auto' | 'native' | '720'; // APS5_OUTPUT_RES
  scaleMode: 'fit' | 'fill' | 'stretch'; // APS5_SCALE_MODE
  touchVisible: boolean; // touch_controls.visible
  gameLanguage: string; // 'auto' or PS5 console language code string
  uiLanguage: UiLanguage;
  protectDolby: boolean;
  envTxt: string; // custom env.txt lines
}

// PS5 libScePad PadButton bitmasks from TouchControlsView.java
export const PAD_BITS = {
  L3: 0x0002,
  R3: 0x0004,
  OPTIONS: 0x0008,
  UP: 0x0010,
  RIGHT: 0x0020,
  DOWN: 0x0040,
  LEFT: 0x0080,
  L2: 0x0100,
  R2: 0x0200,
  L1: 0x0400,
  R1: 0x0800,
  TRIANGLE: 0x1000,
  CIRCLE: 0x2000,
  CROSS: 0x4000,
  SQUARE: 0x8000,
  TOUCHPAD: 0x100000,
} as const;

export function createDefaultControls(): TouchControlItem[] {
  const defs: Array<[string, ControlKind, number, string, number, number, number, boolean]> = [
    ['toggle', 'toggle', 0, '◉', 0.50, 0.06, 4.0, true],
    ['lstick', 'stick', 0, 'L', 0.13, 0.70, 15.0, true],
    ['rstick', 'stick', 1, 'R', 0.70, 0.72, 13.0, false],
    ['dpad', 'dpad', 0, '✚', 0.28, 0.80, 11.0, true],
    ['triangle', 'button', PAD_BITS.TRIANGLE, '△', 0.86, 0.54, 6.5, true],
    ['cross', 'button', PAD_BITS.CROSS, '✕', 0.86, 0.78, 6.5, true],
    ['square', 'button', PAD_BITS.SQUARE, '□', 0.805, 0.66, 6.5, true],
    ['circle', 'button', PAD_BITS.CIRCLE, '○', 0.915, 0.66, 6.5, true],
    ['l1', 'button', PAD_BITS.L1, 'L1', 0.07, 0.30, 6.0, true],
    ['l2', 'button', PAD_BITS.L2, 'L2', 0.07, 0.13, 6.0, true],
    ['r1', 'button', PAD_BITS.R1, 'R1', 0.93, 0.30, 6.0, true],
    ['r2', 'button', PAD_BITS.R2, 'R2', 0.93, 0.13, 6.0, true],
    ['l3', 'button', PAD_BITS.L3, 'L3', 0.13, 0.43, 4.5, true],
    ['r3', 'button', PAD_BITS.R3, 'R3', 0.70, 0.45, 4.5, false],
    ['options', 'button', PAD_BITS.OPTIONS, '≡', 0.62, 0.10, 5.0, true],
    ['touchpad', 'button', PAD_BITS.TOUCHPAD, '▭', 0.38, 0.10, 5.0, true],
  ];
  return defs.map(([id, kind, bit, label, x, y, size, on]) => ({
    id,
    kind,
    bit,
    label,
    defaultX: x,
    defaultY: y,
    defaultSize: size,
    defaultOn: on,
    x,
    y,
    scale: 1,
    on,
    vector: [0, 0],
  }));
}

export interface Ps5Language {
  code: number;
  locale: string;
  name: string;
  inGame: boolean; // Supported in PvZ: Replanted param.json
}

// Mirrors GAME_LANGUAGE_CODES, GAME_LANGUAGE_NAMES, and PARAM_LOCALES from MainActivity.java
// PvZ: Replanted (PPSA29802) supports: English (US/UK), French, German, Spanish, Japanese, Portuguese (Brazil)
export const PS5_LANGUAGES: Ps5Language[] = [
  { code: 1, locale: 'en-US', name: 'English (US)', inGame: true },
  { code: 18, locale: 'en-GB', name: 'English (UK)', inGame: true },
  { code: 2, locale: 'fr-FR', name: 'Français', inGame: true },
  { code: 4, locale: 'de-DE', name: 'Deutsch', inGame: true },
  { code: 3, locale: 'es-ES', name: 'Español (España)', inGame: true },
  { code: 0, locale: 'ja-JP', name: '日本語', inGame: true },
  { code: 17, locale: 'pt-BR', name: 'Português (Brasil)', inGame: true },
  { code: 8, locale: 'ru-RU', name: 'Русский', inGame: false },
  { code: 30, locale: 'uk-UA', name: 'Українська', inGame: false },
  { code: 22, locale: 'fr-CA', name: 'Français (Canada)', inGame: false },
  { code: 20, locale: 'es-419', name: 'Español (Latinoamérica)', inGame: false },
  { code: 5, locale: 'it-IT', name: 'Italiano', inGame: false },
  { code: 6, locale: 'nl-NL', name: 'Nederlands', inGame: false },
  { code: 7, locale: 'pt-PT', name: 'Português (Portugal)', inGame: false },
  { code: 16, locale: 'pl-PL', name: 'Polski', inGame: false },
  { code: 19, locale: 'tr-TR', name: 'Türkçe', inGame: false },
  { code: 23, locale: 'cs-CZ', name: 'Čeština', inGame: false },
  { code: 24, locale: 'hu-HU', name: 'Magyar', inGame: false },
  { code: 25, locale: 'el-GR', name: 'Ελληνικά', inGame: false },
  { code: 26, locale: 'ro-RO', name: 'Română', inGame: false },
  { code: 12, locale: 'fi-FI', name: 'Suomi', inGame: false },
  { code: 13, locale: 'sv-SE', name: 'Svenska', inGame: false },
  { code: 14, locale: 'da-DK', name: 'Dansk', inGame: false },
  { code: 15, locale: 'no-NO', name: 'Norsk', inGame: false },
  { code: 9, locale: 'ko-KR', name: '한국어', inGame: false },
  { code: 11, locale: 'zh-Hans', name: '简体中文', inGame: false },
  { code: 10, locale: 'zh-Hant', name: '繁體中文', inGame: false },
  { code: 21, locale: 'ar-AE', name: 'العربية', inGame: false },
  { code: 27, locale: 'th-TH', name: 'ไทย', inGame: false },
  { code: 28, locale: 'vi-VN', name: 'Tiếng Việt', inGame: false },
  { code: 29, locale: 'id-ID', name: 'Bahasa Indonesia', inGame: false },
];
