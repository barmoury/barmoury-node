
import "reflect-metadata";
import { FieldUtil } from "../util";
import { FastifyInstance } from "fastify";
import { Model, Request } from "./model/Model";
import { BarmouryObject } from "../util/Types";
import { RequestMethod } from "./enum/RequestMethod";
import { ContraintValidationError } from "./exception";
export { RequestMapping } from "./decorator/RequestMapping";
import { ControllersValidationMap } from "../validation/Validate";
import { Controller, RouteMethod } from "./controller/Controller";
import { ControllersRequestMap } from "./decorator/RequestMapping";


export * from "./exception";
export * from "./model/Model";
export { Timeo } from "./Timeo";
export * from "./model/ApiResponse";
export * from "./enum/RequestMethod";
export * from "./controller/Controller";
export { ErrorAdviseAttributtes, ErrorAdvise, ErrorAdviser, registerErrorAdvisers } from "./config/ErrorAdviser";

let preHandlerRegistered = false;
const ControllersValidatioQueriesMap: BarmouryObject = {};

export function registerRoutes(fastify: FastifyInstance, opts: { controller: Controller<Model<any, any>, Request>, prefix?: string } | BarmouryObject) {
    let controllerRoute = "";
    const controller = opts.controller;
    const controllerRequestMapping = ControllersRequestMap[controller.constructor.name];
    if (controllerRequestMapping) {
        controllerRoute = (typeof controllerRequestMapping === "string")
            ? controllerRequestMapping
            : controllerRequestMapping.value;
    }
    let konstructor = controller.constructor;
    do {
        Object.getOwnPropertyNames(konstructor.prototype).forEach(name => {
            let val = (controller as any)[name];
            if (typeof val !== "function" || !val.__barmoury_requestMapping && name !== "setup") return;
            if (name === "setup") {
                if (controllerRequestMapping.model) val.bind(controller)(controllerRequestMapping.model);
                else if (typeof controllerRequestMapping == "object") val.bind(controller)(controllerRequestMapping);
                return;
            }
            const route = controllerRoute + ((typeof val.__barmoury_requestMapping === "string")
                ? val.__barmoury_requestMapping
                : val.__barmoury_requestMapping.value || "");
            const method = ((typeof val.__barmoury_requestMapping === "string") ? "get" : val.__barmoury_requestMapping.method || "get");
            const option: BarmouryObject = { schema: {} };
            const key = `${controllerRequestMapping.request}`;
            const routerPath = `${method.toUpperCase()}__${opts.prefix || ""}${route}`.replace(/([^:]\/)\/+/g, "$1");
            if (val.__barmoury_validate_groups) {
                for (const group of val.__barmoury_validate_groups) {
                    const schema = ((ControllersValidationMap[key] || {}).body || {})[group];
                    option.schema.body = FieldUtil.mergeObjects(true, option.schema.body, schema);
                }
                option.schema.body.type = "object";
                if ("__bamoury__validation_queries__" in ControllersValidationMap[key]) {
                    if (!(routerPath in ControllersValidatioQueriesMap)) ControllersValidatioQueriesMap[routerPath] = [];
                    for (const group of val.__barmoury_validate_groups) {
                        const validationQueries = ControllersValidationMap[key]["__bamoury__validation_queries__"][group];
                        if (!validationQueries) continue;
                        ControllersValidatioQueriesMap[routerPath] = FieldUtil.mergeArrays(ControllersValidatioQueriesMap[routerPath], validationQueries);
                    }
                }
            }
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

export function registerController(fastify: FastifyInstance, opts: BarmouryObject, done: any) {
    registerRoutes(fastify, opts);
    done();
}

export function registerControllers(fastify: FastifyInstance, opts: BarmouryObject, controllers: Controller<Model<any, any>, Request>[]) {
    for (const controller of controllers) {
        fastify.register(registerController, { controller, ...opts });
    }

    // register queries validations
    if (!preHandlerRegistered) {
        preHandlerRegistered = true;
        if (opts.sequelize) fastify.addHook("preHandler", async (request, reply) => {
            const key = request.method + "__" + request.routerPath;
            if (key in ControllersValidatioQueriesMap) {
                const id = (request.params as any).id;
                const validationQueries = ControllersValidatioQueriesMap[key];
                if (validationQueries.length) for (const validationQuery of validationQueries) {
                    const value = ((request.body as any) || {})[validationQuery.propertyKey];
                    if (value == undefined) continue;
                    if (!(await validationQuery.validate(opts.sequelize, value, { resourceId: id }))) {
                        throw new ContraintValidationError(validationQuery.message.replace(/{value}+/g, value));
                    }
                }
            }
        });
    }
}
