import { TRPCError } from '@trpc/server';
import { publicProcedure, router } from '../../server/trpc';
import { deleteSession } from './db';
import { getGoogleAuthUrl, isGoogleAuthConfigured } from './google';
import { createSessionDeleteCookie, getSessionTokenFromCookies, verifySessionToken } from './session';

export const authRouter = router({
  /**
   * Get Google OAuth login URL
   */
  login: publicProcedure.query(() => {
    if (!isGoogleAuthConfigured()) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Google OAuth is not configured',
      });
    }

    const authUrl = getGoogleAuthUrl();
    if (!authUrl) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to generate Google OAuth URL',
      });
    }

    return {
      url: authUrl,
    };
  }),

  /**
   * Get current session/user
   */
  getSession: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      return {
        user: null,
        isAuthenticated: false,
      };
    }

    return {
      user: {
        id: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.name,
        avatarUrl: ctx.user.avatar_url,
      },
      isAuthenticated: true,
    };
  }),

  /**
   * Logout - clears session
   */
  logout: publicProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user) {
      // Already logged out
      return {
        success: true,
      };
    }

    // Extract session token from cookies
    // Note: For logout, we use the API endpoint instead, but if called via tRPC, extract from context
    const cookieHeader = ctx.req?.headers?.get('cookie') || null;
    const sessionToken = cookieHeader ? getSessionTokenFromCookies(cookieHeader) : null;
    
    if (sessionToken) {
      // Verify token to get session ID
      const payload = await verifySessionToken(sessionToken);
      if (payload) {
        // Delete session from database
        await deleteSession(payload.sessionId);
      }
    }

    // Return delete cookie header (client will handle setting it)
    const deleteCookie = createSessionDeleteCookie();
    
    return {
      success: true,
      deleteCookie,
    };
  }),

  /**
   * Check if Google OAuth is configured
   */
  configStatus: publicProcedure.query(() => {
    return {
      configured: isGoogleAuthConfigured(),
      message: isGoogleAuthConfigured()
        ? 'Google OAuth is configured'
        : 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.',
    };
  }),
});

