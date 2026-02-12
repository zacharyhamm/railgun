import crypto from "node:crypto";
import {
  type NextFunction,
  type Request,
  type Response,
  Router,
} from "express";
import redis from "./redis";

const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID ?? "";
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET ?? "";

const SESSION_TTL = 86400; // 24 hours in seconds
const STATE_TTL = 600; // 10 minutes in seconds

const OAUTH_AUTH_URL = "https://backboard.railway.com/oauth/auth";
const OAUTH_TOKEN_URL = "https://backboard.railway.com/oauth/token";
const OAUTH_USERINFO_URL = "https://backboard.railway.com/oauth/me";

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

export const oauthRouter = Router();

oauthRouter.get("/authorize", async (req, res) => {
  const state = crypto.randomUUID();
  await redis.set(`oauth-state:${state}`, "1", "EX", STATE_TTL);

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

  res.redirect(`${OAUTH_AUTH_URL}?${params}`);
});

oauthRouter.get("/callback", async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!state || (await redis.del(`oauth-state:${state as string}`)) === 0) {
      res.status(400).send("Invalid or missing state parameter");
      return;
    }

    if (!code) {
      res.status(400).send("Missing authorization code");
      return;
    }

    const redirectUri = `${req.protocol}://${req.get("host")}/oauth/callback`;

    // Exchange code for tokens
    const tokenRes = await fetch(OAUTH_TOKEN_URL, {
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
    const userRes = await fetch(OAUTH_USERINFO_URL, {
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
    const session: Session = {
      user: userInfo,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
    };
    await redis.set(
      `session:${sessionToken}`,
      JSON.stringify(session),
    );

    res.redirect(`/?token=${sessionToken}`);
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.status(500).send("Internal server error during OAuth callback");
  }
});

oauthRouter.post("/logout", async (req, res) => {
  const authHeader = req.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    await redis.del(`session:${authHeader.slice(7)}`);
  }
  res.json({ ok: true });
});

export async function authMiddleware(
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
  const data = await redis.get(`session:${token}`);
  if (!data) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  req.session = JSON.parse(data) as Session;
  next();
}
