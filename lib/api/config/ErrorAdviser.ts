
import { ApiResponse } from "../model/ApiResponse";
import { BarmouryObject, Logger } from "../../util/Types";
import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AjvValidationError } from "../exception";

export const ErrorAdviserMap: BarmouryObject = {};

export interface ErrorAdviseAttributtes<T> {
    errors?: any[];
    statusCode?: number;
    errorNames?: string[];
}

export function ErrorAdvise<T>(attr: ErrorAdviseAttributtes<T>) {

    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const response = {
            statusCode: attr.statusCode,
            fn: descriptor.value.bind(target)
        };
        if (attr.errorNames) {
            for (const errorName of attr.errorNames) {
                if (!(errorName in ErrorAdviserMap)) {
                    ErrorAdviserMap[errorName] = response;
                }
            }
        }
        if (attr.errors) {
            for (const error of attr.errors) {
                if (!(error in ErrorAdviserMap)) {
                    ErrorAdviserMap[error] = response;
                }
            }
        }
    };

}

export class ErrorAdviser {

    constructor() {
        this.processResponse = this.processResponse.bind(this);
    }

    processResponse(error: Error, errors: any[], logger?: Logger): any {
        logger?.error(`[barmoury.ErrorAdviser] ${errors[0]}`, error);
        if (errors && errors.length == 1 && errors[0].includes("\n")) errors = errors[0].split("\n");
        return new ApiResponse(errors);
    }

    @ErrorAdvise({ errorNames: ["Error", "ValidationError", "DatabaseError", "UniqueConstraintError", "SequelizeValidationError"] })
    default(error: Error, options?: BarmouryObject) {
        return this.processResponse(error, [options?.msg ?? error.message], options?.logger);
    }

    @ErrorAdvise({ errorNames: ["AjvValidationError"], statusCode: 400 })
    ajvValidationError(error: any, options?: BarmouryObject) {
        const errors = error.validation.map((err: BarmouryObject) => AjvValidationError.cleanError(err, error.group));
        return this.processResponse(error, errors, options?.logger);
    }

    @ErrorAdvise({ errors: [Fastify.errorCodes.FST_ERR_CTP_INVALID_MEDIA_TYPE] })
    invalidMediaTypeError(error: Error, options?: BarmouryObject) {
        return this.processResponse(error, [error.message], options?.logger);
    }

    @ErrorAdvise({ errorNames: ["AccessDeniedError"], statusCode: 403 })
    accessDeniedError(error: Error, options?: BarmouryObject) {
        const msg: string = "Access denied. You do not have access to this resource";
        return this.default(error, { ...options, msg });
    }

    @ErrorAdvise({ errorNames: ["RouteMethodNotSupportedError"], statusCode: 405 })
    routeNotSupportedError(error: Error, options?: BarmouryObject) {
        return this.default(error, options);
    }

    @ErrorAdvise({ errorNames: ["RouteValidatorError", "TokenError"], statusCode: 401 })
    unAuthorized(error: Error, options?: BarmouryObject) {
        return this.default(error, options);
    }

    @ErrorAdvise({ errorNames: ["InvalidParameterError", "ContraintValidationError"], statusCode: 400 })
    badRequestErrors(error: Error, options?: BarmouryObject) {
        return this.default(error, options);
    }

    @ErrorAdvise({ errorNames: ["EntityNotFoundError"], statusCode: 404 })
    notFoundErrors(error: Error, options?: BarmouryObject) {
        return this.default(error, options);
    }

    @ErrorAdvise({ errorNames: ["PreconditionFailedError"], statusCode: 412 })
    preconditionErrors(error: Error, options?: BarmouryObject) {
        return this.default(error, options);
    }

    @ErrorAdvise({ errorNames: ["MalformedTokenError"], statusCode: 401 })
    malformedAuthToken(error: Error, options?: any) {
        const msg: string = "The authorization token is malformed";
        return this.default(error, { ...options, msg });
    }

    @ErrorAdvise({ errorNames: ["FST_JWT_NO_AUTHORIZATION_IN_HEADER", "MissingTokenError"], statusCode: 401 })
    missingAuthToken(error: Error, options?: any) {
        const msg: string = "Authorization token is missing";
        return this.default(error, { ...options, msg });
    }

    @ErrorAdvise({ errorNames: ["FST_JWT_AUTHORIZATION_TOKEN_INVALID"], statusCode: 401 })
    unauthorizedErrors(error: Error, options?: any) {
        const msg: string = "Invalid Authorization token";
        return this.default(error, { ...options, msg });
    }

    @ErrorAdvise({ errorNames: ["FST_JWT_AUTHORIZATION_TOKEN_EXPIRED", "ExpiredTokenError"], statusCode: 401 })
    expiredTokenErrors(error: Error, options?: any) {
        const msg: string = "The authorization token has expired";
        return this.default(error, { ...options, msg });
    }

}

export function registerErrorAdvisers<T>(fastify: FastifyInstance, options: BarmouryObject, advisers: (new (p?: any) => any)[]) {
    for (const adviser of advisers) {
        (new adviser(fastify) as any);
    }
    fastify.setErrorHandler(function (error: Error, request: FastifyRequest, reply: FastifyReply) {
        const errorKey = (error as any).validation ? "AjvValidationError" : error.constructor.name;
        const errorAdvice = ErrorAdviserMap[(Fastify.errorCodes as any)[(error as any).code]]
            ?? ErrorAdviserMap[(error as any).code] ?? ErrorAdviserMap[errorKey] ?? ErrorAdviserMap["___UnknownError___"];

        // TODO properly handle cors https://github.com/fastify/fastify-cors
        reply.header("Access-Control-Allow-Origin", "*");
        reply.header("Access-Control-Allow-Methods", "*");
        reply.header("Access-Control-Allow-Headers", "*");
        reply.header("Access-Control-Max-Age", 1728000);
        reply.header("Access-Control-Allow-Credentials", true);
        // end
        if (errorAdvice) {
            const response = errorAdvice.fn(error, options);
            if (response.name === "FastifyError") delete response["name"];
            reply.code(errorAdvice.statusCode ?? (error as any).statusCode ?? 500).send({ ...response });
        } else {
            reply.send(error);
        }
    });
}


