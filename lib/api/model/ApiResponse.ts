import { FastifyReply } from "fastify";
import { InvalidParameterError } from "../exception";

export class ApiResponse<T> {

    data?: T;
    errors?: any[];
    message?: String;
    success?: boolean;
    _statusCode?: number;

    constructor(param: any, ...params: any[]) {
        if (typeof param == "object" && !(param instanceof Array)) {
            this._statusCode = param.statusCode;
            param = param.param;
        }
        if (params.length == 0) {
            if (param instanceof Array) {
                this.errors = param;
                this.success = false;
                this.message = `${param[0]}`;
            } else {
                this.data = param;
                this.success = !!param;
            }
        } else if (params.length == 1) {
            if (param instanceof Array) {
                this.errors = param;
                this.success = false;
                if (typeof params[0] === "string") {
                    this.message = params[0];
                } else {
                    throw new InvalidParameterError("Invalid argument, expecting a string as second parameter");
                }
            } else {
                this.data = param;
                this.success = true;
                if (typeof params[0] === "boolean") {
                    this.success = params[0];
                } else if (typeof params[0] === "string") {
                    this.message = params[0];
                } else {
                    throw new InvalidParameterError("Invalid argument, expecting a string or boolean as second parameter");
                }
            }
        } else if (params.length == 2) {
            this.data = param;
            if (typeof params[0] === "string" || typeof params[1] === "boolean") {
                throw new InvalidParameterError("Invalid argument, expecting a (any, string, boolean) as second parameter");
            }
            this.message = params[0];
            this.success = params[1];
        } else {
            throw new InvalidParameterError("Invalid number of argument");
        }
    }

    reply(reply: FastifyReply, statusCode?: number) {
        const code = statusCode || this._statusCode;
        delete this._statusCode;
        return reply.code(code || 200).send(this);
    }

    r(reply: FastifyReply, statusCode?: number) {
        return this.reply(reply, statusCode);
    }

    static build(statusCode: number, param: any, ...params: any[]) {
        return new ApiResponse({ param, statusCode }, ...params);
    }

    static buildError(statusCode: number, param: any, ...params: any[]) {
        return new ApiResponse({ param, statusCode }, ...params);
    }

    static noContent(reply?: FastifyReply) {
        if (reply) return reply.code(204).send();
        return new ApiResponse({ params: {}, statusCode: 204 });
    }

}
