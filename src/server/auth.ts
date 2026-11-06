import { currentCaller, type Caller } from "./session";

export type { Caller };

/** Who is calling OOTD's own API: the account in the signed session cookie, or null. */
export async function callerFrom(_request: Request): Promise<Caller | null> {
  return currentCaller();
}
