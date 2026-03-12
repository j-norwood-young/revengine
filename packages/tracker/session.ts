import crypto from "crypto";

export const get_session = (browser_id: string, user_ip: string) => {
    return crypto.createHash("md5").update(`${browser_id}-${user_ip}-${new Date().toISOString().split("T")[0]}`).digest("base64url").slice(0, 10);
}