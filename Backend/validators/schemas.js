const { z } = require('zod');

// Shared definitions
const latitudeSchema = z.string().or(z.number()).transform(v => Number(v)).refine(v => v >= -90 && v <= 90, { message: 'Invalid latitude' });
const longitudeSchema = z.string().or(z.number()).transform(v => Number(v)).refine(v => v >= -180 && v <= 180, { message: 'Invalid longitude' });

const loginSchema = z.object({
  body: z.object({
    loginId: z.string().trim().min(1, 'loginId is required').max(100, 'loginId too long'),
    password: z.string().min(1, 'password is required').max(100, 'password too long'),
  })
});

const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'name is required').max(150, 'name too long'),
    loginId: z.string().trim().min(1, 'loginId is required').max(100, 'loginId too long'),
    password: z.string().min(1, 'password is required').max(100, 'password too long'),
    phone: z.string().trim().max(20, 'phone too long').optional(),
    email: z.string().trim().email('Invalid email format').max(100, 'email too long').optional().or(z.literal('')),
    address: z.string().trim().max(500, 'address too long').optional(),
    caseNumber: z.string().trim().max(100, 'caseNumber too long').optional(),
    policeStationId: z.string().or(z.number()).optional(),
    externmentSection: z.string().trim().max(100).optional(),
    periodFrom: z.string().trim().max(50).optional(),
    periodTill: z.string().trim().max(50).optional(),
    residenceAddress: z.string().trim().max(500).optional(),
    externFromPune: z.union([z.string(), z.boolean()]).optional(),
    divisions: z.string().optional() // JSON array string
  })
});

const checkInSchema = z.object({
  body: z.object({
    latitude: latitudeSchema,
    longitude: longitudeSchema,
    accuracy: z.string().or(z.number()).transform(v => Number(v)).optional(),
  })
});

module.exports = {
  loginSchema,
  registerSchema,
  checkInSchema
};
