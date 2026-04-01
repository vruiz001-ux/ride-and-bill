// ─── Vendor Detection ─────────────────────────────────────────────────────────
// Unified vendor detection for uploaded files and email content.

import type { Provider } from '@/lib/types';

interface DetectionResult {
  provider: Provider | null;
  confidence: number;
}

const VENDOR_PATTERNS: { provider: Provider; patterns: RegExp[] }[] = [
  {
    provider: 'uber',
    patterns: [
      /uber/i,
      /trip\s+with\s+uber/i,
      /uber\s+receipt/i,
      /uber\.com/i,
      /uber\s+b\.?v\.?/i,
      /uber\s+technologies/i,
    ],
  },
  {
    provider: 'bolt',
    patterns: [
      /bolt/i,
      /bolt\s+receipt/i,
      /bolt\.eu/i,
      /bolt\s+technology/i,
      /ride\s+with\s+bolt/i,
    ],
  },
  {
    provider: 'waymo',
    patterns: [
      /waymo/i,
      /waymo\.com/i,
      /waymo\s+one/i,
    ],
  },
  {
    provider: 'careem',
    patterns: [
      /careem/i,
      /careem\.com/i,
    ],
  },
  {
    provider: 'freenow',
    patterns: [
      /free\s*now/i,
      /freenow/i,
      /mytaxi/i,
    ],
  },
];

export function detectVendor(content: string): DetectionResult {
  if (!content || content.trim().length === 0) {
    return { provider: null, confidence: 0 };
  }

  let bestMatch: DetectionResult = { provider: null, confidence: 0 };

  for (const vendor of VENDOR_PATTERNS) {
    let matchCount = 0;
    for (const pattern of vendor.patterns) {
      if (pattern.test(content)) {
        matchCount++;
      }
    }
    if (matchCount > 0) {
      const confidence = Math.min(0.3 + matchCount * 0.2, 0.9);
      if (confidence > bestMatch.confidence) {
        bestMatch = { provider: vendor.provider, confidence };
      }
    }
  }

  return bestMatch;
}

export function detectVendorFromFilename(filename: string): DetectionResult {
  const lower = filename.toLowerCase();
  for (const vendor of VENDOR_PATTERNS) {
    if (lower.includes(vendor.provider)) {
      return { provider: vendor.provider, confidence: 0.5 };
    }
  }
  if (lower.includes('free') && lower.includes('now')) {
    return { provider: 'freenow', confidence: 0.5 };
  }
  return { provider: null, confidence: 0 };
}
