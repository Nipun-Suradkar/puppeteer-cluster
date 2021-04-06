import { TaskFunction } from './Cluster';
export declare type ExecuteResolve = (value?: any) => void;
export declare type ExecuteReject = (reason?: any) => void;
export interface ExecuteCallbacks {
    resolve: (value?: any) => void;
    reject: ExecuteReject;
}
export default class Job<JobData, ReturnData> {
    data?: JobData;
    taskFunction: TaskFunction<JobData, ReturnData> | undefined;
    executeCallbacks: ExecuteCallbacks | undefined;
    private lastError;
    tries: number;
    // tslint:disable-next-line:max-line-length
    constructor(data?: JobData, taskFunction?: TaskFunction<JobData, ReturnData>, executeCallbacks?: ExecuteCallbacks);
    getUrl(): string | undefined;
    getDomain(): string | undefined;
    addError(error: Error): void;
}
