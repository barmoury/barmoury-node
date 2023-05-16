
export class AccessDeniedError extends Error {

    constructor(msg: string) {
        super(msg);
        Object.setPrototypeOf(this, AccessDeniedError.prototype);
    }
    
}
