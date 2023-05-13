
import { IRoute } from "./IRoute";
import { IEncryptor } from "../../crypto";
import { AccessDeniedError } from "../exception";
import { FastifyInstance, FastifyRequest } from "fastify";
import { UserDetails, initUserDetails } from "../model/UserDetails"
import { BarmouryObject, FieldUtil, antPatternToRegex } from "../../util";

const fastifyJwt = require('@fastify/jwt');

export const BARMOURY_DATA = "BARMOURY_DATA";
export const BARMOURY_AUTHORITIES = "BARMOURY_AUTHORITIES";

export interface IJwtOptions {
    secret: string;
    prefix?: string;
    authorityPrefix?: string;
    encryptor?: IEncryptor<any>;
    openUrlPatterns: IRoute[] | string[];
    validate?: <T>(request: FastifyRequest, user: UserDetails<T>) => boolean;
}

function shouldNotFilter(request: FastifyRequest, prefix: string, openUrlPatterns: any[]): boolean {
    if (!request.routerPath) return false;
    const method = request.method;
    const route = (prefix ? "/" : "") + request.routerPath.replace(prefix || "", "");
    for (const openUrlPattern of openUrlPatterns) {
        if ((typeof openUrlPattern === "string" && antPatternToRegex(openUrlPattern).test(route))
            || (openUrlPattern.method === method && antPatternToRegex(openUrlPattern.route).test(route))) {
            return true;
        }
    }
    return false;
}

let signInjected = false;
let registeredFastifyJwt = false;
export function registerJwt(fastify: FastifyInstance, opts: IJwtOptions) {
    if (registeredFastifyJwt) return; registeredFastifyJwt = true;
    const jwtOptions = FieldUtil.cloneObjects(["encryptor", "prefix", "validate", "openUrlPatterns"], opts);
    fastify.register(fastifyJwt, jwtOptions);
    fastify.addHook("onRequest", async (request: any, reply) => {
        if (!signInjected && (fastify as any)?.jwt) {
            const realSign = (fastify as any).jwt.sign;
            (fastify as any).jwt.sign = (...params: any[]) => {
                if (("id" in params[0]) && ("data" in params[0]) && ("authoritiesValues" in params[0])) {
                    delete params[0]["authorityPrefix"];
                    params[0]["sub"] = params[0]["id"]; delete params[0]["id"];
                    params[0][BARMOURY_DATA] = params[0]["data"]; delete params[0]["data"];
                    params[0][BARMOURY_AUTHORITIES] = params[0]["authoritiesValues"]; delete params[0]["authoritiesValues"];
                }
                if (opts.encryptor) {
                    const payload: any = params[0];
                    const encryptedPayload: BarmouryObject = {};
                    Object.keys(payload).forEach(key => encryptedPayload[key] = opts.encryptor?.encrypt(payload[key]));
                    params[0] = encryptedPayload;
                }
                return realSign.bind((fastify as any).jwt)(...params);
            };
            signInjected = true;
        }
        if (shouldNotFilter(request, (opts.prefix || fastify.prefix), opts.openUrlPatterns)) {
            return;
        }
        await request.jwtVerify();
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
            if (opts.validate && !opts.validate(request, request.user)) {
                throw new AccessDeniedError("User details validation failed");
            }
        }
    })
}
