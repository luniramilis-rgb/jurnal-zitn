import { describe, expect, it } from 'vitest';

import { ISSUE_ERROR_KEYS, issueErrorKey } from './issueCopy';

/**
 * ZITN-TECH-025 review: the segment/invariant codes the pipeline emits into the preview
 * `errors[]` used to have no `import.err.*` mapping, so blocking errors rendered the
 * generic "cannot be explained yet" copy. This locks the mapping so that regression
 * cannot come back silently.
 */
describe('issueCopy — kode galat segmen & invarian punya salinan ID', () => {
  it('memetakan setiap kode ke kunci kamusnya, bukan fallback', () => {
    const codes = {
      SEGMENT_CROSSES_FLAT: 'import.err.segmentCrossesFlat',
      SEGMENT_TYPE_CONTRADICTION: 'import.err.segmentTypeContradiction',
      SEGMENT_SIDE_CONTRADICTION: 'import.err.segmentSideContradiction',
      EXIT_BEFORE_ENTRY: 'import.err.exitBeforeEntry',
      EXIT_EXCEEDS_ENTRY: 'import.err.exitExceedsEntry',
      SEGMENT_NOT_RECONCILED: 'import.err.segmentNotReconciled',
      CLOSE_BEFORE_OPEN: 'import.err.closeBeforeOpen',
    } as const;

    for (const [code, key] of Object.entries(codes)) {
      expect(ISSUE_ERROR_KEYS[code], code).toBe(key);
      expect(issueErrorKey(code), code).not.toBe('import.err.unknown');
    }
  });

  it('kode tak dikenal tetap jatuh ke salinan generik', () => {
    expect(issueErrorKey('SOMETHING_NEW')).toBe('import.err.unknown');
    expect(issueErrorKey(undefined)).toBe('import.err.unknown');
  });
});
