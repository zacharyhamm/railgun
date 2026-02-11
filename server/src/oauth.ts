import crypto from "node:crypto";
import {
  type NextFunction,
  type Request,
  type Response,
  Router,
} from "express";

const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID ?? "";
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET ?? "";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Session {
  user: User;
  accessToken: string;
  refreshToken?: string;
}

declare global {
  namespace Express {
    interface Request {
      session?: Session;
    }
  }
}

export const sessions = new Map<string, Session>();
const states = new Map<string, number>();

// Clean up expired states (older than 10 minutes) periodically
setInterval(() => {
  const now = Date.now();
  for (const [state, timestamp] of states) {
    if (now - timestamp > 10 * 60 * 1000) {
      states.delete(state);
    }
  }
}, 60 * 1000);

export const oauthRouter = Router();

oauthRouter.get("/authorize", (req, res) => {
  const state = crypto.randomUUID();
  states.set(state, Date.now());

  const redirectUri = `${req.protocol}://${req.get("host")}/oauth/callback`;
  console.log(redirectUri);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: OAUTH_CLIENT_ID,
    redirect_uri: redirectUri,
    scope:
      "openid email profile offline_access project:member workspace:member",
    prompt: "consent",
    state,
  });

  res.redirect(`https://backboard.railway.com/oauth/auth?${params}`);
});

oauthRouter.get("/callback", async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!state || !states.has(state as string)) {
      res.status(400).send("Invalid or missing state parameter");
      return;
    }
    states.delete(state as string);

    if (!code) {
      res.status(400).send("Missing authorization code");
      return;
    }

    const redirectUri = `${req.protocol}://${req.get("host")}/oauth/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch("https://backboard.railway.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${OAUTH_CLIENT_ID}:${OAUTH_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code as string,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      res.status(502).send("Failed to exchange authorization code for token");
      return;
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
    };

    // Fetch user info
    const userRes = await fetch("https://backboard.railway.com/oauth/me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userRes.ok) {
      res.status(502).send("Failed to fetch user info");
      return;
    }

    const userInfo = (await userRes.json()) as User;

    // Create session
    const sessionToken = crypto.randomUUID();
    sessions.set(sessionToken, {
      user: userInfo,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
    });

    res.redirect(`/?token=${sessionToken}`);
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.status(500).send("Internal server error during OAuth callback");
  }
});

oauthRouter.post("/logout", (req, res) => {
  const authHeader = req.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    sessions.delete(authHeader.slice(7));
  }
  res.json({ ok: true });
});

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  const session = sessions.get(token);
  if (!session) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.session = session;
  next();
}
