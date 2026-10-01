import { Op, Transaction } from 'sequelize';
import sequelize from '../config/database';
import Section from '../models/Section';
import Student from '../models/Student';
import StudentAcademicEnrollment from '../models/StudentAcademicEnrollment';
import Department from '../models/Department';
import User from '../models/User';
import Admission from '../models/Admission';
import AdmissionPersonalDetail from '../models/AdmissionPersonalDetail';
import AuditLog from '../models/AuditLog';
import { HttpException } from '../utils/error.util';
import logger from '../utils/logger.util';

export interface StudentAllocationInput {
  studentId: string;
  rollNumber?: string;
}

export class SectionAllocationService {
  /**
   * Helper to safely extract clean section code: 'Section A' -> 'A'
   * Guarantees that internal UUIDs are NEVER returned as section code/name.
   */
  public static getCleanSectionCode(nameOrCode: string | null | undefined): string {
    if (!nameOrCode || typeof nameOrCode !== 'string') return '—';
    const trimmed = nameOrCode.trim();
    if (!trimmed) return '—';

    // If string matches UUID pattern, reject it immediately
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
      return '—';
    }

    const cleaned = trimmed
      .replace(/^(Section|Sec|Division|Div)\s*/i, '')
      .trim()
      .toUpperCase();

    return cleaned || trimmed;
  }

  /**
   * Validates that an ID is a valid UUID format before sending to PostgreSQL.
   * Prevents PostgreSQL 'invalid input syntax for type uuid' errors.
   */
  public static validateUuid(id: string | null | undefined, paramName = 'sectionId'): string {
    if (!id || typeof id !== 'string') {
      throw new HttpException('Invalid section identifier.', 400, 'INVALID_SECTION_ID');
    }
    const trimmed = id.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
    if (!isUuid) {
      throw new HttpException('Invalid section identifier.', 400, 'INVALID_SECTION_ID');
    }
    return trimmed;
  }

  /**
   * Resolves a student's active section allocation.
   * Single authoritative logic across the entire system.
   */
  public static resolveStudentSection(
    student: any,
    siblingSections: Section[]
  ): {
    isAllocated: boolean;
    sectionId: string | null;
    sectionCode: string;
    sectionName: string;
  } {
    const enc = student.academicEnrollments?.[0];
    const encSecId = enc?.sectionId ? String(enc.sectionId).trim() : null;
    const studentSecId = student.sectionId ? String(student.sectionId).trim() : null;
    const studentSecName = student.section ? String(student.section).trim() : null;

    // Helper to test if a string matches section by id or name
    const matchSection = (candidate: string | null): Section | undefined => {
      if (!candidate) return undefined;
      const candClean = SectionAllocationService.getCleanSectionCode(candidate);
      return siblingSections.find((s) => {
        if (s.id.toLowerCase() === candidate.toLowerCase()) return true;
        const sClean = SectionAllocationService.getCleanSectionCode(s.name);
        if (s.name.toLowerCase() === candidate.toLowerCase()) return true;
        if (candClean !== '—' && sClean !== '—' && sClean === candClean) return true;
        return false;
      });
    };

    // 1. Check authoritative enrollment sectionId
    const foundByEnc = matchSection(encSecId);
    if (foundByEnc) {
      const code = SectionAllocationService.getCleanSectionCode(foundByEnc.name);
      return {
        isAllocated: true,
        sectionId: foundByEnc.id,
        sectionCode: code,
        sectionName: foundByEnc.name,
      };
    }

    // 2. Check student.sectionId
    const foundBySecId = matchSection(studentSecId);
    if (foundBySecId) {
      const code = SectionAllocationService.getCleanSectionCode(foundBySecId.name);
      return {
        isAllocated: true,
        sectionId: foundBySecId.id,
        sectionCode: code,
        sectionName: foundBySecId.name,
      };
    }

    // 3. Check student.section (string name)
    const foundByName = matchSection(studentSecName);
    if (foundByName) {
      const code = SectionAllocationService.getCleanSectionCode(foundByName.name);
      return {
        isAllocated: true,
        sectionId: foundByName.id,
        sectionCode: code,
        sectionName: foundByName.name,
      };
    }

    return {
      isAllocated: false,
      sectionId: null,
      sectionCode: '—',
      sectionName: 'Unallocated',
    };
  }

  /**
   * GET /sections
   * Fetch all sections for department, semester, academicYear with capacity metrics.
   */
  public async getSections(
    departmentId: string,
    semester?: number | string,
    academicYear?: string
  ): Promise<any[]> {
    const where: any = {
      departmentId,
      status: 'ACTIVE',
    };

    if (semester && semester !== 'ALL') {
      const semNum = Number(semester);
      if (!isNaN(semNum) && semNum >= 1 && semNum <= 8) {
        where.semester = semNum;
      }
    }

    if (academicYear && academicYear !== 'ALL') {
      const startYear = String(academicYear).split(/[-–]/)[0].trim();
      where.academicYear = { [Op.iLike]: `%${startYear}%` };
    }

    let sections = await Section.findAll({
      where,
      order: [['semester', 'ASC'], ['name', 'ASC']],
    });

    if ((!sections || sections.length === 0) && where.academicYear) {
      delete where.academicYear;
      sections = await Section.findAll({
        where,
        order: [['semester', 'ASC'], ['name', 'ASC']],
      });
    }

    if (!sections || sections.length === 0) {
      return [];
    }

    // Calculate live allocation counts per section
    const results = await Promise.all(
      sections.map(async (sec) => {
        const cleanCode = SectionAllocationService.getCleanSectionCode(sec.name);
        const studentCount = await Student.count({
          where: {
            departmentId,
            semester: sec.semester,
            [Op.or]: [
              { sectionId: sec.id },
              { section: sec.name },
              { section: cleanCode },
              { section: `Section ${cleanCode}` },
            ],
          },
        });

        const capacity = sec.capacity || 15;
        const availableCapacity = Math.max(0, capacity - studentCount);
        const fillPercentage =
          capacity > 0 ? Math.round((studentCount / capacity) * 1000) / 10 : 0;

        return {
          id: sec.id,
          code: cleanCode,
          sectionName: cleanCode,
          name: sec.name,
          departmentId: sec.departmentId,
          semester: sec.semester,
          academicYear: sec.academicYear,
          capacity,
          classroom: sec.classroom || null,
          description: sec.description || null,
          status: sec.status,
          studentCount,
          allocatedCount: studentCount,
          availableCapacity,
          fillPercentage,
          createdAt: sec.createdAt,
          updatedAt: sec.updatedAt,
        };
      })
    );

    return results;
  }

  /**
   * GET /sections/:sectionId
   * Retrieve a single section by UUID with full capacity metrics.
   */
  public async getSectionById(sectionId: string, departmentId: string): Promise<any> {
    const validId = SectionAllocationService.validateUuid(sectionId, 'sectionId');

    const section = await Section.findByPk(validId);
    if (!section) {
      throw new HttpException('Section not found.', 404, 'SECTION_NOT_FOUND');
    }

    if (section.departmentId !== departmentId) {
      throw new HttpException('You do not have access to this section.', 403, 'SECTION_ACCESS_DENIED');
    }

    const cleanCode = SectionAllocationService.getCleanSectionCode(section.name);

    const studentCount = await Student.count({
      where: {
        departmentId,
        semester: section.semester,
        [Op.or]: [
          { sectionId: section.id },
          { section: section.name },
          { section: cleanCode },
          { section: `Section ${cleanCode}` },
        ],
      },
    });

    const capacity = section.capacity || 15;
    const availableCapacity = Math.max(0, capacity - studentCount);
    const fillPercentage =
      capacity > 0 ? Math.round((studentCount / capacity) * 1000) / 10 : 0;

    return {
      id: section.id,
      code: cleanCode,
      sectionName: cleanCode,
      name: section.name,
      departmentId: section.departmentId,
      semester: section.semester,
      academicYear: section.academicYear,
      capacity,
      classroom: section.classroom || null,
      description: section.description || null,
      status: section.status,
      studentCount,
      allocatedCount: studentCount,
      availableCapacity,
      fillPercentage,
      createdAt: section.createdAt,
      updatedAt: section.updatedAt,
    };
  }

  /**
   * GET /sections/:sectionId/students
   * Retrieve all students currently allocated to this section.
   */
  public async getSectionStudents(
    sectionId: string,
    departmentId: string
  ): Promise<{ section: any; students: any[] }> {
    const sectionMeta = await this.getSectionById(sectionId, departmentId);

    const students = await Student.findAll({
      where: {
        departmentId,
        semester: sectionMeta.semester,
        [Op.or]: [
          { sectionId: sectionMeta.id },
          { section: sectionMeta.name },
          { section: sectionMeta.code },
          { section: `Section ${sectionMeta.code}` },
        ],
      },
      include: [
        {
          model: StudentAcademicEnrollment,
          as: 'academicEnrollments',
          where: { status: 'ACTIVE' },
          required: false,
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'status'],
          required: false,
        },
        {
          model: Admission,
          as: 'admission',
          required: false,
          include: [
            {
              model: AdmissionPersonalDetail,
              as: 'studentpersonaldetails',
              required: false,
            },
          ],
        },
      ],
      order: [
        ['rollNumber', 'ASC'],
        ['usn', 'ASC'],
        ['enrollmentNumber', 'ASC'],
      ],
    });

    const mappedStudents = students.map((s: any) => {
      const enc = s.academicEnrollments?.[0];
      const pd = s.admission?.studentpersonaldetails;
      const fullName = [
        pd?.firstName || s.user?.firstName || '',
        pd?.middleName || '',
        pd?.lastName || s.user?.lastName || '',
      ].filter(Boolean).join(' ').trim() || s.name || 'Student';

      const roll = sectionMeta.semester === 1 ? (enc?.rollNumber || s.rollNumber || null) : null;

      return {
        id: s.id,
        userId: s.userId,
        usn: s.usn || null,
        enrollmentNumber: s.enrollmentNumber || null,
        rollNumber: roll,
        name: fullName,
        email: s.user?.email || pd?.email || 'N/A',
        phone: pd?.phone || s.user?.phone || 'N/A',
        semester: s.semester,
        sectionId: sectionMeta.id,
        section: {
          id: sectionMeta.id,
          code: sectionMeta.code,
          name: sectionMeta.name,
        },
        currentSectionCode: sectionMeta.code,
        currentSection: sectionMeta.code, // Displays clean 'A', NEVER UUID!
        admissionType: s.admissionType || s.admission?.admissionType || 'REGULAR',
        admissionStatus: s.admission?.applicationStatus || s.admissionStatus || 'ACTIVE',
        gender: s.gender || pd?.gender || null,
        category: pd?.category || null,
      };
    });

    return {
      section: sectionMeta,
      students: mappedStudents,
    };
  }

  /**
   * GET /sections/:sectionId/cohort
   * Authoritative available students logic.
   * Segregates students so students in Section A NEVER appear when allocating Section B.
   */
  public async getAvailableStudents(
    sectionId: string,
    departmentId: string
  ): Promise<{
    section: any;
    stats: any;
    availableStudents: any[];
    students: any[];
    siblingSections: any[];
  }> {
    const sectionMeta = await this.getSectionById(sectionId, departmentId);

    // Fetch all active sibling sections
    const siblingSections = await Section.findAll({
      where: {
        departmentId,
        semester: sectionMeta.semester,
        status: 'ACTIVE',
      },
      order: [['name', 'ASC']],
    });

    // Fetch all students in this department cohort
    const allStudents = await Student.findAll({
      where: {
        departmentId,
        semester: sectionMeta.semester,
      },
      include: [
        {
          model: StudentAcademicEnrollment,
          as: 'academicEnrollments',
          where: { status: 'ACTIVE' },
          required: false,
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'status'],
          required: false,
        },
        {
          model: Admission,
          as: 'admission',
          required: false,
          include: [
            {
              model: AdmissionPersonalDetail,
              as: 'studentpersonaldetails',
              required: false,
            },
          ],
        },
      ],
      order: [
        ['usn', 'ASC'],
        ['enrollmentNumber', 'ASC'],
      ],
    });

    // Authoritative classification for each student
    const classifiedStudents = allStudents.map((s: any) => {
      const resolved = SectionAllocationService.resolveStudentSection(s, siblingSections);
      const isAllocatedToThisSection = resolved.isAllocated && resolved.sectionId === sectionMeta.id;
      const isAllocatedToOtherSection = resolved.isAllocated && resolved.sectionId !== sectionMeta.id;
      const isUnallocated = !resolved.isAllocated;

      const pd = s.admission?.studentpersonaldetails;
      const fullName = [
        pd?.firstName || s.user?.firstName || '',
        pd?.middleName || '',
        pd?.lastName || s.user?.lastName || '',
      ].filter(Boolean).join(' ').trim() || s.name || 'Student';

      return {
        id: s.id,
        userId: s.userId,
        usn: s.usn || null,
        enrollmentNumber: s.enrollmentNumber || null,
        rollNumber: s.rollNumber || null,
        name: fullName,
        email: s.user?.email || pd?.email || 'N/A',
        phone: pd?.phone || s.user?.phone || 'N/A',
        semester: s.semester,
        admissionType: s.admissionType || s.admission?.admissionType || 'REGULAR',
        admissionStatus: s.admission?.applicationStatus || s.admissionStatus || 'ACTIVE',
        gender: s.gender || pd?.gender || null,
        category: pd?.category || null,
        isAllocated: resolved.isAllocated,
        isUnallocated,
        isAllocatedToThisSection,
        isAllocatedToOtherSection,
        currentSectionId: resolved.sectionId,
        currentSectionCode: resolved.sectionCode,
        currentSection: resolved.sectionCode, // Clean code e.g. "A" or "—", NEVER UUID!
        section: resolved.isAllocated
          ? {
              id: resolved.sectionId!,
              code: resolved.sectionCode,
              name: resolved.sectionName,
            }
          : null,
      };
    });

    const unallocatedList = classifiedStudents.filter((s) => s.isUnallocated);
    const thisSectionList = classifiedStudents.filter((s) => s.isAllocatedToThisSection);
    const otherSectionsList = classifiedStudents.filter((s) => s.isAllocatedToOtherSection);

    const sectionCapacity = sectionMeta.capacity || 15;
    const remainingCapacity = Math.max(0, sectionCapacity - thisSectionList.length);
    const fillPercentage =
      sectionCapacity > 0 ? Math.round((thisSectionList.length / sectionCapacity) * 1000) / 10 : 0;

    const stats = {
      totalDepartmentStudents: classifiedStudents.length,
      unallocatedStudents: unallocatedList.length,
      thisSectionAllocated: thisSectionList.length,
      otherSectionsAllocated: otherSectionsList.length,
      sectionCapacity,
      remainingCapacity,
      fillPercentage,
    };

    const cleanSiblings = siblingSections.map((s) => ({
      id: s.id,
      name: s.name,
      code: SectionAllocationService.getCleanSectionCode(s.name),
      capacity: s.capacity,
      semester: s.semester,
      academicYear: s.academicYear,
    }));

    return {
      section: sectionMeta,
      stats,
      availableStudents: unallocatedList, // Only unallocated students!
      students: classifiedStudents,
      siblingSections: cleanSiblings,
    };
  }

  /**
   * POST /sections/:sectionId/allocate
   * Atomic transactional allocation with strict capacity and duplicate validation.
   */
  public async allocateStudents(
    sectionId: string,
    departmentId: string,
    studentAllocations: StudentAllocationInput[],
    actorUser?: any
  ): Promise<{ success: boolean; message: string; allocatedCount: number }> {
    const validId = SectionAllocationService.validateUuid(sectionId, 'sectionId');

    if (!Array.isArray(studentAllocations) || studentAllocations.length === 0) {
      throw new HttpException('No students selected for allocation.', 400, 'NO_STUDENTS_SELECTED');
    }

    const transaction = await sequelize.transaction();
    try {
      // 1. Lock and validate section
      const section = await Section.findByPk(validId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!section) {
        throw new HttpException('Section not found.', 404, 'SECTION_NOT_FOUND');
      }

      if (section.departmentId !== departmentId) {
        throw new HttpException('You do not have access to this section.', 403, 'SECTION_ACCESS_DENIED');
      }

      const cleanCode = SectionAllocationService.getCleanSectionCode(section.name);

      // 2. Fetch sibling sections to check existing allocations
      const siblingSections = await Section.findAll({
        where: { departmentId, semester: section.semester, status: 'ACTIVE' },
        transaction,
      });

      // 3. Count currently allocated students in this section
      const currentAllocated = await Student.count({
        where: {
          departmentId,
          semester: section.semester,
          [Op.or]: [
            { sectionId: section.id },
            { section: section.name },
            { section: cleanCode },
            { section: `Section ${cleanCode}` },
          ],
        },
        transaction,
      });

      const capacity = section.capacity || 15;
      const remainingCapacity = Math.max(0, capacity - currentAllocated);

      // 4. Validate Capacity Constraint (Requirement 9)
      if (studentAllocations.length > remainingCapacity) {
        throw new HttpException(
          `Section ${cleanCode || section.name} has only ${remainingCapacity} seats remaining. You selected ${studentAllocations.length} students.`,
          400,
          'SECTION_CAPACITY_EXCEEDED'
        );
      }

      const targetStudentIds = studentAllocations.map((a) => a.studentId);

      // 5. Fetch and lock each selected student row
      const students = await Student.findAll({
        where: {
          id: { [Op.in]: targetStudentIds },
        },
        include: [
          {
            model: StudentAcademicEnrollment,
            as: 'academicEnrollments',
            where: { status: 'ACTIVE' },
            required: false,
          },
        ],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (students.length !== targetStudentIds.length) {
        throw new HttpException('One or more selected students could not be found.', 404, 'STUDENT_NOT_FOUND');
      }

      // 6. Validate every student: department, semester, and conflict check
      for (const st of students) {
        if (st.departmentId !== departmentId) {
          throw new HttpException(
            `Student ${st.usn || st.enrollmentNumber || st.id} does not belong to your department.`,
            403,
            'STUDENT_DEPARTMENT_MISMATCH'
          );
        }

        if (st.semester !== section.semester) {
          throw new HttpException(
            `Student ${st.usn || st.enrollmentNumber || st.id} is in Semester ${st.semester}, but section is Semester ${section.semester}.`,
            400,
            'STUDENT_SEMESTER_MISMATCH'
          );
        }

        // DUPLICATE ALLOCATION PREVENTION (Requirement 4 & 8)
        const resolved = SectionAllocationService.resolveStudentSection(st, siblingSections);
        if (resolved.isAllocated) {
          const secDisplay = resolved.sectionCode !== '—' ? `Section ${resolved.sectionCode}` : 'another section';
          throw new HttpException(
            `Student ${st.usn || st.enrollmentNumber || st.id} is already allocated to ${secDisplay}. Re-allocation rejected. Use Move Student to transfer allocated students.`,
            409,
            'ALLOCATION_CONFLICT'
          );
        }
      }

      // 7. Perform atomic dual-table allocation
      const rollMap = new Map(studentAllocations.map((a) => [a.studentId, a.rollNumber]));

      for (const st of students) {
        const explicitRoll = section.semester === 1 ? rollMap.get(st.id) : null;
        const rollToSet =
          section.semester === 1
            ? explicitRoll !== undefined && explicitRoll !== null && String(explicitRoll).trim().length > 0
              ? String(explicitRoll).trim()
              : st.rollNumber
            : null;

        // Synchronize Student table
        await st.update(
          {
            sectionId: section.id,
            section: section.name,
            rollNumber: rollToSet,
          },
          { transaction }
        );

        // Synchronize StudentAcademicEnrollment table
        const [enrollment] = await StudentAcademicEnrollment.findOrCreate({
          where: {
            studentId: st.id,
            departmentId,
            semesterId: section.semester,
            status: 'ACTIVE',
          },
          defaults: {
            studentId: st.id,
            departmentId,
            semesterId: section.semester,
            academicYearId: section.academicYear || '2026-27',
            sectionId: section.id,
            rollNumber: rollToSet,
            status: 'ACTIVE',
          },
          transaction,
        });

        if (enrollment) {
          await enrollment.update(
            {
              sectionId: section.id,
              rollNumber: rollToSet,
            },
            { transaction }
          );
        }
      }

      // 8. Audit Log
      await AuditLog.create(
        {
          userId: actorUser?.id || null,
          action: 'Bulk Allocation',
          ipAddress: '127.0.0.1',
          userAgent: 'HOD Portal',
          details: {
            actor: actorUser?.id,
            role: actorUser?.role,
            departmentId,
            sectionId: section.id,
            sectionName: section.name,
            sectionCode: cleanCode || section.name,
            semester: section.semester,
            academicYear: section.academicYear,
            allocatedCount: studentAllocations.length,
            studentIds: targetStudentIds,
            timestamp: new Date().toISOString(),
          },
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        message: `Successfully allocated ${studentAllocations.length} students to Section ${cleanCode || section.name}.`,
        allocatedCount: studentAllocations.length,
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * PATCH /sections/:sectionId/students/:studentId/move
   * Transactional transfer of student from Section A to Section B (Requirement 10).
   */
  public async moveStudent(
    sourceSectionId: string,
    studentId: string,
    targetSectionId: string,
    departmentId: string,
    newRollNumber?: string,
    actorUser?: any
  ): Promise<{ success: boolean; message: string }> {
    const validSourceId = SectionAllocationService.validateUuid(sourceSectionId, 'sectionId');
    const validTargetId = SectionAllocationService.validateUuid(targetSectionId, 'targetSectionId');

    const transaction = await sequelize.transaction();
    try {
      const sourceSection = await Section.findByPk(validSourceId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      const targetSection = await Section.findByPk(validTargetId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!sourceSection || !targetSection) {
        throw new HttpException('Source or target section not found.', 404, 'SECTION_NOT_FOUND');
      }

      if (sourceSection.departmentId !== departmentId || targetSection.departmentId !== departmentId) {
        throw new HttpException('You do not have access to these sections.', 403, 'SECTION_ACCESS_DENIED');
      }

      if (sourceSection.semester !== targetSection.semester) {
        throw new HttpException('Target section must be in the same semester.', 400, 'SEMESTER_MISMATCH');
      }

      const targetCleanCode = SectionAllocationService.getCleanSectionCode(targetSection.name);

      // Check target section capacity
      const targetAllocated = await Student.count({
        where: {
          departmentId,
          semester: targetSection.semester,
          [Op.or]: [
            { sectionId: targetSection.id },
            { section: targetSection.name },
            { section: targetCleanCode },
          ],
        },
        transaction,
      });

      if (targetAllocated >= targetSection.capacity) {
        throw new HttpException(
          `Target Section ${targetCleanCode} is already at full capacity (${targetSection.capacity}/${targetSection.capacity}).`,
          400,
          'TARGET_SECTION_FULL'
        );
      }

      const student = await Student.findOne({
        where: { id: studentId, departmentId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!student) {
        throw new HttpException('Student not found.', 404, 'STUDENT_NOT_FOUND');
      }

      const rollToSet =
        targetSection.semester === 1
          ? newRollNumber
            ? String(newRollNumber).trim()
            : student.rollNumber
          : null;

      // Update both tables atomically
      await student.update(
        {
          sectionId: targetSection.id,
          section: targetSection.name,
          rollNumber: rollToSet,
        },
        { transaction }
      );

      await StudentAcademicEnrollment.update(
        {
          sectionId: targetSection.id,
          rollNumber: rollToSet,
        },
        {
          where: {
            studentId: student.id,
            departmentId,
            status: 'ACTIVE',
          },
          transaction,
        }
      );

      await AuditLog.create(
        {
          userId: actorUser?.id || null,
          action: 'Student Moved',
          ipAddress: '127.0.0.1',
          userAgent: 'HOD Portal',
          details: {
            actor: actorUser?.id,
            role: actorUser?.role,
            departmentId,
            studentId: student.id,
            fromSectionId: sourceSection.id,
            fromSectionName: sourceSection.name,
            toSectionId: targetSection.id,
            toSectionName: targetSection.name,
            toSectionCode: targetCleanCode,
            timestamp: new Date().toISOString(),
          },
        },
        { transaction }
      );

      await transaction.commit();

      return {
        success: true,
        message: `Student successfully moved to Section ${targetCleanCode}.`,
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * DELETE /sections/:sectionId/students/:studentId
   * Remove student from section -> becomes UNALLOCATED (Requirement 11).
   */
  public async removeStudent(
    sectionId: string,
    studentId: string,
    departmentId: string,
    actorUser?: any
  ): Promise<{ success: boolean; message: string }> {
    const validId = SectionAllocationService.validateUuid(sectionId, 'sectionId');

    const transaction = await sequelize.transaction();
    try {
      const section = await Section.findByPk(validId, { transaction });
      if (!section) {
        throw new HttpException('Section not found.', 404, 'SECTION_NOT_FOUND');
      }
      if (section.departmentId !== departmentId) {
        throw new HttpException('You do not have access to this section.', 403, 'SECTION_ACCESS_DENIED');
      }

      const student = await Student.findOne({
        where: { id: studentId, departmentId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!student) {
        throw new HttpException('Student not found.', 404, 'STUDENT_NOT_FOUND');
      }

      // Remove section allocation on both tables
      await student.update(
        {
          sectionId: null,
          section: null,
          rollNumber: null,
        },
        { transaction }
      );

      await StudentAcademicEnrollment.update(
        {
          sectionId: null,
          rollNumber: null,
        },
        {
          where: {
            studentId: student.id,
            departmentId,
            status: 'ACTIVE',
          },
          transaction,
        }
      );

      await AuditLog.create(
        {
          userId: actorUser?.id || null,
          action: 'Student Removed from Section',
          ipAddress: '127.0.0.1',
          userAgent: 'HOD Portal',
          details: {
            actor: actorUser?.id,
            role: actorUser?.role,
            departmentId,
            studentId: student.id,
            sectionId: section.id,
            sectionName: section.name,
            timestamp: new Date().toISOString(),
          },
        },
        { transaction }
      );

      await transaction.commit();

      const cleanCode = SectionAllocationService.getCleanSectionCode(section.name);
      return {
        success: true,
        message: `Student removed from Section ${cleanCode}. Student is now unallocated.`,
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  /**
   * Deterministic section creation (Requirement 23).
   * Generates names sequentially: Section A, Section B, Section C...
   */
  public async createSection(
    departmentId: string,
    data: {
      name: string;
      semester: number;
      capacity: number;
      academicYear?: string;
      classroom?: string;
      description?: string;
    },
    actorUser?: any
  ): Promise<any> {
    const semNum = Number(data.semester);
    if (!semNum || isNaN(semNum) || semNum < 1 || semNum > 8) {
      throw new HttpException('Valid semester number (1-8) is required.', 400, 'INVALID_SEMESTER');
    }

    const capNum = Number(data.capacity);
    if (!capNum || isNaN(capNum) || capNum <= 0) {
      throw new HttpException('Capacity must be a positive integer.', 400, 'INVALID_CAPACITY');
    }

    const ay = String(data.academicYear || '2026-27').trim();
    const cleanLetter = SectionAllocationService.getCleanSectionCode(data.name);
    const standardName = `Section ${cleanLetter}`;

    // Enforce uniqueness
    const existing = await Section.findOne({
      where: {
        departmentId,
        semester: semNum,
        academicYear: ay,
        [Op.or]: [{ name: standardName }, { name: cleanLetter }],
        status: 'ACTIVE',
      },
    });

    if (existing) {
      throw new HttpException(
        `Section "${cleanLetter}" already exists for Semester ${semNum} (${ay}).`,
        400,
        'SECTION_ALREADY_EXISTS'
      );
    }

    const newSection = await Section.create({
      departmentId,
      semester: semNum,
      academicYear: ay,
      name: standardName,
      capacity: capNum,
      classroom: data.classroom ? String(data.classroom).trim() : null,
      description: data.description ? String(data.description).trim() : null,
      createdBy: actorUser?.id || null,
      status: 'ACTIVE',
    });

    return {
      id: newSection.id,
      code: cleanLetter,
      sectionName: cleanLetter,
      name: newSection.name,
      semester: newSection.semester,
      academicYear: newSection.academicYear,
      capacity: newSection.capacity,
      classroom: newSection.classroom,
      description: newSection.description,
      status: newSection.status,
      studentCount: 0,
      availableCapacity: newSection.capacity,
      fillPercentage: 0,
      createdAt: newSection.createdAt,
    };
  }
}

export const sectionAllocationService = new SectionAllocationService();
export default sectionAllocationService;
