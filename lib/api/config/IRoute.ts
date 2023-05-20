
import { FastifyRequest } from "fastify";
import { antPatternToRegex } from "../../util";

export interface IRoute {
    route: string;
    method: string;
}

export function shouldNotFilter(request: FastifyRequest, prefix: string, openUrlPatterns: any[]): boolean {
    if (!request.url) return false;
    const method = request.method;
    const route = (prefix ? "/" : "") + request.url.replace(prefix || "", "");
    for (const openUrlPattern of openUrlPatterns) {
        if ((typeof openUrlPattern === "string" && (openUrlPattern === route || antPatternToRegex(openUrlPattern).test(route)))
            || (openUrlPattern.method === method && (openUrlPattern.route === route
                || antPatternToRegex(openUrlPattern.route).test(route)))) {
            return true;
        }
    }
    return false;
}
