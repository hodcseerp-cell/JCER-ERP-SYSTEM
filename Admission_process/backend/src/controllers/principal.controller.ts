import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';
import User from '../models/User';
import Department from '../models/Department';
import Admission from '../models/Admission';
import AdmissionPersonalDetail from '../models/AdmissionPersonalDetail';
import AdmissionParentDetail from '../models/AdmissionParentDetail';
import AdmissionAddress from '../models/AdmissionAddress';
import AdmissionAcademicDetail from '../models/AdmissionAcademicDetail';
import AdmissionDocument from '../models/AdmissionDocument';
import RejectionReason from '../models/RejectionReason';
import AuditLog from '../models/AuditLog';
import Notification from '../models/Notification';
import admissionService from '../services/admission.service';
import emailService from '../services/email.service';
import db from '../config/database';
import AnalyticsService from '../services/analytics.service';

interface AuthRequest extends Request {
  user?: { id: string; role: string };
}

// Helper to seed principal data inline if missing
const ensurePrincipalDataSeeded = async () => {
  try {
    let principalUser = await User.findOne({ where: { role: 'PRINCIPAL' } });
    if (!principalUser) {
      const email = process.env.INITIAL_PRINCIPAL_EMAIL || 'arihantdesai47@gmail.com';
      const rawPassword = process.env.INITIAL_PRINCIPAL_PASSWORD || 'Desai@2004';
      const passwordHash = await bcrypt.hash(rawPassword, 10);
      principalUser = await User.create({
        username: email,
        email: email,
        passwordHash: passwordHash,
        role: 'PRINCIPAL',
        status: 'ACTIVE',
        firstName: 'Dr. S.V.',
        lastName: 'Gorbal',
        phone: '9876543201',
        profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&fit=crop',
        mustChangePassword: false
      });
      console.log('✓ Default Principal User seeded successfully.');
    }
  } catch (err: any) {
    console.error('Error seeding principal user:', err.message);
  }
};

/** GET /api/principal/dashboard */
export const getDashboardData = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    await ensurePrincipalDataSeeded();

    const transaction = await db.transaction({ readOnly: true });
    try {
      const totalStudents = await User.count({ where: { role: 'STUDENT' }, transaction });
      const pendingAdmissionsCount = await Admission.count({
        where: { applicationStatus: 'APPROVED' },
        transaction
      });
      const enrolledCount = await Admission.count({
        where: { applicationStatus: 'ENROLLED' },
        transaction
      });
      const facultyCount = await User.count({
        where: { role: 'TEACHER' },
        transaction
      });
      const departments = await Department.findAll({ transaction });

      // Construct Critical Actions List
      const criticalActions = pendingAdmissionsCount > 0 ? [
        {
          id: 'admissions',
          priority: 'HIGH' as const,
          title: `${pendingAdmissionsCount} Admission${pendingAdmissionsCount > 1 ? 's' : ''} Awaiting Final Confirmation`,
          description: 'Applications verified by admin pending final principal confirmation.',
          actionText: 'Review Admissions',
          link: '/principal/admissions',
          count: pendingAdmissionsCount,
        }
      ] : [];

      const kpis = {
        students: enrolledCount || totalStudents || 0,
        faculty: facultyCount || 0,
        passRate: 0,
        avgCgpa: 0,
        placementRate: 0,
        feeCollectionRate: 0,
        revenue: '₹0'
      };

      // Build department performance from real student counts per department
      const departmentPerformance = await Promise.all(
        departments.map(async (d) => {
          const studentCount = await Admission.count({
            where: { applicationStatus: 'ENROLLED', branchId: d.id },
            transaction
          });
          return {
            id: d.id,
            name: d.name,
            code: d.code,
            students: studentCount,
            passRate: 0,
            cgpa: 0,
            trend: '—'
          };
        })
      );

      return res.status(200).json({
        success: true,
        data: {
          kpis,
          criticalActions,
          departmentPerformance,
          insights: [],
          performanceTrends: [],
          upcomingEvents: []
        }
      });
    } finally {
      await transaction.commit();
    }
  } catch (err) {
    return next(err);
  }
};


/** GET /api/principal/admissions/stats */
export const getAdmissionsStats = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const [pending, enrolled, rejected, total] = await Promise.all([
      Admission.count({ where: { applicationStatus: 'APPROVED' } }),
      Admission.count({ where: { applicationStatus: { [Op.in]: ['PRINCIPAL_APPROVED', 'ENROLLED'] } } }),
      Admission.count({ where: { applicationStatus: 'REJECTED' } }),
      Admission.count({ where: { applicationStatus: { [Op.ne]: 'DRAFT' } } }),
    ]);
    return res.json({
      success: true,
      data: { approved: pending, enrolled, rejected, total }
    });
  } catch (err) {
    return next(err);
  }
};

/** GET /api/principal/admissions/list */
export const listAdmissions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { status, branchId, admissionType, search, sortBy, sortOrder = 'DESC', page = '1', limit = '10' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {};
    if (status && status !== 'ALL') {
      if (status === 'ENROLLED') {
        where.applicationStatus = { [Op.in]: ['PRINCIPAL_APPROVED', 'ENROLLED'] };
      } else if (status === 'PRINCIPAL_APPROVED') {
        where.applicationStatus = 'PRINCIPAL_APPROVED';
      } else if (status === 'REJECTED') {
        where.applicationStatus = 'REJECTED';
      } else if (status === 'APPROVED') {
        where.applicationStatus = 'APPROVED';
      }
    } else {
      // Exclude DRAFT and SUBMITTED/UNDER_REVIEW/CORRECTION_REQUIRED/RESUBMITTED applications by default for Principal
      where.applicationStatus = { [Op.in]: ['APPROVED', 'PRINCIPAL_APPROVED', 'ENROLLED', 'REJECTED', 'CANCELLED'] };
    }
    if (branchId && branchId !== 'ALL') where.branchId = branchId;
    if (admissionType && admissionType !== 'ALL') where.admissionType = admissionType;

    const include: any[] = [
      {
        model: User,
        as: 'user',
        required: !!search,
        attributes: ['id', 'email', 'firstName', 'lastName', 'phone', 'profileImage'],
        ...(search ? {
          where: {
            [Op.or]: [
              { firstName: { [Op.iLike]: `%${search}%` } },
              { lastName: { [Op.iLike]: `%${search}%` } },
              { email: { [Op.iLike]: `%${search}%` } },
            ]
          }
        } : {})
      },
      { model: Department, as: 'branch', required: false },
      { model: AdmissionPersonalDetail, as: 'studentpersonaldetails', required: false },
      { model: AdmissionParentDetail, as: 'studentparentdetails', required: false },
      { model: AdmissionAddress, as: 'studentaddress', required: false },
      { model: AdmissionAcademicDetail, as: 'studentacademicdetails', required: false },
      { model: AdmissionDocument, as: 'studentdocuments', required: false },
    ];

    let order: any[] = [['createdAt', sortOrder]];
    if (sortBy === 'rank') order = [['applicationNumber', sortOrder]];

    const { count, rows } = await Admission.findAndCountAll({
      where,
      include,
      order,
      limit: parseInt(limit),
      offset,
      distinct: true,
    });

    return res.json({
      success: true,
      data: {
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        applications: rows,
      }
    });
  } catch (err) {
    return next(err);
  }
};

/** GET /api/principal/admissions/:id */
export const getAdmissionById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;
    const data = await admissionService.getApplicationById(id);
    if (!data) return res.status(404).json({ error: 'Application not found.' });
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
};

/** GET /api/principal/admissions/pending */
export const getPendingAdmissions = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    await ensurePrincipalDataSeeded();

    const list = await Admission.findAll({
      where: { 
        applicationStatus: { [Op.in]: ['FEE_VERIFIED', 'APPROVED'] }
      },
      include: [
        { model: User, as: 'user', attributes: ['id', 'email', 'firstName', 'lastName', 'phone', 'profileImage'] },
        { model: Department, as: 'branch' },
        { model: AdmissionPersonalDetail, as: 'studentpersonaldetails' },
        { model: AdmissionParentDetail, as: 'studentparentdetails' },
        { model: AdmissionAddress, as: 'studentaddress' },
        { model: AdmissionAcademicDetail, as: 'studentacademicdetails' },
        { model: AdmissionDocument, as: 'studentdocuments' }
      ],
      order: [['updatedAt', 'DESC']]
    });

    const rejectionReasons = await RejectionReason.findAll();

    return res.json({
      success: true,
      data: {
        applications: list,
        rejectionReasons
      }
    });
  } catch (err) {
    return next(err);
  }
};

/** PUT /api/principal/admissions/:id/decide */
export const decideAdmission = async (
  req: AuthRequest,
  res: Response,
  _next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;
    const { remarks, rejectionReason, rejectReasonCode } = req.body;
    let decision = req.body.decision || req.body.status;

    if (!decision) {
      if (req.path.endsWith('/approve')) {
        decision = 'APPROVED';
      } else {
        decision = 'REJECTED';
      }
    }

    const validDecisions = ['APPROVED', 'REJECTED', 'CORRECTION_REQUIRED', 'REJECT'];
    if (!validDecisions.includes(decision)) {
      return res.status(400).json({ error: 'Invalid decision type.' });
    }

    let targetStatus: 'PRINCIPAL_APPROVED' | 'REJECTED' | 'CORRECTION_REQUIRED' = 'REJECTED';
    if (decision === 'APPROVED') {
      targetStatus = 'PRINCIPAL_APPROVED';
    } else if (decision === 'CORRECTION_REQUIRED') {
      targetStatus = 'CORRECTION_REQUIRED';
    } else {
      targetStatus = 'REJECTED';
    }

    const enrollmentNumber = await admissionService.updateStatus(
      id,
      targetStatus,
      req.user!.id,
      remarks || rejectionReason,
      rejectionReason || remarks,
      rejectReasonCode,
      req.body.sections
    );

    // Save principal audit accountability
    const admission = await Admission.findByPk(id);
    const principalUser = await User.findByPk(req.user!.id);
    const principalName = principalUser ? `${principalUser.firstName || ''} ${principalUser.lastName || ''}`.trim() : 'Principal';

    if (admission) {
      await admission.update({
        principalReviewedBy: req.user!.id,
        principalReviewedAt: new Date(),
        principalApprovedAt: targetStatus === 'PRINCIPAL_APPROVED' ? new Date() : null,
        principalRemarks: remarks || rejectionReason || null,
        adminRemarks: remarks || rejectionReason || admission.adminRemarks || null,
        rejectionReason: rejectionReason || remarks || admission.rejectionReason || null,
      });

      if (targetStatus === 'REJECTED' || targetStatus === 'CORRECTION_REQUIRED') {
        try {
          const user = await User.findByPk(admission.userId);
          if (user) {
            await emailService.sendCorrectionRequiredNotification(
              user.email,
              {
                studentName: `${user.firstName} ${user.lastName}`.trim(),
                applicationNumber: admission.applicationNumber || '',
                applicationType: 'FRESH_ADMISSION',
                reason: rejectionReason || remarks || (targetStatus === 'REJECTED' ? 'Application Rejected by Principal' : 'Correction Required'),
                remarks: remarks || rejectionReason || ''
              }
            );
          }
        } catch (err: any) {
          console.error('Failed to send notification email:', err.message);
        }
      }
    }

    // Audit Log recording Principal Name, Date & Time, Selected Reason, Optional Remarks
    await AuditLog.create({
      userId: req.user!.id,
      action: targetStatus === 'PRINCIPAL_APPROVED' ? 'PRINCIPAL_CONFIRM' : 'PRINCIPAL_REJECT_ADMISSION',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: {
        admissionId: id,
        applicationNumber: admission?.applicationNumber,
        principalName,
        timestamp: new Date(),
        action: targetStatus === 'PRINCIPAL_APPROVED' ? 'CONFIRMED' : 'REJECTED',
        previousStatus: 'AWAITING_PRINCIPAL_APPROVAL',
        newStatus: targetStatus === 'PRINCIPAL_APPROVED' ? 'CONFIRMED' : 'REJECTED',
        correctionReason: rejectionReason || remarks || (targetStatus === 'REJECTED' ? 'Rejected' : null),
        remarks: remarks || null,
      },
    });

    return res.json({
      success: true,
      message: `Admission application has been ${targetStatus === 'PRINCIPAL_APPROVED' ? 'confirmed' : 'returned for correction'} successfully.`,
      data: {
        admissionId: id,
        applicationNumber: admission?.applicationNumber,
        status: targetStatus === 'PRINCIPAL_APPROVED' ? 'CONFIRMED' : targetStatus,
      }
    });
  } catch (err: any) {
    console.error('Error in principal decideAdmission:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};

/** POST /api/principal/admissions/bulk-confirm */
export const bulkConfirmAdmissions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const rawIds = req.body.admissionIds || req.body.ids;
    if (!rawIds || !Array.isArray(rawIds) || rawIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide at least one admission ID to confirm.'
      });
    }

    // Deduplicate IDs
    const uniqueIds = Array.from(new Set(rawIds.map((id: any) => String(id).trim()).filter(Boolean)));
    if (uniqueIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide valid admission IDs.'
      });
    }

    const principalUser = await User.findByPk(req.user!.id);
    const principalName = principalUser ? `${principalUser.firstName || ''} ${principalUser.lastName || ''}`.trim() : 'Principal';

    const results: Array<{
      admissionId: string;
      admissionNumber?: string;
      studentName?: string;
      previousStatus?: string;
      newStatus?: string;
      result: 'CONFIRMED' | 'SKIPPED' | 'FAILED';
      reason?: string;
    }> = [];

    let confirmedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const admissionId of uniqueIds) {
      try {
        const admission = await Admission.findByPk(admissionId, {
          include: [
            { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] },
            { model: AdmissionPersonalDetail, as: 'studentpersonaldetails' }
          ]
        });

        if (!admission) {
          results.push({
            admissionId,
            result: 'FAILED',
            reason: 'Admission record not found'
          });
          failedCount++;
          continue;
        }

        const appNo = admission.applicationNumber || admission.id;
        const pd = (admission as any).studentpersonaldetails;
        const u = (admission as any).user;
        const studentName = pd
          ? `${pd.firstName || ''} ${pd.lastName || ''}`.trim()
          : u
            ? `${u.firstName || ''} ${u.lastName || ''}`.trim()
            : 'Applicant';

        const currentStatus = admission.applicationStatus;

        // Check if already confirmed or enrolled (Idempotency)
        if (currentStatus === 'PRINCIPAL_APPROVED') {
          results.push({
            admissionId,
            admissionNumber: appNo,
            studentName,
            previousStatus: currentStatus,
            newStatus: 'CONFIRMED',
            result: 'SKIPPED',
            reason: 'Admission is already CONFIRMED'
          });
          skippedCount++;
          continue;
        }

        if (currentStatus === 'ENROLLED') {
          results.push({
            admissionId,
            admissionNumber: appNo,
            studentName,
            previousStatus: currentStatus,
            newStatus: 'ENROLLED',
            result: 'SKIPPED',
            reason: 'Admission is already ENROLLED'
          });
          skippedCount++;
          continue;
        }

        if (currentStatus === 'REJECTED') {
          results.push({
            admissionId,
            admissionNumber: appNo,
            studentName,
            previousStatus: currentStatus,
            result: 'SKIPPED',
            reason: 'Admission is REJECTED'
          });
          skippedCount++;
          continue;
        }

        if (currentStatus === 'CANCELLED' || currentStatus === 'CANCELLATION_REQUESTED') {
          results.push({
            admissionId,
            admissionNumber: appNo,
            studentName,
            previousStatus: currentStatus,
            result: 'SKIPPED',
            reason: 'Admission is CANCELLED'
          });
          skippedCount++;
          continue;
        }

        // Must be in awaiting principal approval state
        if (currentStatus !== 'APPROVED') {
          results.push({
            admissionId,
            admissionNumber: appNo,
            studentName,
            previousStatus: currentStatus,
            result: 'FAILED',
            reason: `Admission is not awaiting Principal approval (Current: ${currentStatus})`
          });
          failedCount++;
          continue;
        }

        // Perform atomic update
        await admissionService.updateStatus(
          admissionId,
          'PRINCIPAL_APPROVED',
          req.user!.id,
          'Bulk approved & confirmed by Principal',
          undefined,
          undefined
        );

        // Audit Log
        try {
          await AuditLog.create({
            userId: req.user!.id,
            action: 'PRINCIPAL_CONFIRM',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            details: {
              admissionId,
              applicationNumber: appNo,
              studentName,
              previousStatus: currentStatus,
              newStatus: 'CONFIRMED',
              academicYear: admission.academicYear,
              principalName,
              timestamp: new Date(),
              remarks: 'Bulk approved & confirmed by Principal'
            }
          });
        } catch (auditErr: any) {
          console.warn(`Audit log creation warning for ${admissionId}:`, auditErr.message);
        }

        results.push({
          admissionId,
          admissionNumber: appNo,
          studentName,
          previousStatus: currentStatus,
          newStatus: 'CONFIRMED',
          result: 'CONFIRMED'
        });
        confirmedCount++;

      } catch (err: any) {
        console.error(`Error confirming admission ${admissionId}:`, err.message);
        results.push({
          admissionId,
          result: 'FAILED',
          reason: err.message || 'Processing failed'
        });
        failedCount++;
      }
    }

    return res.json({
      success: true,
      message: confirmedCount > 0
        ? `${confirmedCount} admission${confirmedCount > 1 ? 's' : ''} successfully confirmed.`
        : 'No admissions were confirmed.',
      summary: {
        requested: uniqueIds.length,
        confirmed: confirmedCount,
        skipped: skippedCount,
        failed: failedCount
      },
      results
    });

  } catch (err) {
    return next(err);
  }
};

/** PUT /api/principal/admissions/bulk/approve (Alias for backward compatibility) */
export const bulkApproveAdmissions = bulkConfirmAdmissions;

/** GET /api/principal/staff */
export const getStaffList = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const staff = await User.findAll({
      where: { role: { [Op.in]: ['TEACHER', 'HOD', 'ADMIN'] } },
      attributes: ['id', 'username', 'email', 'role', 'status', 'firstName', 'lastName', 'phone', 'profileImage'],
      order: [['firstName', 'ASC']]
    });
    return res.json({ success: true, data: staff });
  } catch (err) {
    return next(err);
  }
};

/** GET /api/principal/announcements */
export const getAnnouncements = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const list = await Notification.findAll({
      where: { type: 'ANNOUNCEMENT' },
      order: [['createdAt', 'DESC']],
    });
    return res.json({
      success: true,
      data: list,
    });
  } catch (err) {
    return next(err);
  }
};

/** POST /api/principal/announcements */
export const postAnnouncement = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { title, content, audience } = req.body;
    const newNotif = await Notification.create({
      title,
      content,
      type: 'ANNOUNCEMENT',
      audience: audience || 'ALL',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      createdByAdminId: req.user!.id
    });
    return res.status(201).json({
      success: true,
      data: newNotif
    });
  } catch (err) {
    return next(err);
  }
};

/** GET /api/principal/strategic-goals */
export const getStrategicGoals = async (
  _req: AuthRequest,
  res: Response,
  _next: NextFunction
): Promise<any> => {
  return res.json({ success: true, data: [] });
};

/** POST /api/principal/strategic-goals/:id/review */
export const reviewStrategicGoal = async (
  _req: AuthRequest,
  res: Response,
  _next: NextFunction
): Promise<any> => {
  return res.json({ success: true, message: 'Strategic goal reviewed.' });
};

/** GET /api/principal/compliance/status */
export const getComplianceStatus = async (
  _req: AuthRequest,
  res: Response,
  _next: NextFunction
): Promise<any> => {
  return res.json({
    success: true,
    data: { status: 'COMPLIANT', score: 100, pendingChecks: 0 }
  });
};

/** GET /api/principal/reports/generate */
export const generateReport = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const totalApplicants = await User.count({ where: { role: 'STUDENT' } });
    const pendingCount = await Admission.count({ where: { applicationStatus: 'SUBMITTED' } });
    const enrolledCount = await Admission.count({ where: { applicationStatus: 'ENROLLED' } });

    return res.json({
      success: true,
      reportName: 'Admissions Progress Report',
      generatedAt: new Date(),
      summary: {
        totalApplicants,
        pendingAdmissions: pendingCount,
        enrolledStudents: enrolledCount
      }
    });
  } catch (err) {
    return next(err);
  }
};

// --- STUBBED ACADEMIC/HOD ENDPOINTS FOR ROUTE STABILITY ---
export const getPendingBudgets = async (_req: AuthRequest, res: Response) => res.json({ success: true, data: [] });
export const decideBudget = async (_req: AuthRequest, res: Response) => res.json({ success: true, message: 'Budget approved (sandbox mode)' });
export const getPendingLeaves = async (_req: AuthRequest, res: Response) => res.json({ success: true, data: [] });
export const decideLeave = async (_req: AuthRequest, res: Response) => res.json({ success: true, message: 'Leave decided (sandbox mode)' });
export const getPendingCurriculumChanges = async (_req: AuthRequest, res: Response) => res.json({ success: true, data: [] });
export const decideCurriculumChange = async (_req: AuthRequest, res: Response) => res.json({ success: true, message: 'Curriculum change decided (sandbox mode)' });

/** GET /api/principal/analytics */
export const getAnalyticsData = async (
  req: AuthRequest, res: Response, next: NextFunction
): Promise<any> => {
  try {
    const filters = {
      academicYear: req.query.academicYear as string || '2026-2027',
      period: req.query.period as any || 'cycle',
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
    };

    const [
      kpis,
      funnel,
      trend,
      branchPerformance,
      admissionTypes,
      categories,
      genders,
      districts,
      overview,
      rates,
      recentActivity,
      pendingActions
    ] = await Promise.all([
      AnalyticsService.getOverviewKPIs('PRINCIPAL', filters),
      AnalyticsService.getApplicationFunnel(filters),
      AnalyticsService.getApplicationTrend(filters, 'daily'),
      AnalyticsService.getBranchAnalytics(filters),
      AnalyticsService.getAdmissionTypeAnalytics(filters),
      AnalyticsService.getCategoryAnalytics(filters),
      AnalyticsService.getGenderAnalytics(filters),
      AnalyticsService.getDistrictAnalytics(filters),
      AnalyticsService.getPrincipalOverview(filters),
      AnalyticsService.getPerformanceRates(filters),
      AnalyticsService.getRecentActivity(filters),
      AnalyticsService.getPendingActions(filters, 'PRINCIPAL'),
    ]);

    return res.json({
      success: true,
      data: {
        kpis,
        funnel,
        trend,
        branchPerformance,
        admissionTypes,
        categories,
        genders,
        districts,
        overview,
        rates,
        recentActivity,
        pendingActions
      }
    });
  } catch (err) {
    return next(err);
  }
};
