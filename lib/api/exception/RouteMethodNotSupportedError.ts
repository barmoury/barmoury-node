
export class RouteMethodNotSupportedError extends Error {

    constructor(msg: string) {
        super(msg);
        Object.setPrototypeOf(this, RouteMethodNotSupportedError.prototype);
    }
    
}
