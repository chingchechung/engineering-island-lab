// Native bridge adapted from Engineering City Lab v1.0.0 (38b1dfdd).
// Legacy algorithms are preserved; only S01–S15 limits differ. See
// docs/ASSIGNMENT_COMPATIBILITY.md for provenance and explicit reuse permission.
import './legacy-assignment/assignment-rules.js';
import * as legacy from './legacy-assignment/assignment-validator.js';

// Vite production wraps UMD as CommonJS; native DEV/Node ESM uses its global.
// Keep the same dual-namespace selection as the pinned City adapter.
const validator = legacy.default ?? globalThis.AssignmentValidator;
export const {
  normalizeUnit,
  normalizeManifest,
  validateUnit,
  validateUnitV1,
  validateUnitV2,
  validateManifest,
  acceptsAnswer,
} = validator;

export function validateOrThrow(issues, file) {
  if (!issues.length) return;
  const error = new Error(
    `${file} failed validation: ` +
      issues
        .slice(0, 3)
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join('; '),
  );
  error.issues = issues; // Preserve every original issue, not just the short message.
  throw error;
}
