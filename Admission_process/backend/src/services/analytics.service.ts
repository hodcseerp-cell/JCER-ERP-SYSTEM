import { Op, Sequelize } from 'sequelize';
import Admission from '../models/Admission';
import AdmissionPersonalDetail from '../models/AdmissionPersonalDetail';
import AdmissionAddress from '../models/AdmissionAddress';
import Department from '../models/Department';
import User from '../models/User';
import AuditLog from '../models/AuditLog';

export interface AnalyticsFilters {
  academicYear?: string;
  period?: 'today' | '7days' | '30days' | 'cycle' | 'custom';
  startDate?: string;
  endDate?: string;
}

function getDateRangeCondition(period?: string, startDate?: string, endDate?: string) {
  const now = new Date();
  let start: Date | null = null;
  const end = now;

  if (period === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === '7days') {
    start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === '30days') {
    start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (period === 'custom' && startDate) {
    start = new Date(startDate);
    if (endDate) {
      end.setTime(new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1);
    }
  }

  if (start) {
    return {
      [Op.gte]: start,
      [Op.lte]: end,
    };
  }
  return null;
}

export class AnalyticsService {
  private static getBaseWhere(filters: AnalyticsFilters) {
    const where: any = {};
    if (filters.academicYear && filters.academicYear !== 'ALL') {
      where.academicYear = filters.academicYear;
    }
    // Exclude DRAFT applications from all analytical aggregates
    where.applicationStatus = { [Op.ne]: 'DRAFT' };
    return where;
  }

  static async getOverviewKPIs(role: 'ADMIN' | 'PRINCIPAL', filters: AnalyticsFilters) {
    const where = this.getBaseWhere(filters);
    const dateRange = getDateRangeCondition(filters.period, filters.startDate, filters.endDate);

    const matchWithDate = (dateField: string, status?: string) => {
      const cond: any = { ...where };
      if (dateRange) {
        cond[dateField] = dateRange;
      }
      if (status) {
        cond.applicationStatus = status;
      }
      return cond;
    };

    if (role === 'ADMIN') {
      const [
        totalApplications,
        pendingReview,
        underReview,
        corrections,
        awaitingPrincipal,
        enrolled,
        cancelled
      ] = await Promise.all([
        Admission.count({ where: matchWithDate('submittedAt') }),
        Admission.count({ where: { ...where, applicationStatus: { [Op.in]: ['SUBMITTED', 'RESUBMITTED'] } } }),
        Admission.count({ where: { ...where, applicationStatus: 'UNDER_REVIEW' } }),
        Admission.count({ where: { ...where, applicationStatus: 'CORRECTION_REQUIRED' } }),
        Admission.count({ where: { ...where, applicationStatus: 'APPROVED' } }),
        Admission.count({ where: matchWithDate('enrolledAt', 'ENROLLED') }),
        Admission.count({ where: matchWithDate('cancellationApprovedAt', 'CANCELLED') }),
      ]);

      return {
        totalApplications,
        pendingReview,
        underReview,
        corrections,
        awaitingPrincipal,
        enrolled,
        cancelled
      };
    } else {
      const [
        totalApplications,
        awaitingPrincipal,
        principalApproved,
        enrolled,
        rejected,
        cancelled
      ] = await Promise.all([
        Admission.count({ where: matchWithDate('submittedAt') }),
        Admission.count({ where: { ...where, applicationStatus: 'APPROVED' } }),
        Admission.count({ where: matchWithDate('principalApprovedAt', 'PRINCIPAL_APPROVED') }),
        Admission.count({ where: matchWithDate('enrolledAt', 'ENROLLED') }),
        Admission.count({ where: { ...where, applicationStatus: 'REJECTED' } }),
        Admission.count({ where: matchWithDate('cancellationApprovedAt', 'CANCELLED') }),
      ]);

      return {
        totalApplications,
        awaitingPrincipal,
        principalApproved,
        enrolled,
        rejected,
        cancelled
      };
    }
  }

  static async getApplicationFunnel(filters: AnalyticsFilters) {
    const where = this.getBaseWhere(filters);
    const dateRange = getDateRangeCondition(filters.period, filters.startDate, filters.endDate);

    const matchFunnelStep = (field: string) => {
      const cond: any = { ...where };
      cond[field] = { [Op.ne]: null };
      if (dateRange) {
        cond[field] = dateRange;
      }
      return cond;
    };

    const [submitted, underReview, verified, principalApproved, enrolled] = await Promise.all([
      Admission.count({ where: matchFunnelStep('submittedAt') }),
      Admission.count({ where: matchFunnelStep('reviewedAt') }),
      Admission.count({ where: matchFunnelStep('verifiedAt') }),
      Admission.count({ where: matchFunnelStep('principalApprovedAt') }),
      Admission.count({ where: matchFunnelStep('enrolledAt') }),
    ]);

    return [
      { stage: 'Submitted', count: submitted, percentage: 100 },
      { stage: 'Under Review', count: underReview, percentage: submitted > 0 ? Math.round((underReview / submitted) * 100) : 0 },
      { stage: 'Admin Verified', count: verified, percentage: submitted > 0 ? Math.round((verified / submitted) * 100) : 0 },
      { stage: 'Principal Approved', count: principalApproved, percentage: submitted > 0 ? Math.round((principalApproved / submitted) * 100) : 0 },
      { stage: 'Enrolled', count: enrolled, percentage: submitted > 0 ? Math.round((enrolled / submitted) * 100) : 0 },
    ];
  }

  static async getApplicationTrend(filters: AnalyticsFilters, grouping: 'daily' | 'weekly' | 'monthly' = 'daily') {
    const where = this.getBaseWhere(filters);
    const dateRange = getDateRangeCondition(filters.period, filters.startDate, filters.endDate);

    const apps = await Admission.findAll({
      attributes: ['submittedAt', 'principalApprovedAt', 'enrolledAt'],
      where: {
        ...where,
        [Op.or]: [
          { submittedAt: dateRange || { [Op.ne]: null } },
          { principalApprovedAt: dateRange || { [Op.ne]: null } },
          { enrolledAt: dateRange || { [Op.ne]: null } },
        ]
      },
      raw: true
    });

    const trendMap: Record<string, { date: string; submitted: number; approved: number; enrolled: number }> = {};

    const formatDate = (date: Date) => {
      const d = new Date(date);
      if (grouping === 'monthly') {
        return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      } else if (grouping === 'weekly') {
        const firstDay = new Date(d.setDate(d.getDate() - d.getDay()));
        return `Wk of ${firstDay.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`;
      } else {
        return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      }
    };

    apps.forEach(app => {
      if (app.submittedAt) {
        const key = formatDate(app.submittedAt);
        if (!trendMap[key]) trendMap[key] = { date: key, submitted: 0, approved: 0, enrolled: 0 };
        trendMap[key].submitted++;
      }
      if (app.principalApprovedAt) {
        const key = formatDate(app.principalApprovedAt);
        if (!trendMap[key]) trendMap[key] = { date: key, submitted: 0, approved: 0, enrolled: 0 };
        trendMap[key].approved++;
      }
      if (app.enrolledAt) {
        const key = formatDate(app.enrolledAt);
        if (!trendMap[key]) trendMap[key] = { date: key, submitted: 0, approved: 0, enrolled: 0 };
        trendMap[key].enrolled++;
      }
    });

    return Object.values(trendMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-14);
  }

  static async getBranchAnalytics(filters: AnalyticsFilters) {
    const where = this.getBaseWhere(filters);
    const dateRange = getDateRangeCondition(filters.period, filters.startDate, filters.endDate);

    const branches = await Department.findAll({ raw: true });
    const results = await Promise.all(branches.map(async (b) => {
      const matchBranchWithDate = (dateField: string, status?: string) => {
        const cond: any = { ...where, branchId: b.id };
        if (dateRange) cond[dateField] = dateRange;
        if (status) cond.applicationStatus = status;
        return cond;
      };

      const [applications, approved, enrolled] = await Promise.all([
        Admission.count({ where: matchBranchWithDate('submittedAt') }),
        Admission.count({ where: matchBranchWithDate('principalApprovedAt', 'PRINCIPAL_APPROVED') }),
        Admission.count({ where: matchBranchWithDate('enrolledAt', 'ENROLLED') }),
      ]);

      return {
        name: b.code || b.name,
        applications,
        approved,
        enrolled
      };
    }));

    return results.filter(r => r.applications > 0 || r.approved > 0 || r.enrolled > 0);
  }

  static async getAdmissionTypeAnalytics(filters: AnalyticsFilters) {
    const where = this.getBaseWhere(filters);
    const dateRange = getDateRangeCondition(filters.period, filters.startDate, filters.endDate);

    const cond: any = { ...where };
    if (dateRange) cond.submittedAt = dateRange;

    const counts = await Admission.findAll({
      attributes: ['admissionType', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
      where: cond,
      group: ['admissionType'],
      raw: true
    });

    return counts.map((c: any) => ({
      name: c.admissionType || 'Other',
      value: parseInt(c.count)
    }));
  }

  static async getCategoryAnalytics(filters: AnalyticsFilters) {
    const where = this.getBaseWhere(filters);
    const dateRange = getDateRangeCondition(filters.period, filters.startDate, filters.endDate);

    const cond: any = { ...where };
    if (dateRange) cond.submittedAt = dateRange;

    const counts = await Admission.findAll({
      attributes: [
        [Sequelize.col('studentpersonaldetails.category'), 'category'],
        [Sequelize.fn('COUNT', Sequelize.col('Admission.id')), 'count']
      ],
      where: cond,
      include: [{
        model: AdmissionPersonalDetail,
        as: 'studentpersonaldetails',
        attributes: []
      }],
      group: [Sequelize.col('studentpersonaldetails.category')],
      raw: true
    });

    return counts.map((c: any) => ({
      category: c.category || 'GM',
      count: parseInt(c.count)
    }));
  }

  static async getGenderAnalytics(filters: AnalyticsFilters) {
    const where = this.getBaseWhere(filters);
    const dateRange = getDateRangeCondition(filters.period, filters.startDate, filters.endDate);

    const cond: any = { ...where };
    if (dateRange) cond.submittedAt = dateRange;

    const counts = await Admission.findAll({
      attributes: [
        [Sequelize.col('studentpersonaldetails.gender'), 'gender'],
        [Sequelize.fn('COUNT', Sequelize.col('Admission.id')), 'count']
      ],
      where: cond,
      include: [{
        model: AdmissionPersonalDetail,
        as: 'studentpersonaldetails',
        attributes: []
      }],
      group: [Sequelize.col('studentpersonaldetails.gender')],
      raw: true
    });

    return counts.map((c: any) => ({
      name: c.gender ? (c.gender.charAt(0).toUpperCase() + c.gender.slice(1).toLowerCase()) : 'Unspecified',
      value: parseInt(c.count)
    }));
  }

  static async getDistrictAnalytics(filters: AnalyticsFilters) {
    const where = this.getBaseWhere(filters);
    const dateRange = getDateRangeCondition(filters.period, filters.startDate, filters.endDate);

    const cond: any = { ...where };
    if (dateRange) cond.submittedAt = dateRange;

    const counts = await Admission.findAll({
      attributes: [
        [Sequelize.col('studentaddress.currentCity'), 'district'],
        [Sequelize.fn('COUNT', Sequelize.col('Admission.id')), 'count']
      ],
      where: cond,
      include: [{
        model: AdmissionAddress,
        as: 'studentaddress',
        attributes: []
      }],
      group: [Sequelize.col('studentaddress.currentCity')],
      raw: true
    });

    return counts
      .map((c: any) => ({
        district: c.district ? c.district.trim() : 'Unspecified',
        count: parseInt(c.count)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }

  static async getAdminWorkload(filters: AnalyticsFilters) {
    const where = this.getBaseWhere(filters);
    const dateRange = getDateRangeCondition(filters.period, filters.startDate, filters.endDate);

    // Turnaround calculation (average verifiedAt - submittedAt in hours)
    const condTurnaround: any = {
      ...where,
      submittedAt: { [Op.ne]: null },
      verifiedAt: { [Op.ne]: null },
    };
    if (dateRange) {
      condTurnaround.verifiedAt = dateRange;
    }

    const verifiedApps = await Admission.findAll({
      attributes: ['submittedAt', 'verifiedAt'],
      where: condTurnaround,
      raw: true
    });

    let averageReviewTime = '—';
    if (verifiedApps.length > 0) {
      let totalMs = 0;
      verifiedApps.forEach(app => {
        if (app.submittedAt && app.verifiedAt) {
          totalMs += new Date(app.verifiedAt).getTime() - new Date(app.submittedAt).getTime();
        }
      });
      const avgHrs = Math.max(0.1, totalMs / (1000 * 60 * 60 * verifiedApps.length));
      if (avgHrs >= 24) {
        averageReviewTime = `${Math.floor(avgHrs / 24)}d ${Math.round(avgHrs % 24)}h`;
      } else {
        averageReviewTime = `${Math.floor(avgHrs)}h ${Math.round((avgHrs % 1) * 60)}m`;
      }
    }

    return {
      averageReviewTime
    };
  }

  static async getPrincipalOverview(filters: AnalyticsFilters) {
    const where = this.getBaseWhere(filters);
    const dateRange = getDateRangeCondition(filters.period, filters.startDate, filters.endDate);

    const condApproval: any = {
      ...where,
      verifiedAt: { [Op.ne]: null },
      principalApprovedAt: { [Op.ne]: null },
    };
    if (dateRange) {
      condApproval.principalApprovedAt = dateRange;
    }

    const approvedApps = await Admission.findAll({
      attributes: ['verifiedAt', 'principalApprovedAt'],
      where: condApproval,
      raw: true
    });

    let averageDecisionTime = '—';
    if (approvedApps.length > 0) {
      let totalMs = 0;
      approvedApps.forEach(app => {
        if (app.verifiedAt && app.principalApprovedAt) {
          totalMs += new Date(app.principalApprovedAt).getTime() - new Date(app.verifiedAt).getTime();
        }
      });
      const avgHrs = Math.max(0.1, totalMs / (1000 * 60 * 60 * approvedApps.length));
      if (avgHrs >= 24) {
        averageDecisionTime = `${Math.floor(avgHrs / 24)}d ${Math.round(avgHrs % 24)}h`;
      } else {
        averageDecisionTime = `${Math.floor(avgHrs)}h ${Math.round((avgHrs % 1) * 60)}m`;
      }
    }

    const totalSubmitted = await Admission.count({
      where: {
        ...where,
        submittedAt: dateRange || { [Op.ne]: null }
      }
    });

    const totalApproved = await Admission.count({
      where: {
        ...where,
        principalApprovedAt: dateRange || { [Op.ne]: null },
        applicationStatus: { [Op.in]: ['PRINCIPAL_APPROVED', 'ENROLLED'] }
      }
    });

    const approvalRate = totalSubmitted > 0 ? `${Math.round((totalApproved / totalSubmitted) * 100)}%` : '—';

    return {
      averageDecisionTime,
      approvalRate
    };
  }

  static async getRecentActivity(filters: AnalyticsFilters) {
    const where = this.getBaseWhere(filters);
    const dateRange = getDateRangeCondition(filters.period, filters.startDate, filters.endDate);

    const cond: any = { ...where };
    if (dateRange) cond.updatedAt = dateRange;

    const activities = await Admission.findAll({
      attributes: ['id', 'applicationNumber', 'applicationStatus', 'updatedAt'],
      where: cond,
      order: [['updatedAt', 'DESC']],
      limit: 10,
      include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'] }],
    });

    return activities.map((a: any) => {
      const name = a.user ? `${a.user.firstName || ''} ${a.user.lastName || ''}`.trim() : 'Applicant';
      const statusMap: Record<string, string> = {
        SUBMITTED: 'submitted application',
        UNDER_REVIEW: 'review started',
        APPROVED: 'verified by admin',
        PRINCIPAL_APPROVED: 'approved by principal',
        ENROLLED: 'enrolled in ERP',
        CORRECTION_REQUIRED: 'correction requested',
        RESUBMITTED: 'resubmitted form',
        REJECTED: 'rejected application',
        CANCELLED: 'admission cancelled',
        CANCELLATION_REQUESTED: 'requested cancellation'
      };

      return {
        id: a.id,
        appNumber: a.applicationNumber || 'JCER-APP',
        action: statusMap[a.applicationStatus] || 'updated status',
        studentName: name,
        timestamp: a.updatedAt
      };
    });
  }

  static async getPendingActions(filters: AnalyticsFilters, role: 'ADMIN' | 'PRINCIPAL') {
    const where = this.getBaseWhere(filters);

    if (role === 'ADMIN') {
      const [reviewApps, correctionResubmissions, awaitingPrincipal] = await Promise.all([
        Admission.count({ where: { ...where, applicationStatus: 'SUBMITTED' } }),
        Admission.count({ where: { ...where, applicationStatus: 'RESUBMITTED' } }),
        Admission.count({ where: { ...where, applicationStatus: 'APPROVED' } }),
      ]);

      return {
        reviewApps,
        correctionResubmissions,
        awaitingPrincipal
      };
    } else {
      const awaitingApproval = await Admission.count({ where: { ...where, applicationStatus: 'APPROVED' } });
      const readyForEnrollment = await Admission.count({ where: { ...where, applicationStatus: 'PRINCIPAL_APPROVED' } });

      return {
        awaitingApproval,
        readyForEnrollment
      };
    }
  }

  static async getPerformanceRates(filters: AnalyticsFilters) {
    const where = this.getBaseWhere(filters);
    const dateRange = getDateRangeCondition(filters.period, filters.startDate, filters.endDate);

    const [submittedCount, enrolledCount, verifiedCount, correctionCount, rejectionCount, cancelledCount] = await Promise.all([
      Admission.count({ where: { ...where, submittedAt: dateRange || { [Op.ne]: null } } }),
      Admission.count({ where: { ...where, enrolledAt: dateRange || { [Op.ne]: null }, applicationStatus: 'ENROLLED' } }),
      Admission.count({ where: { ...where, verifiedAt: dateRange || { [Op.ne]: null }, applicationStatus: { [Op.in]: ['APPROVED', 'PRINCIPAL_APPROVED', 'ENROLLED', 'CANCELLED'] } } }),
      Admission.count({ where: { ...where, correctionRequestedAt: dateRange || { [Op.ne]: null } } }),
      Admission.count({ where: { ...where, reviewedAt: dateRange || { [Op.ne]: null }, applicationStatus: 'REJECTED' } }),
      Admission.count({ where: { ...where, cancellationApprovedAt: dateRange || { [Op.ne]: null }, applicationStatus: 'CANCELLED' } }),
    ]);

    return {
      enrollmentRate: submittedCount > 0 ? `${Math.round((enrolledCount / submittedCount) * 100)}%` : '—',
      adminVerification: submittedCount > 0 ? `${Math.round((verifiedCount / submittedCount) * 100)}%` : '—',
      correctionRate: submittedCount > 0 ? `${Math.round((correctionCount / submittedCount) * 100)}%` : '—',
      rejectionRate: submittedCount > 0 ? `${Math.round((rejectionCount / submittedCount) * 100)}%` : '—',
      cancellationRate: submittedCount > 0 ? `${Math.round((cancelledCount / submittedCount) * 100)}%` : '—',
    };
  }
}
export default AnalyticsService;
