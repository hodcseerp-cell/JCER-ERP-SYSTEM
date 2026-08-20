/**
 * semesterDocumentRules.js
 * Centralized semester marks card upload rules for provisional admission.
 *
 * FRESH students:
 *   3rd sem application  → previousSemesters: [],         requiredNow: [1, 2]
 *   5th sem application  → previousSemesters: [1, 2],     requiredNow: [3, 4]
 *   7th sem application  → previousSemesters: [1,2,3,4],  requiredNow: [5, 6]
 *
 * LATERAL students (initial sem = 3):
 *   5th sem application  → previousSemesters: [],         requiredNow: [3, 4]
 *   7th sem application  → previousSemesters: [3, 4],     requiredNow: [5, 6]
 *   (3rd sem is their initial entry, not eligible for provisional)
 */

const SEMESTER_RULES = {
  FRESH: {
    3: { previousSemesters: [], requiredNow: [1, 2] },
    5: { previousSemesters: [1, 2], requiredNow: [3, 4] },
    7: { previousSemesters: [1, 2, 3, 4], requiredNow: [5, 6] },
  },
  LATERAL: {
    3: { previousSemesters: [], requiredNow: [] }, // Not eligible
    5: { previousSemesters: [], requiredNow: [3, 4] },
    7: { previousSemesters: [3, 4], requiredNow: [5, 6] },
  },
};

/**
 * Get the semester rules for a given student admission type and target semester.
 * @param {boolean} isLateral - true if LATERAL student
 * @param {number} targetSemester - 3, 5, or 7
 * @returns {{ previousSemesters: number[], requiredNow: number[] }}
 */
export function getSemesterRules(isLateral, targetSemester) {
  const type = isLateral ? 'LATERAL' : 'FRESH';
  const sem = Number(targetSemester);
  return (
    (SEMESTER_RULES[type] && SEMESTER_RULES[type][sem]) ||
    { previousSemesters: [], requiredNow: [] }
  );
}

/**
 * Get the list of semester numbers that were uploaded in previous provisional applications.
 */
export function getPreviousSemesters(isLateral, targetSemester) {
  return getSemesterRules(isLateral, targetSemester).previousSemesters;
}

/**
 * Get the list of semester numbers that must be uploaded in the current application.
 */
export function getRequiredNowSemesters(isLateral, targetSemester) {
  return getSemesterRules(isLateral, targetSemester).requiredNow;
}

/**
 * Get the complete list of all semester numbers expected for this target (prev + now combined).
 */
export function getAllSemesters(isLateral, targetSemester) {
  const rules = getSemesterRules(isLateral, targetSemester);
  return [...rules.previousSemesters, ...rules.requiredNow];
}
