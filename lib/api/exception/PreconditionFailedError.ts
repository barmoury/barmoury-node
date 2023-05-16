
export class PreconditionFailedError extends Error {

    constructor(msg: string) {
        super(msg);
        Object.setPrototypeOf(this, PreconditionFailedError.prototype);
    }
    
}
