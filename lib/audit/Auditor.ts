
import { Util } from "../util";
import { Cache } from "../cache";
import { AuditAttributes } from "./Audit";

export abstract class Auditor<T> {

    bufferSize = 0;
    dateLastFlushed = new Date();

    abstract flush(): Promise<void>;
    abstract getCache(): Cache<AuditAttributes<T>>;
    abstract preAudit(audit: AuditAttributes<T>): void;

    async audit(audit: AuditAttributes<T>) {
        this.preAudit(audit);
        this.bufferSize++;
        if (Util.cacheWriteAlong(this.bufferSize, this.dateLastFlushed, this.getCache(), audit)) {
            this.bufferSize = 0;
            this.dateLastFlushed = new Date();
            this.flush();
        }
    }

}
