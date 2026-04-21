// Mock nodemailer at top level to ensure Jest takes control
jest.mock('nodemailer', () => ({
    createTransport: jest.fn(),
}));

describe('Email Service - Consolidated Tests', () => {
    let mockSendMail: jest.Mock;

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
        process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
        process.env.SMTP_EMAIL_FROM = 'no-reply@poe.gg';
        process.env.SMTP_EMAIL_FROM_NAME = 'POE2 Genie';
    });

    afterEach(() => {
        delete process.env.SMTP_PASSWORD;
        delete process.env.NEXT_PUBLIC_APP_URL;
        delete process.env.SMTP_EMAIL_FROM;
        delete process.env.SMTP_EMAIL_FROM_NAME;
        jest.restoreAllMocks();
    });

    // Helper to import service functions
    const getEmailService = () => {
        return require('@/lib/email-service');
    };

    describe('sendPasswordChangedEmail', () => {
        it('should send email with correct content (English)', async () => {
            const { sendPasswordChangedEmail } = getEmailService();
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

        it('should send email with correct content (Portuguese)', async () => {
            const { sendPasswordChangedEmail } = getEmailService();
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

        it('should handle fuzzy language codes (pt -> pt-BR)', async () => {
            const { sendPasswordChangedEmail } = getEmailService();
            const email = 'pt-fuzzy@example.com';
            const name = 'Maria';
            
            await sendPasswordChangedEmail(email, name, 'pt');

            const nodemailer = require('nodemailer');
            expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
                to: email,
                subject: 'Alerta de Segurança: Senha Alterada',
                text: expect.stringContaining(`Olá ${name}`),
            }));
        });

        it('should handle fallback language for unsupported language', async () => {
            const { sendPasswordChangedEmail } = getEmailService();
            const email = 'es@example.com';
            const name = 'Ranger';
            
            await sendPasswordChangedEmail(email, name, 'es-ES');

            expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
                to: email,
                subject: 'Security Alert: Password Changed', // Should fallback to English
            }));
        });

        it('should not send email if SMTP_PASSWORD is not set', async () => {
            delete process.env.SMTP_PASSWORD;
            const { sendPasswordChangedEmail } = getEmailService();
            
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

            await sendPasswordChangedEmail('test@example.com', 'Test');

            expect(mockSendMail).not.toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith(
                expect.stringContaining('SMTP_PASSWORD not set. Skipping password changed email.')
            );
            consoleSpy.mockRestore();
        });

        it('should handle send failures gracefully', async () => {
            const { sendPasswordChangedEmail } = getEmailService();
            mockSendMail.mockRejectedValueOnce(new Error('smtp error'));
            
            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
            
            await sendPasswordChangedEmail('user@poe.gg', 'Ranger', 'en');
            
            expect(errorSpy).toHaveBeenCalledWith(
                '[Email Service] Error sending password changed email:',
                expect.any(Error)
            );
        });
    });

    describe('sendPasswordResetEmail', () => {
        it('should send email with correct content (English)', async () => {
            const { sendPasswordResetEmail } = getEmailService();
            const email = 'reset@example.com';
            const token = 'xyz-token';
            
            await sendPasswordResetEmail(email, 'User', token, 'en');

            const nodemailer = require('nodemailer');
            expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
                to: email,
                subject: 'Reset your password',
                text: expect.stringContaining(`http://localhost:3000/reset-password?token=${token}`),
            }));
        });

        it('should send email with correct content (Portuguese)', async () => {
            const { sendPasswordResetEmail } = getEmailService();
            const email = 'reset-pt@example.com';
            const token = 'abc-token';
            
            await sendPasswordResetEmail(email, 'User', token, 'pt-BR');

            const nodemailer = require('nodemailer');
            expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
                to: email,
                subject: 'Redefina sua senha',
                text: expect.stringContaining(`Você solicitou uma redefinição de senha`),
            }));
        });

        it('should not send email if SMTP_PASSWORD is not set', async () => {
            delete process.env.SMTP_PASSWORD;
            const { sendPasswordResetEmail } = getEmailService();
            
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
            
            await sendPasswordResetEmail('user@poe.gg', 'Ranger', 'token-3', 'en');
            
            expect(mockSendMail).not.toHaveBeenCalled();
            expect(warnSpy).toHaveBeenCalledWith(
                '[Email Service] SMTP_PASSWORD not set. Skipping password reset email.'
            );
            
            // Restore env var for other tests
            process.env.SMTP_PASSWORD = 'secret';
        });

        it('should handle send failures gracefully', async () => {
            const { sendPasswordResetEmail } = getEmailService();
            mockSendMail.mockRejectedValueOnce(new Error('smtp error'));
            
            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
            
            await sendPasswordResetEmail('user@poe.gg', 'Ranger', 'token-4', 'pt');
            
            expect(errorSpy).toHaveBeenCalledWith(
                '[Email Service] Error sending password reset email:',
                expect.any(Error)
            );
        });
    });

    describe('sendVerificationEmail', () => {
        it('should send email with correct content (Portuguese)', async () => {
            const { sendVerificationEmail } = getEmailService();
            
            await sendVerificationEmail('user@poe.gg', 'token-1', 'pt-BR');
            
            expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
                to: 'user@poe.gg',
                subject: 'Verifique seu endereço de email',
                from: '"POE2 Genie" <no-reply@poe.gg>',
            }));
        });

        it('should handle send failures gracefully', async () => {
            const { sendVerificationEmail } = getEmailService();
            mockSendMail.mockRejectedValueOnce(new Error('smtp error'));
            
            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
            
            await sendVerificationEmail('user@poe.gg', 'token-2', 'en');
            
            expect(errorSpy).toHaveBeenCalledWith(
                '[Email Service] Error sending verification email:',
                expect.any(Error)
            );
        });

        it('should not send email if SMTP_PASSWORD is not set', async () => {
            delete process.env.SMTP_PASSWORD;
            const { sendVerificationEmail } = getEmailService();
            
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
            
            await sendVerificationEmail('user@poe.gg', 'token', 'en');
            
            expect(mockSendMail).not.toHaveBeenCalled();
            expect(warnSpy).toHaveBeenCalledWith(
                expect.stringContaining('SMTP_PASSWORD not set. Skipping verification email.')
            );
            
            // Restore env var for other tests
            process.env.SMTP_PASSWORD = 'secret';
        });
    });

    describe('sendInvitationEmail', () => {
        it('should send email to existing user with correct content', async () => {
            const { sendInvitationEmail } = getEmailService();
            
            await sendInvitationEmail('member@poe.gg', 'Ranger', 'Atlas HQ', 'CODE1', true);
            
            expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
                to: 'member@poe.gg',
                subject: 'You have been added to Atlas HQ',
                text: expect.stringContaining('/login'),
            }));
        });

        it('should send email to new user with correct content', async () => {
            const { sendInvitationEmail } = getEmailService();
            
            await sendInvitationEmail('new@poe.gg', 'Ranger', 'Atlas HQ', 'CODE1', false);
            
            expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
                to: 'new@poe.gg',
                subject: 'You have been invited to join Atlas HQ hideout',
                text: expect.stringContaining('/register?email='),
            }));
        });

        it('should handle send failures gracefully', async () => {
            const { sendInvitationEmail } = getEmailService();
            mockSendMail.mockRejectedValueOnce(new Error('smtp error'));
            
            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
            
            await sendInvitationEmail('new@poe.gg', 'Ranger', 'Atlas HQ', 'CODE1', false);
            
            expect(errorSpy).toHaveBeenCalledWith(
                '[Email Service] Error sending invitation email:',
                expect.any(Error)
            );
        });

        it('should not send email if SMTP_PASSWORD is not set', async () => {
            delete process.env.SMTP_PASSWORD;
            const { sendInvitationEmail } = getEmailService();
            
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
            
            await sendInvitationEmail('admin@poe.gg', 'Ranger', 'Atlas HQ', 'CODE1', true);
            
            expect(mockSendMail).not.toHaveBeenCalled();
            expect(warnSpy).toHaveBeenCalledWith(
                '[Email Service] SMTP_PASSWORD not set. Skipping invitation email.'
            );
            
            // Restore env var for other tests
            process.env.SMTP_PASSWORD = 'secret';
        });
    });

    describe('sendKitchenJoinRequestEmail', () => {
        it('should send notification email with correct content', async () => {
            const { sendKitchenJoinRequestEmail } = getEmailService();
            
            await sendKitchenJoinRequestEmail('admin@poe.gg', 'Ranger', 'Atlas HQ');
            
            expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
                to: 'admin@poe.gg',
                subject: 'Ranger wants to join Atlas HQ hideout',
            }));
        });

        it('should handle send failures gracefully', async () => {
            const { sendKitchenJoinRequestEmail } = getEmailService();
            mockSendMail.mockRejectedValueOnce(new Error('smtp error'));
            
            const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
            
            await sendKitchenJoinRequestEmail('admin@poe.gg', 'Ranger', 'Atlas HQ');
            
            expect(errorSpy).toHaveBeenCalledWith(
                '[Email Service] Error sending email:',
                expect.any(Error)
            );
        });

        it('should not send email if SMTP_PASSWORD is not set', async () => {
            delete process.env.SMTP_PASSWORD;
            const { sendKitchenJoinRequestEmail } = getEmailService();
            
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
            
            await sendKitchenJoinRequestEmail('admin@poe.gg', 'Ranger', 'Atlas HQ');
            
            expect(mockSendMail).not.toHaveBeenCalled();
            expect(warnSpy).toHaveBeenCalledWith(
                '[Email Service] SMTP_PASSWORD not set. Skipping email send.'
            );
            
            // Restore env var for other tests
            process.env.SMTP_PASSWORD = 'secret';
        });
    });
});
