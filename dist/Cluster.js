"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Job_1 = require("./Job");
const Display_1 = require("./Display");
const util = require("./util");
const Worker_1 = require("./Worker");
const builtInConcurrency = require("./concurrency/builtInConcurrency");
const Queue_1 = require("./Queue");
const SetTTL_1 = require("./SetTTL");
const SystemMonitor_1 = require("./SystemMonitor");
const events_1 = require("events");
const debug = util.debugGenerator('Cluster');
const DEFAULT_OPTIONS = {
    concurrency: 2,
    maxConcurrency: 1,
    workerCreationDelay: 0,
    puppeteerOptions: {
    // headless: false, // just for testing...
    },
    perBrowserOptions: [],
    monitor: false,
    timeout: 30 * 1000,
    retryLimit: 0,
    retryDelay: 0,
    skipDuplicateUrls: false,
    sameDomainDelay: 0,
    puppeteer: undefined,
    urlsPerBrowser: 10000,
};
const MONITORING_DISPLAY_INTERVAL = 500;
const CHECK_FOR_WORK_INTERVAL = 100;
const WORK_CALL_INTERVAL_LIMIT = 10;
class Cluster extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.workers = [];
        this.workersAvail = [];
        this.workersBusy = [];
        this.workersStarting = 0;
        this.usePerBrowserOptions = false;
        this.urlsPerBrowser = 10000;
        this.allTargetCount = 0;
        this.jobQueue = new Queue_1.default();
        this.duplicateUrlsSetTTL = new SetTTL_1.default();
        this.errorCount = 0;
        this.taskFunction = null;
        this.idleResolvers = [];
        this.waitForOneResolvers = [];
        this.browser = null;
        this.isClosed = false;
        this.startTime = Date.now();
        this.nextWorkerId = -1;
        this.monitoringInterval = null;
        this.display = null;
        this.duplicateCheckUrls = new Set();
        this.lastDomainAccesses = new Map();
        this.systemMonitor = new SystemMonitor_1.default();
        this.checkForWorkInterval = null;
        this.nextWorkCall = 0;
        this.workCallTimeout = null;
        this.lastLaunchedWorkerTime = 0;
        this.options = Object.assign(Object.assign({}, DEFAULT_OPTIONS), options);
        if (this.options.monitor) {
            this.monitoringInterval = setInterval(() => this.monitor(), MONITORING_DISPLAY_INTERVAL);
        }
    }
    static launch(options) {
        return __awaiter(this, void 0, void 0, function* () {
            debug('Launching');
            const cluster = new Cluster(options);
            yield cluster.init();
            return cluster;
        });
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            const browserOptions = this.options.puppeteerOptions;
            let puppeteer = this.options.puppeteer;
            if (this.options.puppeteer == null) { // check for null or undefined
                puppeteer = require('puppeteer');
            }
            else {
                debug('Using provided (custom) puppteer object.');
            }
            if (this.options.concurrency === Cluster.CONCURRENCY_PAGE) {
                this.browser = new builtInConcurrency.Page(browserOptions, puppeteer);
            }
            else if (this.options.concurrency === Cluster.CONCURRENCY_CONTEXT) {
                this.browser = new builtInConcurrency.Context(browserOptions, puppeteer);
            }
            else if (this.options.concurrency === Cluster.CONCURRENCY_BROWSER) {
                this.perBrowserOptions = this.options.perBrowserOptions;
                if (this.perBrowserOptions.length > 0) {
                    this.usePerBrowserOptions = true;
                }
                this.urlsPerBrowser = this.options.urlsPerBrowser;
                this.browser = new builtInConcurrency.Browser(browserOptions, puppeteer);
            }
            else if (typeof this.options.concurrency === 'function') {
                this.browser = new this.options.concurrency(browserOptions, puppeteer);
            }
            else {
                throw new Error(`Unknown concurrency option: ${this.options.concurrency}`);
            }
            try {
                yield this.browser.init();
            }
            catch (err) {
                throw new Error(`Unable to launch browser, error message: ${err.message}`);
            }
            if (this.options.monitor) {
                yield this.systemMonitor.init();
            }
            // needed in case resources are getting free (like CPU/memory) to check if
            // can launch workers
            this.checkForWorkInterval = setInterval(() => this.work(), CHECK_FOR_WORK_INTERVAL);
        });
    }
    launchWorker() {
        return __awaiter(this, void 0, void 0, function* () {
            // signal, that we are starting a worker
            this.workersStarting += 1;
            this.nextWorkerId += 1;
            this.lastLaunchedWorkerTime = Date.now();
            let nextBrowserOption = {};
            if (this.usePerBrowserOptions && this.perBrowserOptions.length > 0) {
                // tslint:disable-next-line:max-line-length
                nextBrowserOption = this.perBrowserOptions[Math.floor(Math.random() * this.perBrowserOptions.length)];
            }
            const workerId = this.nextWorkerId;
            let workerBrowserInstance;
            try {
                workerBrowserInstance = yield this.browser
                    .workerInstance(nextBrowserOption);
            }
            catch (err) {
                throw new Error(`Unable to launch browser for worker, error message: ${err.message}`);
            }
            const worker = new Worker_1.default({
                cluster: this,
                args: [''],
                browser: workerBrowserInstance,
                id: workerId,
            });
            this.workersStarting -= 1;
            if (this.isClosed) {
                // cluster was closed while we created a new worker (should rarely happen)
                worker.close();
            }
            else {
                this.workersAvail.push(worker);
                this.workers.push(worker);
            }
        });
    }
    task(taskFunction) {
        return __awaiter(this, void 0, void 0, function* () {
            this.taskFunction = taskFunction;
        });
    }
    // check for new work soon (wait if there will be put more data into the queue, first)
    work() {
        return __awaiter(this, void 0, void 0, function* () {
            // make sure, we only call work once every WORK_CALL_INTERVAL_LIMIT (currently: 10ms)
            if (this.workCallTimeout === null) {
                const now = Date.now();
                // calculate when the next work call should happen
                this.nextWorkCall = Math.max(this.nextWorkCall + WORK_CALL_INTERVAL_LIMIT, now);
                const timeUntilNextWorkCall = this.nextWorkCall - now;
                this.workCallTimeout = setTimeout(() => {
                    this.workCallTimeout = null;
                    this.doWork();
                }, timeUntilNextWorkCall);
            }
        });
    }
    doWork() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.jobQueue.size() === 0) { // no jobs available
                if (this.workersBusy.length === 0) {
                    this.idleResolvers.forEach(resolve => resolve());
                }
                return;
            }
            if (this.workersAvail.length === 0) { // no workers available
                if (this.allowedToStartWorker()) {
                    yield this.launchWorker();
                    this.work();
                }
                return;
            }
            const job = this.jobQueue.shift();
            if (job === undefined) {
                // skip, there are items in the queue but they are all delayed
                return;
            }
            // @ts-ignore
            const ugd = job && job.data && job.data.ugd ? job.data.ugd : undefined;
            const currentDomains = this.workersBusy.map((working) => {
                try {
                    if (working.activeTarget && working.activeTarget) {
                        // TODO: improve the logic, hardcoding to get things working
                        const data = working.activeTarget.data || { url: '' };
                        return util.getDomainFromURL(data.url || '');
                    }
                }
                catch (e) {
                }
                return undefined;
            });
            const url = job.getUrl();
            const domain = job.getDomain();
            const currentTLDDomain = util.getDomainFromURL(url);
            if (currentDomains.includes(currentTLDDomain)) {
                this.jobQueue.push(job);
                this.work();
                return;
            }
            // Check if URL was already crawled (on skipDuplicateUrls)
            if (this.options.skipDuplicateUrls
                && url !== undefined && this.duplicateCheckUrls.has(url)) {
                // already crawled, just ignore
                debug(`Skipping duplicate URL: ${job.getUrl()}`);
                this.work();
                return;
            }
            if (this.options.skipDuplicateUrlsTTL
                && url !== undefined && this.duplicateUrlsSetTTL.isExists(url + ugd)) {
                debug(`Skipping duplicate URL: ${job.getUrl()}`);
                this.work();
                return;
            }
            // Check if the job needs to be delayed due to sameDomainDelay
            if (this.options.sameDomainDelay !== 0 && domain !== undefined) {
                const lastDomainAccess = this.lastDomainAccesses.get(domain);
                if (lastDomainAccess !== undefined
                    && lastDomainAccess + this.options.sameDomainDelay > Date.now()) {
                    this.jobQueue.push(job, {
                        delayUntil: lastDomainAccess + this.options.sameDomainDelay,
                    });
                    this.work();
                    return;
                }
            }
            // Check are all positive, let's actually run the job
            if (this.options.skipDuplicateUrls && url !== undefined) {
                this.duplicateCheckUrls.add(url);
            }
            if (this.options.skipDuplicateUrlsTTL && url !== undefined && ugd !== undefined) {
                this.duplicateUrlsSetTTL.add(url + ugd, this.options.skipDuplicateUrlsTTL);
            }
            if (this.options.sameDomainDelay !== 0 && domain !== undefined) {
                this.lastDomainAccesses.set(domain, Date.now());
            }
            const worker = this.workersAvail.shift();
            this.workersBusy.push(worker);
            if (this.workersAvail.length !== 0 || this.allowedToStartWorker()) {
                // we can execute more work in parallel
                this.work();
            }
            let jobFunction;
            if (job.taskFunction !== undefined) {
                jobFunction = job.taskFunction;
            }
            else if (this.taskFunction !== null) {
                jobFunction = this.taskFunction;
            }
            else {
                throw new Error('No task function defined!');
            }
            // tslint:disable-next-line:no-increment-decrement
            worker.times++;
            const result = yield worker.handle(jobFunction, job, this.options.timeout);
            if (result.type === 'error') {
                if (job.executeCallbacks) {
                    job.executeCallbacks.reject(result.error);
                    this.errorCount += 1;
                }
                else { // ignore retryLimits in case of executeCallbacks
                    job.addError(result.error);
                    const jobWillRetry = job.tries <= this.options.retryLimit;
                    this.emit('taskerror', result.error, job.data, jobWillRetry);
                    if (jobWillRetry) {
                        let delayUntil = undefined;
                        if (this.options.retryDelay !== 0) {
                            delayUntil = Date.now() + this.options.retryDelay;
                        }
                        this.jobQueue.push(job, {
                            delayUntil,
                        });
                    }
                    else {
                        this.errorCount += 1;
                    }
                }
            }
            else if (result.type === 'success' && job.executeCallbacks) {
                job.executeCallbacks.resolve(result.data);
            }
            this.waitForOneResolvers.forEach(resolve => resolve(job.data));
            this.waitForOneResolvers = [];
            // add worker to available workers again
            const workerIndex = this.workersBusy.indexOf(worker);
            this.workersBusy.splice(workerIndex, 1);
            if (worker.times > this.urlsPerBrowser) {
                this.workers.splice(workerIndex, 1);
                yield worker.close();
                yield this.launchWorker();
                this.work();
                return;
            }
            this.workersAvail.push(worker);
            this.work();
        });
    }
    allowedToStartWorker() {
        const workerCount = this.workers.length + this.workersStarting;
        return (
        // option: maxConcurrency
        (this.options.maxConcurrency === 0
            || workerCount < this.options.maxConcurrency)
            // just allow worker creaton every few milliseconds
            && (this.options.workerCreationDelay === 0
                || this.lastLaunchedWorkerTime + this.options.workerCreationDelay < Date.now()));
    }
    // Type Guard for TypeScript
    isTaskFunction(data) {
        return (typeof data === 'function');
    }
    queueJob(data, taskFunction, callbacks) {
        let realData;
        let realFunction;
        if (this.isTaskFunction(data)) {
            realFunction = data;
        }
        else {
            realData = data;
            realFunction = taskFunction;
        }
        const job = new Job_1.default(realData, realFunction, callbacks);
        this.allTargetCount += 1;
        this.jobQueue.push(job);
        this.emit('queue', realData, realFunction);
        this.work();
    }
    queue(data, taskFunction) {
        return __awaiter(this, void 0, void 0, function* () {
            this.queueJob(data, taskFunction);
        });
    }
    execute(data, taskFunction) {
        return new Promise((resolve, reject) => {
            const callbacks = { resolve, reject };
            this.queueJob(data, taskFunction, callbacks);
        });
    }
    idle() {
        return new Promise(resolve => this.idleResolvers.push(resolve));
    }
    waitForOne() {
        return new Promise(resolve => this.waitForOneResolvers.push(resolve));
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            this.isClosed = true;
            clearInterval(this.checkForWorkInterval);
            clearTimeout(this.workCallTimeout);
            // close workers
            yield Promise.all(this.workers.map(worker => worker.close()));
            try {
                yield this.browser.close();
            }
            catch (err) {
                debug(`Error: Unable to close browser, message: ${err.message}`);
            }
            if (this.monitoringInterval) {
                this.monitor();
                clearInterval(this.monitoringInterval);
            }
            if (this.display) {
                this.display.close();
            }
            this.systemMonitor.close();
            debug('Closed');
        });
    }
    monitor() {
        if (!this.display) {
            this.display = new Display_1.default();
        }
        const display = this.display;
        const now = Date.now();
        const timeDiff = now - this.startTime;
        const doneTargets = this.allTargetCount - this.jobQueue.size() - this.workersBusy.length;
        const donePercentage = this.allTargetCount === 0
            ? 1 : (doneTargets / this.allTargetCount);
        const donePercStr = (100 * donePercentage).toFixed(2);
        const errorPerc = doneTargets === 0 ?
            '0.00' : (100 * this.errorCount / doneTargets).toFixed(2);
        const timeRunning = util.formatDuration(timeDiff);
        let timeRemainingMillis = -1;
        if (donePercentage !== 0) {
            timeRemainingMillis = ((timeDiff) / donePercentage) - timeDiff;
        }
        const timeRemining = util.formatDuration(timeRemainingMillis);
        const cpuUsage = this.systemMonitor.getCpuUsage().toFixed(1);
        const memoryUsage = this.systemMonitor.getMemoryUsage().toFixed(1);
        const pagesPerSecond = doneTargets === 0 ?
            '0' : (doneTargets * 1000 / timeDiff).toFixed(2);
        display.log(`== Start:     ${util.formatDateTime(this.startTime)}`);
        display.log(`== Now:       ${util.formatDateTime(now)} (running for ${timeRunning})`);
        display.log(`== Progress:  ${doneTargets} / ${this.allTargetCount} (${donePercStr}%)`
            + `, errors: ${this.errorCount} (${errorPerc}%)`);
        display.log(`== Remaining: ${timeRemining} (@ ${pagesPerSecond} pages/second)`);
        display.log(`== Sys. load: ${cpuUsage}% CPU / ${memoryUsage}% memory`);
        display.log(`== Workers:   ${this.workers.length + this.workersStarting}`);
        this.workers.forEach((worker, i) => {
            const isIdle = this.workersAvail.indexOf(worker) !== -1;
            let workOrIdle;
            let workerUrl = '';
            if (isIdle) {
                workOrIdle = 'IDLE';
            }
            else {
                workOrIdle = 'WORK';
                if (worker.activeTarget) {
                    workerUrl = worker.activeTarget.getUrl() || 'UNKNOWN TARGET';
                }
                else {
                    workerUrl = 'NO TARGET (should not be happening)';
                }
            }
            display.log(`   #${i} ${workOrIdle} ${workerUrl}`);
        });
        for (let i = 0; i < this.workersStarting; i += 1) {
            display.log(`   #${this.workers.length + i} STARTING...`);
        }
        display.resetCursor();
    }
}
exports.default = Cluster;
Cluster.CONCURRENCY_PAGE = 1; // shares cookies, etc.
Cluster.CONCURRENCY_CONTEXT = 2; // no cookie sharing (uses contexts)
Cluster.CONCURRENCY_BROWSER = 3; // no cookie sharing and individual processes (uses contexts)
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2x1c3Rlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9DbHVzdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7O0FBQ0EsK0JBQTZFO0FBQzdFLHVDQUFnQztBQUNoQywrQkFBK0I7QUFDL0IscUNBQThDO0FBRTlDLHVFQUF1RTtBQUd2RSxtQ0FBNEI7QUFDNUIscUNBQThCO0FBQzlCLG1EQUE0QztBQUM1QyxtQ0FBc0M7QUFJdEMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQXlCN0MsTUFBTSxlQUFlLEdBQW1CO0lBQ3BDLFdBQVcsRUFBRSxDQUFDO0lBQ2QsY0FBYyxFQUFFLENBQUM7SUFDakIsbUJBQW1CLEVBQUUsQ0FBQztJQUN0QixnQkFBZ0IsRUFBRTtJQUNkLDBDQUEwQztLQUM3QztJQUNELGlCQUFpQixFQUFFLEVBQUU7SUFDckIsT0FBTyxFQUFFLEtBQUs7SUFDZCxPQUFPLEVBQUUsRUFBRSxHQUFHLElBQUk7SUFDbEIsVUFBVSxFQUFFLENBQUM7SUFDYixVQUFVLEVBQUUsQ0FBQztJQUNiLGlCQUFpQixFQUFFLEtBQUs7SUFDeEIsZUFBZSxFQUFFLENBQUM7SUFDbEIsU0FBUyxFQUFFLFNBQVM7SUFDcEIsY0FBYyxFQUFFLEtBQUs7Q0FDeEIsQ0FBQztBQWNGLE1BQU0sMkJBQTJCLEdBQUcsR0FBRyxDQUFDO0FBQ3hDLE1BQU0sdUJBQXVCLEdBQUcsR0FBRyxDQUFDO0FBQ3BDLE1BQU0sd0JBQXdCLEdBQUcsRUFBRSxDQUFDO0FBRXBDLE1BQXFCLE9BQXlDLFNBQVEscUJBQVk7SUE4QzlFLFlBQW9CLE9BQStCO1FBQy9DLEtBQUssRUFBRSxDQUFDO1FBeENKLFlBQU8sR0FBa0MsRUFBRSxDQUFDO1FBQzVDLGlCQUFZLEdBQWtDLEVBQUUsQ0FBQztRQUNqRCxnQkFBVyxHQUFrQyxFQUFFLENBQUM7UUFDaEQsb0JBQWUsR0FBRyxDQUFDLENBQUM7UUFF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