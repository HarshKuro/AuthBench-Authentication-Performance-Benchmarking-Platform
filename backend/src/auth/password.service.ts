import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db';
import { AuthenticationTracer } from '../instrumentation/tracer';

export class PasswordAuthService {
  public static async authenticate(
    username: string,
    passwordPlain: string,
    tracer: AuthenticationTracer
  ): Promise<{ success: boolean; token?: string; user?: { id: string; username: string } }> {
    // Stage 1: Database user lookup
    const user = await tracer.measureStage('DB_QUERY', async () => {
      return prisma.user.findUnique({
        where: { username },
      });
    });

    if (!user) {
      tracer.finish(false, 401, 'User not found');
      return { success: false };
    }

    // Stage 2: Password hash verification (computationally intensive)
    const isMatch = await tracer.measureStage('PASSWORD_HASH_VERIFY', async () => {
      return bcrypt.compare(passwordPlain, user.passwordHash);
    });

    if (!isMatch) {
      tracer.finish(false, 401, 'Invalid password');
      return { success: false };
    }

    // Stage 3: Session creation
    const session = await tracer.measureStage('SESSION_CREATE', async () => {
      const token = `sess_${uuidv4().replace(/-/g, '')}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      return prisma.session.create({
        data: {
          token,
          userId: user.id,
          expiresAt,
        },
      });
    });

    tracer.finish(true, 200);
    return {
      success: true,
      token: session.token,
      user: { id: user.id, username: user.username },
    };
  }
}
