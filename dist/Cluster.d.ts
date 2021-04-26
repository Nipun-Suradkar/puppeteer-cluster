/// <reference types="node" />
import { LaunchOptions, Page } from 'puppeteer';
import { EventEmitter } from 'events';
import { ConcurrencyImplementationClassType } from './concurrency/ConcurrencyImplementation';
export declare const constants: {
    addingDelayedItemEvent: string;
    removingDelayedItemEvent: string;
};
interface ClusterOptions {
    skipDuplicateUrlsTTL?: number;
    concurrency: number | ConcurrencyImplementationClassType;
    maxConcurrency: number;
    workerCreationDelay: number;
    puppeteerOptions: LaunchOptions;
    perBrowserOptions: any;
    monitor: boolean;
    timeout: number;
    retryLimit: number;
    retryDelay: number;
    skipDuplicateUrls: boolean;
    sameDomainDelay: number;
    puppeteer: any;
    urlsPerBrowser: number;
}
declare type Partial<T> = {
    [P in keyof T]?: T[P];
};
declare type ClusterOptionsArgument = Partial<ClusterOptions>;
interface TaskFunctionArguments<JobData> {
    page: Page;
    data: JobData;
    worker: {
        id: number;
    };
}
// tslint:disable-next-line:max-line-length
export declare type TaskFunction<JobData, ReturnData> = (arg: TaskFunctionArguments<JobData>) => Promise<ReturnData>;
export declare const domainDelayMap: Map<string, number>;
export default class Cluster<JobData = any, ReturnData = any> extends EventEmitter {
    static CONCURRENCY_PAGE: number;
    static CONCURRENCY_CONTEXT: number;
    static CONCURRENCY_BROWSER: number;
    private options;
    private workers;
    private workersAvail;
    private workersBusy;
    private workersStarting;
    private perBrowserOptions;
    private usePerBrowserOptions;
    private urlsPerBrowser;
    private allTargetCount;
    private jobQueue;
    private duplicateUrlsSetTTL;
    private errorCount;
    private taskFunction;
    private idleResolvers;
    private waitForOneResolvers;
    private browser;
    private isClosed;
    private startTime;
    private nextWorkerId;
    private monitoringInterval;
    private display;
    private duplicateCheckUrls;
    private lastDomainAccesses;
    private systemMonitor;
    private checkForWorkInterval;
    static launch(options: ClusterOptionsArgument): Promise<Cluster<any, any>>;
    private constructor();
    private init;
    private launchWorker;
    task(taskFunction: TaskFunction<JobData, ReturnData>): Promise<void>;
    private nextWorkCall;
    private workCallTimeout;
    private work;
    private doWork;
    private lastLaunchedWorkerTime;
    private allowedToStartWorker;
    private isTaskFunction;
    private queueJob;
    queue(data: JobData, taskFunction?: TaskFunction<JobData, ReturnData>): Promise<void>;
    queue(taskFunction: TaskFunction<JobData, ReturnData>): Promise<void>;
    execute(data: JobData, taskFunction?: TaskFunction<JobData, ReturnData>): Promise<ReturnData>;
    execute(taskFunction: TaskFunction<JobData, ReturnData>): Promise<ReturnData>;
    idle(): Promise<void>;
    waitForOne(): Promise<JobData>;
    close(): Promise<void>;
    private monitor;
}
export {};
