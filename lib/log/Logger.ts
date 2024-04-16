
import { Cache } from "../cache";
import { FieldUtil, Util } from "../util";
import { Log, LogAttributes } from "./Log";

export abstract class Logger {

    bufferSize = 0;
    dateLastFlushed = new Date();

    abstract flush(): Promise<void>;
    abstract preLog(log: LogAttributes): void;
    abstract getCache(): Cache<LogAttributes>;

    async log(log: LogAttributes) {
        this.preLog(log);
        this.bufferSize++;
        if (Util.cacheWriteAlong(this.bufferSize, this.dateLastFlushed, this.getCache(), log)) {
            this.bufferSize = 0;
            this.dateLastFlushed = new Date();
            this.flush();
        }
    }

    formatContent(format: string, ...args: any[]) {
        return FieldUtil.strFormat(format, ...args);
    }

    verbose(format: string, ...args: any[]): any {
        this.log({ level: Log.Level.VERBOSE, content: this.formatContent(format, ...args) });
    }

    info(format: string, ...args: any[]): any {
        this.log({ level: Log.Level.INFO, content: this.formatContent(format, ...args) });
    }

    warn(format: string, ...args: any[]): any {
        this.log({ level: Log.Level.WARN, content: this.formatContent(format, ...args) });
    }

    error(param: string | Error, ...args: any[] | Error[]): any{
        const content = typeof param == "string" ? param : param.message ;
        if (typeof param != "string") {
            args = [ param, ...args ];
        }
        if (args.length == 1 && typeof args[0] == "object") {
            this.log({ level: Log.Level.ERROR, content: content + "\n    " + args[0].stack });
            return;
        }
        this.log({ level: Log.Level.ERROR, content: this.formatContent(content, ...args) });
    }

    trace(format: string, ...args: any[]): any {
        this.log({ level: Log.Level.TRACE, content: this.formatContent(format, ...args) });
    }

    fatal(format: string, ...args: any[]): any {
        this.log({ level: Log.Level.FATAL, content: this.formatContent(format, ...args) });
        process.exit(-1199810);
    }

    panic(format: string, ...args: any[]): any {
        this.log({ level: Log.Level.PANIC, content: this.formatContent(format, ...args) });
        process.exit(-1199811);
    }

}
