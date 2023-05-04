
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
        this.processResponse.bind(this);
    }

    processResponse(error: Error, errors: BarmouryObject[], logger?: Logger): any {
        logger?.error(`[barmoury.ErrorAdviser]`, error.message, error);
        return new ApiResponse(errors);
    }

    @ErrorAdvise({ errorNames: ["Error", "ValidationError", "DatabaseError", "UniqueConstraintError"] })
    default(error: Error, options?: BarmouryObject) {
        return this.processResponse(error, [error.message], options?.logger);
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
        return this.default(error, options);
    }

    @ErrorAdvise({ errorNames: ["RouteMethodNotSupportedError"], statusCode: 405 })
    routeNotSupportedError(error: Error, options?: BarmouryObject) {
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

}

export function registerErrorAdvisers<T>(fastify: FastifyInstance, options: BarmouryObject, advisers: (new () => T)[]) {
    for (const adviser of advisers) {
        (new adviser() as any);
    }
    fastify.setErrorHandler(function (error: Error, request: FastifyRequest, reply: FastifyReply) {
        //console.log("VVV", "error", error.constructor.name);
        const errorKey = (error as any).validation ? "AjvValidationError" : error.constructor.name;
        const errorAdvice = ErrorAdviserMap[(Fastify.errorCodes as any)[(error as any).code]]
            || ErrorAdviserMap[errorKey] || ErrorAdviserMap["___UnknownError___"];
        if (errorAdvice) {
            reply.code(errorAdvice.statusCode || (error as any).statusCode || 500).send(errorAdvice.fn(error, options));
        } else {
            reply.send(error);
        }
    });
}


