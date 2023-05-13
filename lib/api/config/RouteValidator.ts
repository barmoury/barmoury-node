
import { IRoute } from "./IRoute";
import { RouteValidatorError } from "../exception";
import { FastifyInstance, FastifyRequest } from "fastify";

export interface IRouteValidator {
    prefix?: string;
    routes: IRoute[] | string[];
    valid: (request: FastifyRequest) => boolean;
}

let registeredRouteValidators = false;
export function registerRouteValidators(fastify: FastifyInstance, routeValidators: IRouteValidator[]) {
    if (registeredRouteValidators) return; registeredRouteValidators = true;
    const mappedRouteValidators: any = {}; // map lookup is faster
    for (const routeValidator of routeValidators) {
        const prefix = (routeValidator.prefix ? `${routeValidator.prefix}/` : "");
        for (const route of routeValidator.routes) {
            const router = typeof route == "string" ? { method: "ANY", route } : route;
            const routerPath = `${prefix}${router.route}`.replace(/([^:]\/)\/+/g, "$1");
            const key = `${router.method}<=#=>${routerPath}`;
            mappedRouteValidators[key] = routeValidator.valid;
        }
    }
    fastify.addHook("onRequest", async (request: any, reply) => {
        const valid = mappedRouteValidators[`${request.method}<=#=>${request.routerPath}`]
            || mappedRouteValidators[`ANY<=#=>${request.routerPath}`];
        if (valid && !valid(request)) throw new RouteValidatorError("Validation failed for the request");
    });
}
