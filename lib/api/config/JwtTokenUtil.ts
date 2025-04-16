
import { IRoute } from "./IRoute";
import { FastifyRequest } from "fastify";
import { IEncryptor } from "../../crypto";
import { BarmouryObject } from "../../util";
import { createSigner, createVerifier } from "fast-jwt";
import { ValueGenerator } from "../../testing/ValueGenerator";
import { initUserDetails, UserDetails } from "../model/UserDetails";
import { ExpiredTokenError, MalformedTokenError } from "../exception";

export const BARMOURY_JWT_SUB = "sub";
export const BARMOURY_JWT_DATA = "_BJD_";
export const BARMOURY_JWT_LANGUAGE = "_BJL_";
export const BARMOURY_JWT_AUTHORITIES = "_BJA_";

// TODO move to auto wiring
let registeredFastifyJwt = false;
let __BarmouryJwtDefaultSecret__: string;
let __BarmouryJwtTokenEntryMap__: BarmouryObject = {};
let __BarmouryJwtAuthorityPrefix__: string | undefined;
let __BarmouryJwtDefaultEncryptor__: IEncryptor<any> | undefined;
// TODO END move to auto wiring

export interface IJwtOptions {
    prefix?: string;
    authorityPrefix?: string;
    encryptor?: IEncryptor<any>;
    secrets: { [index: string]: string; };
    openUrlPatterns?: IRoute[] | string[];
    validate?: <T>(request: FastifyRequest, group: string, user: UserDetails<T>) => boolean;
}

export class JwtTokenUtil {

    secret?: string;
    authorityPrefix?: string;
    encryptor?: IEncryptor<any>;

    getSecret(key?: string | null) {
        if (key && key in __BarmouryJwtTokenEntryMap__) return __BarmouryJwtTokenEntryMap__[key] ?? __BarmouryJwtDefaultSecret__;
        if (!__BarmouryJwtDefaultSecret__) __BarmouryJwtDefaultSecret__ = ValueGenerator.generateRandomString(98);
        return __BarmouryJwtDefaultSecret__;
    }

    log(message: string, error: any) {
        // TODO
    }

    getEncryptor() {
        return this.encryptor ?? __BarmouryJwtDefaultEncryptor__;
    }

    getAuthorityPrefix() {
        return this.authorityPrefix ?? __BarmouryJwtAuthorityPrefix__;
    }

    setEncryptor(encryptor: IEncryptor<any>) {
        this.encryptor = encryptor;
    }

    getAllClaimsFromToken(key: string, token: string): BarmouryObject<any> {
        const secret = this.getSecret(key);
        return createVerifier({ key: secret })(token).payload;
    }

    getIdFromToken(key: string, token: string) {
        const claims = this.getAllClaimsFromToken(key, token);
        return claims["sub"];
    }

    getAuthoritiesFromToken(key: string, token: string) {
        const claims = this.getAllClaimsFromToken(key, token);
        return claims[BARMOURY_JWT_AUTHORITIES];
    }

    getClaimFromToken<T>(key: string, token: string, claimsResolver: (claims: BarmouryObject<any>) => T) {
        const claims = this.getAllClaimsFromToken(key, token);
        return claimsResolver(claims);
    }

    getExpirationDateFromToken(key: string, token: string) {
        return this.getClaimFromToken(key, token, (claims) => new Date(parseInt(claims["exp"])));
    }

    isTokenExpired(key: string, token: string) {
        const expirationDate = this.getExpirationDateFromToken(key, token).getTime();
        return expirationDate < (new Date()).getTime();
    }

    isValid<T>(key: string, tokenOrUserDetails: string | UserDetails<T>, userDetails?: UserDetails<T>) {
        if (key && typeof tokenOrUserDetails === "string" && userDetails) {
            const token = tokenOrUserDetails;
            const id = this.getIdFromToken(key, token);
            return id === userDetails.getId() && !this.isTokenExpired(key, token);
        } else if (key && typeof tokenOrUserDetails !== "string" && !userDetails) {
            const secret = this.getSecret();
            const claims = createVerifier({ key: secret })(key).payload;
            const id = claims[BARMOURY_JWT_SUB];
            const expirationDate = new Date(parseInt(claims["exp"])).getTime();
            return id === tokenOrUserDetails.getId() && (expirationDate < (new Date()).getTime());
        }
        throw new Error("Not Implemented!");
    }

    validate<T>(key: string, token?: string | BarmouryObject<any>) {
        if (!token) {
            token = key;
            key = undefined as any;
        }
        const encryptor = this.getEncryptor();
        const claims = (typeof token === "string" ? this.getAllClaimsFromToken(key, token) : token);
        const data = (encryptor ? encryptor.decrypt(claims[BARMOURY_JWT_DATA]) : claims[BARMOURY_JWT_DATA]);
        const subject = (encryptor ? encryptor.decrypt(claims[BARMOURY_JWT_SUB]) : claims[BARMOURY_JWT_SUB]);
        const language = (encryptor ? encryptor.decrypt(claims[BARMOURY_JWT_LANGUAGE]) : claims[BARMOURY_JWT_LANGUAGE]);
        const authorities = (encryptor ? encryptor.decrypt(claims[BARMOURY_JWT_AUTHORITIES]) : claims[BARMOURY_JWT_AUTHORITIES]);
        const authorityPrefix = this.getAuthorityPrefix() || this.getAuthorityPrefix()?.length == 0 ? this.getAuthorityPrefix() : "ROLE_";
        return initUserDetails(subject, authorities, data, language, authorityPrefix) as UserDetails<T>;
    }

    generateToken<T>(key: string | null | undefined, userDetails: UserDetails<T>, tokenExpiryInSeconds: number) {
        const encryptor = this.getEncryptor();
        const claims: BarmouryObject<any> = {};
        const expiryDate = new Date((new Date()).getTime() + (tokenExpiryInSeconds * 1000));
        const subject = (encryptor ? encryptor.encrypt(userDetails.getId()) : userDetails.getId());
        claims[BARMOURY_JWT_DATA] = (encryptor ? encryptor.encrypt(userDetails.getData()) : userDetails.getData());
        claims[BARMOURY_JWT_LANGUAGE] = (encryptor ? encryptor.encrypt(userDetails.getLanguage()) : userDetails.getLanguage());
        claims[BARMOURY_JWT_AUTHORITIES] = (encryptor ? encryptor.encrypt(userDetails.getAuthorities()) : userDetails.getAuthorities());
        return this.doGenerateToken(key, claims, subject, expiryDate);
    }

    doGenerateToken(key: string | null | undefined, claims: BarmouryObject<any>, subject: string, expiryDate: Date) {
        const jwsSignSync = createSigner({ key: this.getSecret(key), expiresIn: expiryDate.getTime() });
        claims[BARMOURY_JWT_SUB] = subject;
        return jwsSignSync(claims);
    }

}

export function __barmouryFindActiveToken(authToken: string): { key: string; decoded: any; } {
    const secretsEntries = Object.entries(__BarmouryJwtTokenEntryMap__);
    let index = 0, length = secretsEntries.length;
    for (const [key, value] of secretsEntries) {
        try {
            return {
                key,
                decoded: createVerifier({ key: value })(authToken),
            };
        } catch (error: any) {
            if (error.message.includes("expired")) {
                throw new ExpiredTokenError(error.message);
            } else if (error.message.includes("malformed")) {
                throw new MalformedTokenError(error.message);
            }
            if (index == (length - 1)) {
                throw error;
            }
        }
        index++;
    }
    return { key: "", decoded: null }
}

export function __barmouryRegisterJwtParameters(opts: IJwtOptions) {
    if (registeredFastifyJwt) return; registeredFastifyJwt = true;
    Object.keys(opts.secrets ?? {}).forEach((key) => {
        __BarmouryJwtTokenEntryMap__[key] = (opts.secrets ?? {})[key];
    });
    __BarmouryJwtDefaultEncryptor__ = opts.encryptor;
    __BarmouryJwtAuthorityPrefix__ = opts.authorityPrefix;
}