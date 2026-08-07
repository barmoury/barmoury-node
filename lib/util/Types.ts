
export type BarmouryObject<T = any> = { [index: string]: T; };
export type CallBack = (...args: any[]) => any;
export type Logger = {
    info: (...args: any[]) => any,
    warn: (...args: any[]) => any,
    error: (...args: any[]) => any,
    verbose: (...args: any[]) => any,
}