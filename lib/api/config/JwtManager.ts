
import { IEncryptor } from "../../crypto";
import { createVerifier } from "fast-jwt";
import { AccessDeniedError } from "../exception";
import { IRoute, shouldNotFilter } from "./IRoute";
import { BarmouryObject, FieldUtil } from "../../util";
import { FastifyInstance, FastifyRequest } from "fastify";
import { UserDetails, initUserDetails } from "../model/UserDetails";
import { MalformedTokenError, ExpiredTokenError, MissingTokenError } from "../exception";

export const BARMOURY_DATA = "BARMOURY_DATA";
export const BARMOURY_AUTHORITIES = "BARMOURY_AUTHORITIES";

export interface IJwtOptions {
    prefix?: string;
    authorityPrefix?: string;
    encryptor?: IEncryptor<any>;
    secrets: { [index: string]: string; };
    openUrlPatterns?: IRoute[] | string[];
    validate?: <T>(request: FastifyRequest, group: string, user: UserDetails<T>) => boolean;
}

let registeredFastifyJwt = false;

export function registerJwt(fastify: FastifyInstance, opts: IJwtOptions) {
    if (registeredFastifyJwt) return; registeredFastifyJwt = true;
    fastify.addHook("onRequest", async (request: any, _) => {
        if (opts.openUrlPatterns && shouldNotFilter(request, (opts.prefix || fastify.prefix), opts.openUrlPatterns)) {
            return;
        }
        let authotization = (request.headers.authorization as string ?? "").split(" ");
        if (authotization.length < 2) {
            throw new MissingTokenError("Authorization token is missing");
        }
        const result = findActiveToken(authotization[1], opts.secrets);
        request.user = result.payload;
        if (opts.encryptor) {
            const encryptedPayload = request.user;
            Object.keys(encryptedPayload).forEach(key =>
                request.user[key] = typeof encryptedPayload[key] === "string"
                    ? opts.encryptor?.decrypt(encryptedPayload[key]) : encryptedPayload[key]);
        }
        const payload = request.user;
        if (("sub" in payload) && (BARMOURY_DATA in payload) && (BARMOURY_AUTHORITIES in payload)) {
            const authorityPrefix = opts.authorityPrefix || opts.authorityPrefix?.length == 0 ? opts.authorityPrefix : "ROLE_";
            request.user = initUserDetails(payload["sub"],
                payload[BARMOURY_AUTHORITIES],
                payload[BARMOURY_DATA],
                authorityPrefix);
            request.authoritiesValues = request.user.authoritiesValues;
            if (opts.validate && !opts.validate(request, result.key, request.user)) {
                throw new AccessDeniedError("User details validation failed");
            }
        }
    })
}

function findActiveToken(authToken: string, secrets: { [index: string]: string; }): { key: string; payload: any; } {
    const secretsEntries = Object.entries(secrets);
    let index = 0, length = secretsEntries.length;
    for (const [key, value] of secretsEntries) {
        try {
            return {
                key,
                payload: createVerifier({ key: value })(authToken)
            };
        } catch (error: any) {
            if (error.message.includes("expired")) {
                throw new ExpiredTokenError(error.message);
            } else if (error.message.includes("malformed")) {
                throw new MalformedTokenError(error.message);
            }
            if (index == (length-1)) {
                throw error;
            }
        }
        index++;
    }
    return { key: "", payload: null }
}
