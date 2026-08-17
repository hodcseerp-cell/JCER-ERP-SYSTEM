import otpService from '../services/otp.service';
import Otp from '../models/Otp';
import bcrypt from 'bcryptjs';

let mockOtpStore: any[] = [];

jest.mock('../models/Otp', () => {
  const mockOtpModel = {
    destroy: jest.fn().mockImplementation(async (options: any) => {
      if (options?.where?.userId) {
        mockOtpStore = mockOtpStore.filter(item => item.userId !== options.where.userId);
      } else {
        mockOtpStore = [];
      }
      return mockOtpStore.length;
    }),
    count: jest.fn().mockImplementation(async (options: any) => {
      let items = mockOtpStore;
      if (options?.where?.userId) {
        items = items.filter(i => i.userId === options.where.userId);
      }
      if (options?.where?.email) {
        items = items.filter(i => i.email === options.where.email);
      }
      if (options?.where?.purpose) {
        items = items.filter(i => i.purpose === options.where.purpose);
      }
      if (options?.where?.verified !== undefined) {
        items = items.filter(i => i.verified === options.where.verified);
      }
      return items.length;
    }),
    findOne: jest.fn().mockImplementation(async (options: any) => {
      let items = [...mockOtpStore];
      if (options?.where?.userId) {
        items = items.filter(i => i.userId === options.where.userId);
      }
      if (options?.where?.email) {
        items = items.filter(i => i.email === options.where.email);
      }
      if (options?.where?.purpose) {
        items = items.filter(i => i.purpose === options.where.purpose);
      }
      if (options?.where?.verified !== undefined) {
        items = items.filter(i => i.verified === options.where.verified);
      }
      if (options?.order && Array.isArray(options.order)) {
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      if (items.length === 0) return null;
      return items[0];
    }),
    update: jest.fn().mockImplementation(async (values: any, options: any) => {
      let count = 0;
      mockOtpStore.forEach(item => {
        let match = true;
        if (options?.where?.userId && item.userId !== options.where.userId) match = false;
        if (options?.where?.email && item.email !== options.where.email) match = false;
        if (options?.where?.purpose && item.purpose !== options.where.purpose) match = false;
        if (options?.where?.verified !== undefined && item.verified !== options.where.verified) match = false;
        if (match) {
          Object.assign(item, values);
          count++;
        }
      });
      return [count];
    }),
    create: jest.fn().mockImplementation(async (values: any) => {
      const record = {
        id: 'mock-uuid-' + Math.random(),
        createdAt: new Date(),
        updatedAt: new Date(),
        attempts: 0,
        verified: false,
        ...values,
        update: async function (newValues: any) {
          Object.assign(this, newValues);
          return this;
        },
      };
      mockOtpStore.push(record);
      return record;
    }),
  };

  return {
    __esModule: true,
    default: mockOtpModel,
    Otp: mockOtpModel,
  };
});

describe('Email Change OTP Logic', () => {
  const testUserId = '00000000-0000-0000-0000-000000000001';
  const newEmail = 'newtestuser@jcer.in';

  beforeEach(async () => {
    mockOtpStore = [];
    jest.clearAllMocks();
  });

  it('should generate an OTP and store it hashed with purpose EMAIL_CHANGE', async () => {
    const res = await otpService.generateAndSaveEmailChangeOtp(testUserId, newEmail);
    expect(res.success).toBe(true);
    expect(res.otp).toBeDefined();
    expect(res.otp).toHaveLength(6);

    const otpRecord = await Otp.findOne({
      where: { userId: testUserId, purpose: 'EMAIL_CHANGE', verified: false },
    });

    expect(otpRecord).not.toBeNull();
    expect(otpRecord?.newEmail).toBe(newEmail);
    expect(otpRecord?.otpHash).not.toBe(res.otp);

    // Verify bcrypt hash matches
    const isMatch = await bcrypt.compare(res.otp!, otpRecord!.otpHash);
    expect(isMatch).toBe(true);
  });

  it('should reject invalid OTP codes during verification', async () => {
    await otpService.generateAndSaveEmailChangeOtp(testUserId, newEmail);

    const verifyRes = await otpService.verifyEmailChangeOtp(testUserId, '000000');
    expect(verifyRes.success).toBe(false);
    expect(verifyRes.error).toContain('Invalid verification code');
  });

  it('should verify successfully with correct OTP code', async () => {
    const res = await otpService.generateAndSaveEmailChangeOtp(testUserId, newEmail);
    expect(res.otp).toBeDefined();

    const verifyRes = await otpService.verifyEmailChangeOtp(testUserId, res.otp!);
    expect(verifyRes.success).toBe(true);
    expect(verifyRes.newEmail).toBe(newEmail);

    // Check that OTP is marked verified
    const otpRecord = await Otp.findOne({
      where: { userId: testUserId, purpose: 'EMAIL_CHANGE' },
    });
    expect(otpRecord?.verified).toBe(true);
  });

  it('should enforce attempt limit after 5 failed verification attempts', async () => {
    await otpService.generateAndSaveEmailChangeOtp(testUserId, newEmail);

    for (let i = 0; i < 5; i++) {
      await otpService.verifyEmailChangeOtp(testUserId, '123456');
    }

    const verifyRes = await otpService.verifyEmailChangeOtp(testUserId, '123456');
    expect(verifyRes.success).toBe(false);
    expect(verifyRes.error).toContain('Too many verification attempts');
  });
});
