import { Request, Response, NextFunction } from 'express';
import { Op, Transaction } from 'sequelize';
import sequelize from '../config/database';
import Student from '../models/Student';
import User from '../models/User';
import Admission from '../models/Admission';
import Department from '../models/Department';
import PromotionBatch from '../models/PromotionBatch';
import StudentPromotionHistory from '../models/StudentPromotionHistory';
import admissionService from '../services/admission.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

/** GET /api/admin/promotion/filters */
export const getPromotionFilters = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const departments = await Department.findAll({
      attributes: ['id', 'name', 'code'],
      order: [['name', 'ASC']]
    });

    const academicYears: string[] = [
      '2024-2025',
      '2025-2026',
      '2026-2027',
      '2027-2028',
      '2028-2029',
      '2029-2030',
      '2030-2031',
      '2031-2032'
    ];

    return res.status(200).json({
      success: true,
      data: {
        departments,
        academicYears,
        semesters: [1, 2, 3, 4, 5, 6, 7, 8]
      }
    });
  } catch (err) {
    return next(err);
  }
};

/** GET /api/admin/promotion/students */
export const getPromotionStudents = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const {
      semester,
      departmentId,
      admissionType,
      academicYear,
      search,
      page = '1',
      limit = '10'
    } = req.query;

    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.max(1, parseInt(limit as string) || 10);
    const offset = (p - 1) * l;

    const studentWhere: any = {};
    if (semester && semester !== 'All') {
      studentWhere.semester = Number(semester);
    }
    if (departmentId && departmentId !== 'All') {
      studentWhere.departmentId = departmentId;
    }
    if (admissionType && admissionType !== 'All') {
      studentWhere.admissionType = admissionType;
    }
    if (academicYear && academicYear !== 'All') {
      studentWhere.currentAcademicYear = academicYear;
    }

    const userWhere: any = {};
    if (search) {
      userWhere[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
      // Also allow searching USN via studentWhere if search contains letters/numbers
      studentWhere[Op.or] = [
        { usn: { [Op.iLike]: `%${search}%` } },
        { enrollmentNumber: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Must be ENROLLED
    const admissionWhere = {
      applicationStatus: 'ENROLLED'
    };

    const { count, rows: students } = await Student.findAndCountAll({
      where: studentWhere,
      include: [
        {
          model: User,
          as: 'user',
          where: Object.keys(userWhere).length > 0 ? userWhere : undefined,
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: Admission,
          as: 'admission',
          where: admissionWhere,
          attributes: ['id', 'applicationStatus', 'applicationNumber']
        },
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code']
        }
      ],
      order: [['usn', 'ASC']],
      limit: l,
      offset,
      distinct: true
    });

    return res.status(200).json({
      success: true,
      data: {
        students,
        total: count,
        page: p,
        limit: l,
        totalPages: Math.ceil(count / l)
      }
    });
  } catch (err) {
    return next(err);
  }
};

/** POST /api/admin/promotion/preview */
export const previewPromotion = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const {
      studentIds,
      currentAcademicYear,
      currentSemester,
      fromSemester,
      promotionAcademicYear,
      targetSemester,
      toSemester
    } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'Please select at least one student.' });
    }

    const fromSem = Number(currentSemester ?? fromSemester);
    const toSem = Number(targetSemester ?? toSemester);
    const curYear = currentAcademicYear || null;
    const promYear = promotionAcademicYear || curYear || '2026-2027';

    if (isNaN(fromSem) || isNaN(toSem)) {
      return res.status(400).json({ error: 'Invalid semester selection.' });
    }

    const isTargetValid = toSem === fromSem + 1 || (fromSem === 3 && toSem === 5) || (fromSem === 5 && toSem === 7);
    if (!isTargetValid) {
      return res.status(400).json({ error: `Invalid target semester for promotion.` });
    }

    const students = await Student.findAll({
      where: { id: studentIds },
      include: [
        { model: User, as: 'user', attributes: ['firstName', 'lastName', 'email'] },
        { model: Admission, as: 'admission', attributes: ['applicationStatus'] }
      ]
    });

    const eligibleList: any[] = [];
    const skippedList: any[] = [];

    studentIds.forEach(id => {
      const student = students.find(s => s.id === id);
      if (!student) {
        skippedList.push({ id, name: 'Unknown', reason: 'Student profile not found' });
        return;
      }

      const name = `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.trim() || student.usn || 'Student';

      if (curYear && curYear !== 'All' && student.currentAcademicYear && student.currentAcademicYear !== curYear) {
        skippedList.push({
          id,
          name,
          usn: student.usn,
          reason: `Current academic year mismatch. Expected ${curYear}, found ${student.currentAcademicYear}`
        });
        return;
      }

      if (student.semester !== fromSem) {
        skippedList.push({
          id,
          name,
          usn: student.usn,
          reason: `Current semester mismatch. Expected ${fromSem}, found ${student.semester}`
        });
        return;
      }

      if (!student.admission || student.admission.applicationStatus !== 'ENROLLED') {
        skippedList.push({
          id,
          name,
          usn: student.usn,
          reason: `Student admission status is not ENROLLED (found ${student.admission?.applicationStatus || 'N/A'})`
        });
        return;
      }

      eligibleList.push({
        id,
        name,
        usn: student.usn,
        currentSemester: student.semester,
        targetSemester: toSem,
        currentAcademicYear: student.currentAcademicYear,
        promotionAcademicYear: promYear
      });
    });

    return res.status(200).json({
      success: true,
      data: {
        eligibleCount: eligibleList.length,
        skippedCount: skippedList.length,
        eligible: eligibleList,
        skipped: skippedList,
        currentAcademicYear: curYear,
        currentSemester: fromSem,
        promotionAcademicYear: promYear,
        targetSemester: toSem
      }
    });
  } catch (err) {
    return next(err);
  }
};

/** POST /api/admin/promotion/bulk */
export const bulkPromoteStudents = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<any> => {
  let transaction: Transaction | null = null;
  try {
    const {
      studentIds,
      currentAcademicYear,
      currentSemester,
      fromSemester,
      promotionAcademicYear,
      academicYear,
      targetSemester,
      toSemester,
      remarks
    } = req.body;
    const operatorId = req.user!.id;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ error: 'Please select at least one student.' });
    }

    const fromSem = Number(currentSemester ?? fromSemester);
    const toSem = Number(targetSemester ?? toSemester);
    const curYear = currentAcademicYear || null;
    const promYear = promotionAcademicYear || academicYear || curYear || '2026-2027';

    if (isNaN(fromSem) || isNaN(toSem)) {
      return res.status(400).json({ error: 'Invalid semester selection.' });
    }

    const isTargetValid = toSem === fromSem + 1 || (fromSem === 3 && toSem === 5) || (fromSem === 5 && toSem === 7);
    if (!isTargetValid) {
      return res.status(400).json({ error: `Invalid target semester for promotion.` });
    }

    // Step 1: Pre-fetch outside transaction to isolate valid records
    const students = await Student.findAll({
      where: { id: studentIds },
      include: [
        { model: User, as: 'user', attributes: ['firstName', 'lastName'] },
        { model: Admission, as: 'admission', attributes: ['applicationStatus'] }
      ]
    });

    const validIds: string[] = [];
    const skippedList: any[] = [];

    studentIds.forEach(id => {
      const student = students.find(s => s.id === id);
      if (!student) {
        skippedList.push({ id, name: 'Unknown', reason: 'Student profile not found' });
        return;
      }

      const name = `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.trim() || student.usn || 'Student';

      if (curYear && curYear !== 'All' && student.currentAcademicYear && student.currentAcademicYear !== curYear) {
        skippedList.push({
          id,
          name,
          usn: student.usn,
          reason: `Current academic year mismatch. Expected ${curYear}, found ${student.currentAcademicYear}`
        });
        return;
      }

      if (student.semester !== fromSem) {
        skippedList.push({
          id,
          name,
          usn: student.usn,
          reason: `Current semester mismatch. Expected ${fromSem}, found ${student.semester}`
        });
        return;
      }

      if (!student.admission || student.admission.applicationStatus !== 'ENROLLED') {
        skippedList.push({
          id,
          name,
          usn: student.usn,
          reason: `Student admission status is not ENROLLED`
        });
        return;
      }

      validIds.push(id);
    });

    if (validIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No eligible students found to promote.',
        data: {
          promotedCount: 0,
          skippedCount: skippedList.length,
          skipped: skippedList
        }
      });
    }

    // Step 2: Open SQL transaction for valid records
    transaction = await sequelize.transaction();

    // Re-fetch and lock for update to protect against concurrency
    const lockedStudents = await Student.findAll({
      where: { id: validIds },
      include: [
        { model: Admission, as: 'admission', required: true }
      ],
      lock: true,
      transaction
    });

    const finalPromoteIds: string[] = [];
    for (const student of lockedStudents) {
      const name = student.usn || student.id;
      // Re-verify after locking
      if (curYear && curYear !== 'All' && student.currentAcademicYear && student.currentAcademicYear !== curYear) {
        skippedList.push({
          id: student.id,
          name,
          usn: student.usn,
          reason: 'Student current academic year changed concurrently'
        });
        continue;
      }

      if (student.semester !== fromSem) {
        skippedList.push({
          id: student.id,
          name,
          usn: student.usn,
          reason: 'Student was skipped because their semester changed concurrently'
        });
        continue;
      }

      if (!student.admission || student.admission.applicationStatus !== 'ENROLLED') {
        skippedList.push({
          id: student.id,
          name,
          usn: student.usn,
          reason: 'Student was skipped because their admission is no longer ENROLLED'
        });
        continue;
      }

      finalPromoteIds.push(student.id);
    }

    if (finalPromoteIds.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'All selected students skipped due to concurrent updates.',
        data: {
          promotedCount: 0,
          skippedCount: skippedList.length,
          skipped: skippedList
        }
      });
    }

    // Create Promotion Batch with manual promotionAcademicYear
    const batch = await PromotionBatch.create({
      academicYear: promYear,
      fromSemester: fromSem,
      toSemester: toSem,
      promotedBy: operatorId,
      studentCount: finalPromoteIds.length,
      remarks: remarks || `Bulk Promotion of ${finalPromoteIds.length} students to ${promYear} (${toSem}th Sem)`
    }, { transaction });

    // Update students & insert history
    for (const student of lockedStudents) {
      if (!finalPromoteIds.includes(student.id)) continue;

      await student.update({
        semester: toSem,
        currentAcademicYear: promYear,
        lastPromotedAt: new Date(),
        lastPromotedBy: operatorId
      }, { transaction });

      await StudentPromotionHistory.create({
        studentId: student.id,
        fromSemester: fromSem,
        toSemester: toSem,
        academicYear: promYear,
        promotedBy: operatorId,
        remarks: remarks || null,
        promotionBatchId: batch.id,
        source: 'ADMIN_BULK'
      }, { transaction });

      if (student.userId) {
        await admissionService.invalidateCache(student.userId).catch(() => {});
      }
    }

    await transaction.commit();

    return res.status(200).json({
      success: true,
      message: `${finalPromoteIds.length} students promoted successfully from ${fromSem}th Sem (${curYear || 'current'}) to ${toSem}th Sem (${promYear}).`,
      data: {
        batchId: batch.id,
        promotedCount: finalPromoteIds.length,
        skippedCount: skippedList.length,
        skipped: skippedList,
        currentAcademicYear: curYear,
        currentSemester: fromSem,
        promotionAcademicYear: promYear,
        targetSemester: toSem
      }
    });
  } catch (err) {
    if (transaction) {
      await transaction.rollback();
    }
    return next(err);
  }
};

/** GET /api/admin/promotion/history */
export const getPromotionHistory = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { studentId, page = '1', limit = '10' } = req.query;

    const p = Math.max(1, parseInt(page as string) || 1);
    const l = Math.max(1, parseInt(limit as string) || 10);
    const offset = (p - 1) * l;

    const whereClause: any = {};
    if (studentId) {
      whereClause.studentId = studentId;
    }

    const { count, rows: history } = await StudentPromotionHistory.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'usn'],
          include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'] }]
        },
        {
          model: User,
          as: 'operator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        },
        {
          model: PromotionBatch,
          as: 'batch',
          attributes: ['id', 'remarks']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: l,
      offset
    });

    return res.status(200).json({
      success: true,
      data: {
        history,
        total: count,
        page: p,
        limit: l,
        totalPages: Math.ceil(count / l)
      }
    });
  } catch (err) {
    return next(err);
  }
};

/** GET /api/admin/promotion/batches/:id */
export const getPromotionBatchDetails = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  try {
    const { id } = req.params;

    const batch = await PromotionBatch.findByPk(id, {
      include: [
        {
          model: User,
          as: 'operator',
          attributes: ['id', 'firstName', 'lastName', 'email']
        }
      ]
    });

    if (!batch) {
      return res.status(404).json({ error: 'Promotion batch not found.' });
    }

    const histories = await StudentPromotionHistory.findAll({
      where: { promotionBatchId: id },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['id', 'usn'],
          include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'] }]
        }
      ]
    });

    return res.status(200).json({
      success: true,
      data: {
        batch,
        records: histories
      }
    });
  } catch (err) {
    return next(err);
  }
};
