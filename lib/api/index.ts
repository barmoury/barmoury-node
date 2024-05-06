
import "reflect-metadata";
import { FieldUtil } from "../util";
import { FastifyInstance } from "fastify";
import { Model, Request } from "./model/Model";
import { BarmouryObject } from "../util/Types";
import { RequestMethod } from "./enum/RequestMethod";
import { ControllersValidationMap } from "../validation/Validated";
import { Controller, RouteMethod } from "./controller/Controller";
import { ControllersRequestMap } from "./decorator/RequestMapping";
import { AccessDeniedError, ConstraintValidationError } from "./exception";


export * from "./Timeo";
export * from "./exception";
export * from "./model/Model";
export * from "./config/IRoute";
export * from "./decorator/Secured";
export * from "./config/JwtManager";
export * from "./model/ApiResponse";
export * from "./model/UserDetails";
export * from "./enum/RequestMethod";
export * from "./config/ErrorAdviser";
export * from "./config/RouteValidator";
export * from "./controller/Controller";
export * from "./decorator/RequestMapping";
export * from "./config/RequestAuditorAdapter";
export * from "./controller/BactuatorController";

let preHandlerRegistered = false;
const ControllersValidationQueriesMap: BarmouryObject = {};

export function registerControllers(fastify: FastifyInstance, opts: BarmouryObject, controllers: Controller<Model<any, any>, Request>[]) {
    for (const controller of controllers) {
        fastify.register(registerController, { controller, ...opts });
    }
    if (opts.bacuator) {
        if (opts.sequelize) opts.bacuator.sequelize = opts.sequelize;
        fastify.register(registerController, { controller: opts.bacuator, ...opts });
    }

    // register queries validations
    if (!preHandlerRegistered) {
        preHandlerRegistered = true;
        if (opts.sequelize) fastify.addHook("preHandler", async (request, reply) => {
            const key = request.method + "__" + request.routeOptions.url;
            if (key in ControllersValidationQueriesMap) {
                const id = (request.params as any).id;
                const body = (request.body as any) ?? {};
                const validationQueries = ControllersValidationQueriesMap[key];
                if (validationQueries.length) for (const validationQuery of validationQueries) {
                    const value = body[validationQuery.propertyKey];
                    if (value == undefined) continue;
                    if (!(await validationQuery.validate(opts.sequelize, value, { body, resourceId: id }))) {
                        throw new ConstraintValidationError(validationQuery.message.replace(/{value}+/g, value));
                    }
                }
            }
        });
    }
}

export function registerController(fastify: FastifyInstance, opts: BarmouryObject, done: any) {
    registerRoutes(fastify, opts);
    done();
}

export function registerRoutes(fastify: FastifyInstance, opts: { controller: Controller<Model<any, any>, Request>, prefix?: string } | BarmouryObject) {
    let controllerRoute = "";
    const controller = opts.controller;
    const controllerRequestMapping = ControllersRequestMap[controller.constructor.name];
    if (controllerRequestMapping) {
        controllerRoute = (typeof controllerRequestMapping === "string")
            ? controllerRequestMapping
            : controllerRequestMapping.value;
    }
    const routesSet = new Set<string>();
    let konstructor = controller.constructor;
    do {
        Object.getOwnPropertyNames(konstructor.prototype).forEach(name => {
            let val = (controller as any)[name];
            if (typeof val !== "function" || !val.__barmoury_requestMapping && name !== "setup") return;
            if (name === "setup") {
                if (controllerRequestMapping.model) val.bind(controller)(controllerRequestMapping.model, fastify);
                else if (typeof controllerRequestMapping == "object") val.bind(controller)(controllerRequestMapping);
                return;
            }
            const route = controllerRoute + ((typeof val.__barmoury_requestMapping === "string")
                ? val.__barmoury_requestMapping
                : val.__barmoury_requestMapping.value || "");
            const method = ((typeof val.__barmoury_requestMapping === "string") ? "get" : val.__barmoury_requestMapping.method || "get");
            const option: BarmouryObject = { schema: {} };
            const routerPath = `${method.toUpperCase()}__${opts.prefix ?? ""}${route}`.replace(/([^:]\/)\/+/g, "$1");
            if (routesSet.has(routerPath)) return;
            routesSet.add(routerPath);
            // auto wire body validation
            if (val.__barmoury_validate) {
                const { model, groups } = val.__barmoury_validate;
                const key = `${model ?? controllerRequestMapping.request}`;
                for (const group of groups) {
                    const schema = ((ControllersValidationMap[key] ?? {}).body ?? {})[group];
                    option.schema.body = FieldUtil.mergeObjects(true, option.schema.body, schema);
                }
                option.schema.body.type = "object";
                if ((key in ControllersValidationMap) && "__barmoury__validation_queries__" in ControllersValidationMap[key]) {
                    if (!(routerPath in ControllersValidationQueriesMap)) ControllersValidationQueriesMap[routerPath] = [];
                    for (const group of groups) {
                        const validationQueries = ControllersValidationMap[key]["__barmoury__validation_queries__"][group];
                        if (!validationQueries) continue;
                        ControllersValidationQueriesMap[routerPath] = FieldUtil.mergeArrays(ControllersValidationQueriesMap[routerPath], validationQueries);
                    }
                }
                if (val.__barmoury_requestMapping.bodySchema) {
                    option.schema.body = FieldUtil.mergeObjects(true, option.schema.body, val.__barmoury_requestMapping.bodySchema);
                }
            }
            // auto wire params validation
            if (val.__barmoury_requestMapping.paramsSchema) option.schema.params = val.__barmoury_requestMapping.paramsSchema;
            // auto wire query validation
            if (val.__barmoury_requestMapping.querySchema) option.schema.querystring = val.__barmoury_requestMapping.querySchema;
            // auto wire headers validation
            if (val.__barmoury_requestMapping.headersSchema) option.schema.headers = val.__barmoury_requestMapping.headersSchema;
            // auto wire the @Secured roles check
            if (val.__barmoury_secured) {
                const valFn = val.bind(controller);
                const modifiedVal = async (...args: any[]) => {
                    const fastifyRequest = args[0];
                    const roles: string[] = (fastifyRequest.user?.authorityPrefix != undefined && fastifyRequest.user?.authorityPrefix != null)
                        ? val.__barmoury_secured.map((role: string) => `${fastifyRequest.user?.authorityPrefix}${role}`)
                        : val.__barmoury_secured;
                    if (fastifyRequest.authoritiesValues) {
                        const authoritiesValues = fastifyRequest.authoritiesValues;
                        if (!authoritiesValues.some((r: string) => roles?.includes(r))) {
                            throw new AccessDeniedError(Controller.ACCESS_DENIED);
                        }
                    }
                    return await valFn(...args);
                };
                modifiedVal.__barmoury_secured = val.__barmoury_secured;
                val = modifiedVal;
            }
            // set the handlers
            switch (method) {
                case RequestMethod.PUT: fastify.put(route, option, val.bind(controller)); break;
                case RequestMethod.HEAD: fastify.head(route, option, val.bind(controller)); break;
                case RequestMethod.POST: fastify.post(route, option, val.bind(controller)); break;
                case RequestMethod.PATCH: fastify.patch(route, option, val.bind(controller)); break;
                case RequestMethod.TRACE: fastify.options(route, option, val.bind(controller)); break;
                case RequestMethod.DELETE: fastify.delete(route, option, val.bind(controller)); break;
                case RequestMethod.OPTIONS: fastify.options(route, option, val.bind(controller)); break;
                default: fastify.get(route, option, val.bind(controller));
            }
        });
        konstructor = Object.getPrototypeOf(konstructor);
    } while (konstructor && konstructor.name && konstructor.name !== "Object");
}
