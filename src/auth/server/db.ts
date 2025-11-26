import { sql } from '../../server/lib/db-connection';

export interface User {
  id: string;
  google_id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Session {
  id: string;
  user_id: string;
  session_token: string;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Find user by Google ID
 */
export async function findUserByGoogleId(googleId: string): Promise<User | null> {
  try {
    const result = await sql`
      SELECT id, google_id, email, name, avatar_url, created_at, updated_at
      FROM users
      WHERE google_id = ${googleId}
      LIMIT 1
    `;
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      google_id: row.google_id,
      email: row.email,
      name: row.name,
      avatar_url: row.avatar_url,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  } catch (error) {
    console.error('Error finding user by Google ID:', error);
    return null;
  }
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await sql`
      SELECT id, google_id, email, name, avatar_url, created_at, updated_at
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `;
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      google_id: row.google_id,
      email: row.email,
      name: row.name,
      avatar_url: row.avatar_url,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  } catch (error) {
    console.error('Error finding user by email:', error);
    return null;
  }
}

/**
 * Create a new user
 */
export async function createUser(data: {
  googleId: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
}): Promise<User> {
  try {
    const result = await sql`
      INSERT INTO users (google_id, email, name, avatar_url)
      VALUES (${data.googleId}, ${data.email}, ${data.name || null}, ${data.avatarUrl || null})
      RETURNING id, google_id, email, name, avatar_url, created_at, updated_at
    `;
    
    const row = result.rows[0];
    return {
      id: row.id,
      google_id: row.google_id,
      email: row.email,
      name: row.name,
      avatar_url: row.avatar_url,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Update user information
 */
export async function updateUser(userId: string, data: {
  name?: string | null;
  avatarUrl?: string | null;
}): Promise<User | null> {
  try {
    if (data.name !== undefined && data.avatarUrl !== undefined) {
      const result = await sql`
        UPDATE users
        SET name = ${data.name}, avatar_url = ${data.avatarUrl}, updated_at = NOW()
        WHERE id = ${userId}
        RETURNING id, google_id, email, name, avatar_url, created_at, updated_at
      `;
      
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        id: row.id,
        google_id: row.google_id,
        email: row.email,
        name: row.name,
        avatar_url: row.avatar_url,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
      };
    }
    
    if (data.name !== undefined) {
      const result = await sql`
        UPDATE users
        SET name = ${data.name}, updated_at = NOW()
        WHERE id = ${userId}
        RETURNING id, google_id, email, name, avatar_url, created_at, updated_at
      `;
      
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        id: row.id,
        google_id: row.google_id,
        email: row.email,
        name: row.name,
        avatar_url: row.avatar_url,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
      };
    }
    
    if (data.avatarUrl !== undefined) {
      const result = await sql`
        UPDATE users
        SET avatar_url = ${data.avatarUrl}, updated_at = NOW()
        WHERE id = ${userId}
        RETURNING id, google_id, email, name, avatar_url, created_at, updated_at
      `;
      
      if (result.rows.length === 0) return null;
      const row = result.rows[0];
      return {
        id: row.id,
        google_id: row.google_id,
        email: row.email,
        name: row.name,
        avatar_url: row.avatar_url,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
      };
    }
    
    // No updates, just return the user
    const result = await sql`
      SELECT id, google_id, email, name, avatar_url, created_at, updated_at
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `;
    
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      google_id: row.google_id,
      email: row.email,
      name: row.name,
      avatar_url: row.avatar_url,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  } catch (error) {
    console.error('Error updating user:', error);
    return null;
  }
}

/**
 * Create or update user from Google data
 */
export async function upsertUser(data: {
  googleId: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
}): Promise<User> {
  // Try to find by Google ID first
  let user = await findUserByGoogleId(data.googleId);
  
  if (user) {
    // Update user if name or avatar changed
    const updated = await updateUser(user.id, {
      name: data.name,
      avatarUrl: data.avatarUrl,
    });
    return updated || user;
  }
  
  // Try to find by email in case Google ID changed
  user = await findUserByEmail(data.email);
  
  if (user) {
    // Update Google ID and user info
    await sql`
      UPDATE users
      SET google_id = ${data.googleId},
          name = COALESCE(${data.name}, name),
          avatar_url = COALESCE(${data.avatarUrl}, avatar_url),
          updated_at = NOW()
      WHERE id = ${user.id}
    `;
    
    // Fetch updated user
    const updated = await findUserByGoogleId(data.googleId);
    if (updated) return updated;
  }
  
  // Create new user
  return createUser(data);
}

/**
 * Find session by session token
 */
export async function findSessionByToken(sessionToken: string): Promise<Session | null> {
  try {
    const result = await sql`
      SELECT id, user_id, session_token, expires_at, created_at, updated_at
      FROM user_sessions
      WHERE session_token = ${sessionToken}
        AND expires_at > NOW()
      LIMIT 1
    `;
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      session_token: row.session_token,
      expires_at: new Date(row.expires_at),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  } catch (error) {
    console.error('Error finding session:', error);
    return null;
  }
}

/**
 * Create a new session
 */
export async function createSession(data: {
  userId: string;
  sessionToken: string;
  expiresAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<Session> {
  try {
    const result = await sql`
      INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent)
      VALUES (${data.userId}, ${data.sessionToken}, ${data.expiresAt.toISOString()}::timestamptz, ${data.ipAddress || null}, ${data.userAgent || null})
      RETURNING id, user_id, session_token, expires_at, created_at, updated_at
    `;
    
    const row = result.rows[0];
    return {
      id: row.id,
      user_id: row.user_id,
      session_token: row.session_token,
      expires_at: new Date(row.expires_at),
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
}

/**
 * Delete a session
 */
export async function deleteSession(sessionToken: string): Promise<boolean> {
  try {
    await sql`
      DELETE FROM user_sessions
      WHERE session_token = ${sessionToken}
    `;
    return true;
  } catch (error) {
    console.error('Error deleting session:', error);
    return false;
  }
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await sql`
      DELETE FROM user_sessions
      WHERE expires_at < NOW()
      RETURNING id
    `;
    return result.rows.length;
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    return 0;
  }
}

/**
 * Generate a random session token
 */
export async function generateSessionToken(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

