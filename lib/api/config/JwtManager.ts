
import { FastifyInstance } from "fastify";
import { shouldNotFilter } from "./IRoute";
import { AccessDeniedError } from "../exception";
import { MissingTokenError } from "../exception";
import { __barmouryFindActiveToken, __barmouryRegisterJwtParameters, BARMOURY_JWT_AUTHORITIES, BARMOURY_JWT_DATA, IJwtOptions, JwtTokenUtil } from "./JwtTokenUtil";


export function registerJwt(fastify: FastifyInstance, opts: IJwtOptions) {
    __barmouryRegisterJwtParameters(opts);

    fastify.addHook("onRequest", async (request: any, _) => {
        if (opts.openUrlPatterns && shouldNotFilter(request, (opts.prefix || fastify.prefix), opts.openUrlPatterns)) {
            return;
        }
        let authotization = (request.headers.authorization as string ?? "").split(" ");
        if (authotization.length < 2) {
            throw new MissingTokenError("authorization token is missing");
        }
        const result = __barmouryFindActiveToken(authotization[1]);
        request.user = result.decoded;
        if ((BARMOURY_JWT_DATA in request.user) && (BARMOURY_JWT_AUTHORITIES in request.user)) {
            request.user = new JwtTokenUtil().validate(result.key, request.user);
            request.authoritiesValues = request.user.getAuthorities();
            if (opts.validate && !opts.validate(request, result.key, request.user)) {
                throw new AccessDeniedError("User details validation failed");
            }
        }
    })
}
