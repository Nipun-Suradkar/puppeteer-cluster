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
exports.domainDelayMap = exports.constants = void 0;
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
exports.constants = {
    addingDelayedItemEvent: 'Adding Delayed Item',
    removingDelayedItemEvent: 'Removing Delayed Item',
};
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
const MONITORING_DISPLAY_INTERVAL = 5000;
const CHECK_FOR_WORK_INTERVAL = 100;
const WORK_CALL_INTERVAL_LIMIT = 10;
exports.domainDelayMap = new Map();
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
        // this.domainDelayMapInit();
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
            if (typeof job === 'undefined' || job === null) {
                // skip, there are items in the queue but they are all delayed
                return;
            }
            // @ts-ignore
            const ugd = job && job.data && job.data.ugd ? job.data.ugd : undefined;
            const currentDomains = this.workersBusy.map((working) => {
                try {
                    if (working.activeTarget) {
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
                console.log(`Skipping duplicate URL: ${job.getUrl()}`);
                this.work();
                return;
            }
            if (this.options.skipDuplicateUrlsTTL
                && url !== undefined && this.duplicateUrlsSetTTL.isExists(url + ugd)) {
                debug(`Skipping duplicate URL: ${job.getUrl()}`);
                console.log(`Skipping duplicate URLs TTL: ${job.getUrl()}`);
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
                    console.log('Same Domain Delay: ', domain);
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
            let result;
            try {
                result = yield worker.handle(jobFunction, job, this.options.timeout);
            }
            catch (e) {
                console.log('Worker Handle Error', e);
                this.workersBusy.splice(this.workersBusy.indexOf(worker), 1);
                this.workers.splice(this.workers.indexOf(worker), 1);
                yield worker.close();
                yield this.launchWorker();
                this.work();
                return;
            }
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
            const busyWorkerIndex = this.workersBusy.indexOf(worker);
            this.workersBusy.splice(busyWorkerIndex, 1);
            if (worker.times > this.urlsPerBrowser) {
                console.log('Reached Maximum URLs Per Browser');
                const workerIndex = this.workers.indexOf(worker);
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
        display.log(`== Job Queue Length:   ${this.jobQueue.size()}`);
        display.log(`== Job Queue Delay Items Length:   ${this.jobQueue.delayedItemSize()}`);
        display.log(`== Job Queue Items to be picked:   ${this.jobQueue.currentJobsToBePicked()}`);
        display.log(`== Avail Workers Length:   ${this.workersAvail.length}`);
        display.log(`== Busy Workers Length:   ${this.workersBusy.length}`);
        this.workers.forEach((worker, i) => {
            // @ts-ignore
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
        let i = 0;
        display.log('== Domain Delay Map :');
        exports.domainDelayMap.forEach((val, key) => {
            if (val > 0) {
                i += 1;
                display.log(` #${i} ${key} : ${val}`);
            }
        });
        display.resetCursor();
    }
}
exports.default = Cluster;
Cluster.CONCURRENCY_PAGE = 1; // shares cookies, etc.
Cluster.CONCURRENCY_CONTEXT = 2; // no cookie sharing (uses contexts)
Cluster.CONCURRENCY_BROWSER = 3; // no cookie sharing and individual processes (uses contexts)
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQ2x1c3Rlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9DbHVzdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7OztBQUNBLCtCQUE2RTtBQUM3RSx1Q0FBZ0M7QUFDaEMsK0JBQStCO0FBQy9CLHFDQUE4QztBQUU5Qyx1RUFBdUU7QUFHdkUsbUNBQTRCO0FBQzVCLHFDQUE4QjtBQUM5QixtREFBNEM7QUFDNUMsbUNBQXNDO0FBSXRDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDaEMsUUFBQSxTQUFTLEdBQUc7SUFDckIsc0JBQXNCLEVBQUcscUJBQXFCO0lBQzlDLHdCQUF3QixFQUFHLHVCQUF1QjtDQUNyRCxDQUFDO0FBeUJGLE1BQU0sZUFBZSxHQUFtQjtJQUNwQyxXQUFXLEVBQUUsQ0FBQztJQUNkLGNBQWMsRUFBRSxDQUFDO0lBQ2pCLG1CQUFtQixFQUFFLENBQUM7SUFDdEIsZ0JBQWdCLEVBQUU7SUFDZCwwQ0FBMEM7S0FDN0M7SUFDRCxpQkFBaUIsRUFBRSxFQUFFO0lBQ3JCLE9BQU8sRUFBRSxLQUFLO0lBQ2QsT0FBTyxFQUFFLEVBQUUsR0FBRyxJQUFJO0lBQ2xCLFVBQVUsRUFBRSxDQUFDO0lBQ2IsVUFBVSxFQUFFLENBQUM7SUFDYixpQkFBaUIsRUFBRSxLQUFLO0lBQ3hCLGVBQWUsRUFBRSxDQUFDO0lBQ2xCLFNBQVMsRUFBRSxTQUFTO0lBQ3BCLGNBQWMsRUFBRSxLQUFLO0NBQ3hCLENBQUM7QUFjRixNQUFNLDJCQUEyQixHQUFHLElBQUksQ0FBQztBQUN6QyxNQUFNLHVCQUF1QixHQUFHLEdBQUcsQ0FBQztBQUNwQyxNQUFNLHdCQUF3QixHQUFHLEVBQUUsQ0FBQztBQUN2QixRQUFBLGNBQWMsR0FBeUIsSUFBSSxHQUFHLEVBQWtCLENBQUM7QUFFOUUsTUFBcUIsT0FBeUMsU0FBUSxxQkFBWTtJQTZDOUUsWUFBb0IsT0FBK0I7UUFDL0MsS0FB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