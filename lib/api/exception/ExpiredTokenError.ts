
export class ExpiredTokenError extends Error {

    constructor(msg: string) {
        super(msg);
        Object.setPrototypeOf(this, ExpiredTokenError.prototype);
    }
    
}
