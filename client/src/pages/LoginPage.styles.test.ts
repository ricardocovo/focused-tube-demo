import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function hexToRgb(hexColor: string): [number, number, number] {
  if (!/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hexColor)) {
    throw new Error(`Invalid hex color: ${hexColor}`);
  }

  const normalizedHex = hexColor.replace('#', '');
  const expandedHex = normalizedHex.length === 3
    ? normalizedHex.split('').map((char) => `${char}${char}`).join('')
    : normalizedHex;

  return [
    Number.parseInt(expandedHex.slice(0, 2), 16),
    Number.parseInt(expandedHex.slice(2, 4), 16),
    Number.parseInt(expandedHex.slice(4, 6), 16),
  ];
}

function toLinearColor(channelValue: number): number {
  const srgb = channelValue / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

function getRelativeLuminance(hexColor: string): number {
  const [red, green, blue] = hexToRgb(hexColor);
  return 0.2126 * toLinearColor(red) + 0.7152 * toLinearColor(green) + 0.0722 * toLinearColor(blue);
}

function getContrastRatio(foregroundHex: string, backgroundHex: string): number {
  const foregroundLuminance = getRelativeLuminance(foregroundHex);
  const backgroundLuminance = getRelativeLuminance(backgroundHex);
  const lighterColor = Math.max(foregroundLuminance, backgroundLuminance);
  const darkerColor = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighterColor + 0.05) / (darkerColor + 0.05);
}

describe('LoginPage styles', () => {
  it('uses an AA-compliant muted color for login description text on dark background', () => {
    const loginPageCss = readFileSync(resolve(__dirname, './LoginPage.css'), 'utf8');
    const sharedStylesCss = readFileSync(resolve(__dirname, '../index.css'), 'utf8');
    const loginDescriptionRule = loginPageCss.match(/\.login-description\s*\{([^}]*)\}/);
    const loginPageRule = sharedStylesCss.match(/\.login-page\s*\{([^}]*)\}/);
    const descriptionColor = loginDescriptionRule?.[1].match(/color:\s*(#[0-9a-f]{3,6})\b/i)?.[1];
    const pageBackground = loginPageRule?.[1].match(/background:\s*(#[0-9a-f]{3,6})\b/i)?.[1];

    expect(loginDescriptionRule?.[1]).toMatch(/color:\s*#888888\b/i);
    expect(descriptionColor).toBeDefined();
    expect(pageBackground).toBeDefined();

    if (!descriptionColor || !pageBackground) {
      throw new Error('Expected login description color and login page background to be defined');
    }

    expect(getContrastRatio(descriptionColor, pageBackground)).toBeGreaterThanOrEqual(4.5);
  });
});
