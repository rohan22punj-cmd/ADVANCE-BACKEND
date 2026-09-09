const { z } = require('zod');

// Schema for User Registration
const registerSchema = z.object({
    email: z
        .string({ required_error: 'Email is required' })
        .email('Please enter a valid email address')
        .trim()
        .toLowerCase(),
    name: z
        .string({ required_error: 'Name is required' })
        .min(2, 'Name must be at least 2 characters long')
        .max(50, 'Name cannot exceed 50 characters')
        .trim(),
    password: z
        .string({ required_error: 'Password is required' })
        .min(6, 'Password must be at least 6 characters long')
        .max(100, 'Password cannot exceed 100 characters')
});

// Schema for User Login
const loginSchema = z.object({
    email: z
        .string({ required_error: 'Email is required' })
        .email('Please enter a valid email address')
        .trim()
        .toLowerCase(),
    password: z
        .string({ required_error: 'Password is required' })
        .min(1, 'Password is required')
});

// Schema for Creating an Account
const createAccountSchema = z.object({
    currency: z
        .string({ required_error: 'Currency is required' })
        .length(3, 'Currency must be a 3-letter ISO code (e.g. INR, USD, EUR)')
        .toUpperCase()
        .default('INR')
});

// Schema for Creating a Transaction (Transfer)
const createTransactionSchema = z.object({
    fromAccountId: z
        .string({ required_error: 'fromAccountId is required' })
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid fromAccountId format (must be 24-char hex ObjectId)'),
    toAccountId: z
        .string({ required_error: 'toAccountId is required' })
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid toAccountId format (must be 24-char hex ObjectId)'),
    amount: z
        .number({ required_error: 'Amount is required' })
        .positive('Amount must be a positive number greater than 0'),
    idempotencyKey: z
        .string({ required_error: 'idempotencyKey is required' })
        .min(8, 'idempotencyKey must be at least 8 characters long')
        .trim()
});

// Schema for Initial Funds Transaction (System User)
const initialFundsSchema = z.object({
    toAccountId: z
        .string({ required_error: 'toAccountId is required' })
        .regex(/^[0-9a-fA-F]{24}$/, 'Invalid toAccountId format (must be 24-char hex ObjectId)'),
    amount: z
        .number({ required_error: 'Amount is required' })
        .positive('Amount must be a positive number greater than 0'),
    idempotencyKey: z
        .string({ required_error: 'idempotencyKey is required' })
        .min(8, 'idempotencyKey must be at least 8 characters long')
        .trim()
});

// Query Schema for Transaction History
const transactionQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z.enum(['pending', 'completed', 'failed', 'reversed']).optional(),
    startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    accountId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional()
});

/**
 * Higher-order middleware function to validate request body against a Zod schema
 */
function validateBody(schema) {
    return (req, res, next) => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errors = error.issues.map(issue => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }));
                return res.status(400).json({
                    message: 'Validation failed',
                    errors
                });
            }
            return res.status(400).json({ message: 'Invalid request payload' });
        }
    };
}

/**
 * Higher-order middleware function to validate request query params against a Zod schema
 */
function validateQuery(schema) {
    return (req, res, next) => {
        try {
            req.query = schema.parse(req.query);
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errors = error.issues.map(issue => ({
                    field: issue.path.join('.'),
                    message: issue.message
                }));
                return res.status(400).json({
                    message: 'Query parameter validation failed',
                    errors
                });
            }
            return res.status(400).json({ message: 'Invalid query parameters' });
        }
    };
}

module.exports = {
    registerSchema,
    loginSchema,
    createAccountSchema,
    createTransactionSchema,
    initialFundsSchema,
    transactionQuerySchema,
    validateBody,
    validateQuery
};
