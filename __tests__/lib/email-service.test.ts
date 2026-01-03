
// Mock nodemailer at top level to ensure Jest takes control, but implementation setup in beforeEach
jest.mock('nodemailer', () => ({
    createTransport: jest.fn(),
}));

describe('Email Service', () => {
    let mockSendMail: jest.Mock;
    let sendPasswordChangedEmail: (email: string, name: string) => Promise<void>;

    beforeEach(() => {
        jest.resetModules(); // Clear cache to allow re-importing service
        jest.clearAllMocks();
        
        mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
        
        // Set up the mock return value
        const nodemailer = require('nodemailer');
        (nodemailer.createTransport as jest.Mock).mockReturnValue({
            sendMail: mockSendMail
        });

        // Mock env vars
        process.env.SMTP_PASSWORD = 'mock-password'; 
        
        // Import service AFTER mocking
        // Using require guarantees we get a fresh module instance using our configured mocks
        const service = require('@/lib/email-service');
        sendPasswordChangedEmail = service.sendPasswordChangedEmail;
    });

    afterEach(() => {
        delete process.env.SMTP_PASSWORD;
    });

    it('sendPasswordChangedEmail should send email with correct content (English)', async () => {
        const email = 'test@example.com';
        const name = 'Test User';
        
        await sendPasswordChangedEmail(email, name, 'en');

        const nodemailer = require('nodemailer');
        expect(nodemailer.createTransport).toHaveBeenCalled();
        expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
            to: email,
            subject: 'Security Alert: Password Changed',
            text: expect.stringContaining(`Hello ${name}`),
        }));
    });

    it('sendPasswordChangedEmail should send email with correct content (Portuguese)', async () => {
        const email = 'pt@example.com';
        const name = 'João';
        
        await sendPasswordChangedEmail(email, name, 'pt-BR');

        const nodemailer = require('nodemailer');
        expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
            to: email,
            subject: 'Alerta de Segurança: Senha Alterada',
            text: expect.stringContaining(`Olá ${name}`),
        }));
    });

    it('sendPasswordChangedEmail should not send email if SMTP_PASSWORD is not set', async () => {
        delete process.env.SMTP_PASSWORD;
        // Re-import might be needed if env var is checked at module level, but it is checked inside function.
        // However, checks inside function are safe.
        
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        await sendPasswordChangedEmail('test@example.com', 'Test');

        expect(mockSendMail).not.toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('SMTP_PASSWORD not set'));
        consoleSpy.mockRestore();
    });
});
