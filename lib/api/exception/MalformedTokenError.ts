
export class MalformedTokenError extends Error {

    constructor(msg: string) {
        super(msg);
        Object.setPrototypeOf(this, MalformedTokenError.prototype);
    }
    
}
