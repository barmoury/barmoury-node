
export class RouteValidatorError extends Error {

    constructor(msg: string) {
        super(msg);
        Object.setPrototypeOf(this, RouteValidatorError.prototype);
    }
    
}
