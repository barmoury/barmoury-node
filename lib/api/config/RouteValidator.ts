
import { IRoute } from "./IRoute";
import { RouteValidatorError } from "../exception";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

export interface IRouteValidator {
    prefix?: string;
    routes: IRoute[] | string[];
    valid: (request: FastifyRequest, reply: FastifyReply) => Promise<boolean>;
}

let registeredRouteValidators = false;
export function registerRouteValidators(fastify: FastifyInstance, routeValidators: IRouteValidator[]) {
    if (registeredRouteValidators) return; registeredRouteValidators = true;
    const mappedRouteValidators: any = {}; // map lookup is faster
    for (const routeValidator of routeValidators) {
        const prefix = (routeValidator.prefix ? `${routeValidator.prefix}/` : "");
        for (const route of routeValidator.routes) {
            const router = typeof route == "string" ? { method: "ANY", route } : route;
            const path = `${prefix}${router.route}`.replace(/([^:]\/)\/+/g, "$1");
            const key = `${router.method}<=#=>${path}`;
            mappedRouteValidators[key] = routeValidator.valid;
        }
    }
    fastify.addHook("onRequest", async (request: any, reply: any) => {
        const valid = mappedRouteValidators[`${request.method}<=#=>${request.routeOptions.url}`]
            ?? mappedRouteValidators[`ANY<=#=>${request.routeOptions.url}`];
        if (valid && !(await valid(request, reply))) throw new RouteValidatorError("Validation failed for the request");
    });
}
