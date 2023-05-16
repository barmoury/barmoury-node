
import { randomUUID } from "crypto";
import { FastifyInstance } from "fastify";
import { Device, IpData } from "../../trace";
import { IRoute, shouldNotFilter } from "./IRoute";
import { AuditAttributes, Auditor } from "../../audit";

export interface RequestAuditorAdapterOptions {
    prefix?: string;
    hooks?: string[];
    getAuditor: () => Auditor<any>;
    beforeAuditable?: <T>(object: T) => T;
    openUrlPatterns?: IRoute[] | string[];
    getIpData: (ipAddress: string) => IpData;
    resolve?: <T>(audit: AuditAttributes<T>) => AuditAttributes<T>;
}

let RequestAuditorAdapter: any;

export function registerRequestAuditorAdapter(fastify: FastifyInstance, opts: RequestAuditorAdapterOptions) {
    if (!opts.hooks || !opts.hooks.length) {
        opts.hooks = ["preValidation"];
    }
    if (!RequestAuditorAdapter) RequestAuditorAdapter = async (request: any, reply: any) => {
        if (opts.openUrlPatterns && shouldNotFilter(request, (opts.prefix || fastify.prefix), opts.openUrlPatterns)) {
            return;
        }
        const IpData = opts.getIpData(request.ip);
        const extraData: any = {
            parameters: request.query,
            headers: Object.entries(request.headers).reduce((acc: any, value: any[]) => {
                acc[value[0]] = (value[0].includes("authorization") || value[0].includes("key")) ? "**********" : value[1];
                return acc;
            }, {}),
        };
        const audit = {
            extraData,
            isp: IpData.isp,
            auditId: randomUUID(),
            type: "HTTP.REQUEST",
            ipAddress: request.ip,
            action: request.method,
            location: IpData.location,
            source: request.routerPath,
            device: Device.build(request.headers["user-agent"]),
            auditable: (opts.beforeAuditable && request.body ? opts.beforeAuditable(request.body) : request.body)
        };
        opts.getAuditor().audit(opts.resolve ? opts.resolve(audit) : audit);
    };
    opts.hooks.forEach((hook: any) => fastify.addHook(hook,  RequestAuditorAdapter));
}


