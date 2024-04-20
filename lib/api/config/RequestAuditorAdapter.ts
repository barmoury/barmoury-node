
import { Device, IpData } from "../../trace";
import { IRoute, shouldNotFilter } from "./IRoute";
import { AuditAttributes, Auditor } from "../../audit";
import { FastifyInstance, FastifyRequest } from "fastify";

export interface RequestAuditorAdapterOptions {
    prefix?: string;
    hooks?: string[];
    getAuditor: () => Auditor<any>;
    beforeAuditable?: <T>(object: T) => T;
    excludeUrlPatterns?: IRoute[] | string[];
    getIpData: (ipAddress: string) => Promise<IpData>;
    headerSanitizer?: (headerName: string, value: any) => any;
    resolve?: <T>(request: FastifyRequest, audit: AuditAttributes<T>) => AuditAttributes<T>;
}

let RequestAuditorAdapter: any;

export function registerRequestAuditorAdapter(fastify: FastifyInstance, opts: RequestAuditorAdapterOptions) {
    if (!opts.hooks || !opts.hooks.length) {
        opts.hooks = ["preValidation"];
    }
    opts.headerSanitizer = opts.headerSanitizer || ((headerName: string, value: any): any => {
        if (headerName.includes("authorization") || headerName.includes("key")) return "**********"
        return value;
    });
    if (!RequestAuditorAdapter) RequestAuditorAdapter = async (request: any, reply: any) => {
        if (opts.excludeUrlPatterns && shouldNotFilter(request, (opts.prefix || fastify.prefix), opts.excludeUrlPatterns)) {
            return;
        }
        const IpData = await opts.getIpData(request.ip);
        const extraData: any = {
            parameters: request.query,
            headers: Object.entries(request.headers).reduce((acc: any, value: any[]) => {
                acc[value[0]] = opts.headerSanitizer!(value[0], value[1]);
                return acc;
            }, {}),
        };
        const audit = {
            extraData,
            isp: IpData.isp,
            type: "HTTP.REQUEST",
            ipAddress: request.ip,
            action: request.method,
            location: IpData.location,
            source: request.routeOptions.url ?? "",
            device: Device.build(request.headers["user-agent"]),
            auditable: (opts.beforeAuditable && request.body ? opts.beforeAuditable(request.body) : request.body)
        };
        opts.getAuditor().audit(opts.resolve ? opts.resolve(request, audit) : audit);
    };
    opts.hooks.forEach((hook: any) => fastify.addHook(hook,  RequestAuditorAdapter));
}


