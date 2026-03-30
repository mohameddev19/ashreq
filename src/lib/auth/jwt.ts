import { SignJWT, jwtVerify } from "jose";

const COOKIE_NAME = "mashreq_session";

export { COOKIE_NAME };

function getSecret(): Uint8Array {
  const s = process.env.AUTH_JWT_SECRET?.trim();
  if (!s || s.length < 32) {
    throw new Error("AUTH_JWT_SECRET must be set and at least 32 characters");
  }
  return new TextEncoder().encode(s);
}

export async function signSessionToken(payload: {
  sub: string;
  isAdmin: boolean;
}): Promise<string> {
  return new SignJWT({
    admin: payload.isAdmin,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string
): Promise<{ sub: string; isAdmin: boolean } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const sub = payload.sub;
    if (!sub || typeof sub !== "string") return null;
    return {
      sub,
      isAdmin: payload.admin === true,
    };
  } catch {
    return null;
  }
}
