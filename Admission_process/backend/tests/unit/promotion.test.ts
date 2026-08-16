import Student from '../../src/models/Student';
import PromotionBatch from '../../src/models/PromotionBatch';
import StudentPromotionHistory from '../../src/models/StudentPromotionHistory';

jest.mock('../../src/models/Student', () => {
  return {
    __esModule: true,
    default: {
      findAll: jest.fn(),
      findByPk: jest.fn(),
      update: jest.fn()
    }
  };
});

jest.mock('../../src/models/PromotionBatch', () => {
  return {
    __esModule: true,
    default: {
      create: jest.fn()
    }
  };
});

jest.mock('../../src/models/StudentPromotionHistory', () => {
  return {
    __esModule: true,
    default: {
      create: jest.fn()
    }
  };
});

describe('Academic Promotion System Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Bulk Promotion Verification Logic', () => {
    it('should identify eligible candidates and correctly skip candidates with semester mismatch', async () => {
      const mockStudents = [
        {
          id: 'student-1',
          usn: '2JC23CS001',
          semester: 2,
          currentAcademicYear: '2026-2027',
          user: { firstName: 'Alice', lastName: 'Smith' },
          admission: { applicationStatus: 'ENROLLED' }
        },
        {
          id: 'student-2',
          usn: '2JC23CS002',
          semester: 3,
          currentAcademicYear: '2026-2027',
          user: { firstName: 'Bob', lastName: 'Jones' },
          admission: { applicationStatus: 'ENROLLED' }
        }
      ];

      const fromSemester = 2;
      const eligible: any[] = [];
      const skipped: any[] = [];

      for (const student of mockStudents) {
        if (student.semester !== fromSemester) {
          skipped.push({
            id: student.id,
            usn: student.usn,
            name: `${student.user.firstName} ${student.user.lastName}`,
            reason: `Student current semester is ${student.semester}th Sem, requested promotion is from ${fromSemester}th Sem.`
          });
        } else {
          eligible.push({
            id: student.id,
            usn: student.usn,
            name: `${student.user.firstName} ${student.user.lastName}`
          });
        }
      }

      expect(eligible).toHaveLength(1);
      expect(eligible[0].id).toBe('student-1');
      expect(skipped).toHaveLength(1);
      expect(skipped[0].id).toBe('student-2');
      expect(skipped[0].reason).toContain('requested promotion is from 2th Sem');
    });

    it('should mock bulk promotion database update execution', async () => {
      const mockPromotionBatch = {
        id: 'batch-abc',
        academicYear: '2026-2027',
        fromSemester: 2,
        toSemester: 3,
        studentCount: 1,
        promotedBy: 'admin-1',
        remarks: 'Test batch'
      };

      const mockHistory = {
        id: 'history-1',
        promotionBatchId: 'batch-abc',
        studentId: 'student-1',
        fromSemester: 2,
        toSemester: 3,
        academicYear: '2026-2027',
        promotedBy: 'admin-1',
        source: 'ADMIN_BULK'
      };

      (PromotionBatch.create as any).mockResolvedValue(mockPromotionBatch);
      (StudentPromotionHistory.create as any).mockResolvedValue(mockHistory);

      const batch = await PromotionBatch.create({
        academicYear: '2026-2027',
        fromSemester: 2,
        toSemester: 3,
        studentCount: 1,
        promotedBy: 'admin-1',
        remarks: 'Test batch'
      } as any);

      const history = await StudentPromotionHistory.create({
        promotionBatchId: batch.id,
        studentId: 'student-1',
        fromSemester: 2,
        toSemester: 3,
        academicYear: '2026-2027',
        promotedBy: 'admin-1',
        source: 'ADMIN_BULK'
      } as any);

      expect(batch).toBeDefined();
      expect(batch.id).toBe('batch-abc');
      expect((history as any).promotionBatchId).toBe('batch-abc');
    });
  });
});
