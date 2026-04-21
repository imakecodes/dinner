import { SignJWT, jwtVerify } from 'jose';
import { env } from './env-validation';

import { logger } from './secure-logger';

// Validar JWT_SECRET em produção
if (env.NODE_ENV === 'production' && env.JWT_SECRET === 'fallback_secret_key_change_me') {
  logger.error('JWT_SECRET não pode ser o valor padrão em produção!');
  logger.error('Defina a variável de ambiente JWT_SECRET com um valor seguro.');
  logger.error('A aplicação será encerrada por motivos de segurança.');
  process.exit(1);
}

const SECRET_KEY = env.JWT_SECRET;
const encodedKey = new TextEncoder().encode(SECRET_KEY);

export async function signToken(payload: any): Promise<string> {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h') // 24 hours session
        .sign(encodedKey);
}

export async function verifyToken(token: string): Promise<any> {
    try {
        const { payload } = await jwtVerify(token, encodedKey, {
            algorithms: ['HS256'],
        });
        return payload;
    } catch (error) {
        return null;
    }
}
