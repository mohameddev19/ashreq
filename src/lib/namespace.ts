const NS_RE = /^[a-zA-Z0-9_-]{1,80}$/;

export function assertValidNamespaceId(id: unknown): string {
  if (typeof id !== "string" || !NS_RE.test(id)) {
    throw new Error("Invalid namespace id");
  }
  return id;
}
