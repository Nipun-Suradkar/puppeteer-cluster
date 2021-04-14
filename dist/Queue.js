"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const Constants_1 = require("./Constants");
class Queue extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.list = [];
        this.delayedItems = 0;
    }
    size() {
        return this.list.length + this.delayedItems;
    }
    currentJobsToBePicked() {
        return this.list.length;
    }
    delayedItemSize() {
        return this.delayedItems;
    }
    push(item, options = {}) {
        if (options && options.delayUntil && options.delayUntil > Date.now()) {
            this.delayedItems += 1;
            this.emit(Constants_1.addingDealyedItemEvent, item);
            setTimeout(() => {
                this.delayedItems -= 1;
                this.list.push(item);
                this.emit(Constants_1.removingDelayedItemEvent, item);
            }, (options.delayUntil - Date.now()));
        }
        else {
            this.list.push(item);
        }
    }
    // Care, this function might actually return undefined even though size() returns a value > 0
    // Reason is, that there might be delayedItems (checkout QueueOptions.delayUntil)
    shift() {
        return this.list.shift();
    }
}
exports.default = Queue;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUXVldWUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvUXVldWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxtQ0FBc0M7QUFDdEMsMkNBQWdGO0FBTWhGLE1BQXFCLEtBQVMsU0FBUSxxQkFBWTtJQUFsRDs7UUFFWSxTQUFJLEdBQVEsRUFBRSxDQUFDO1FBQ2YsaUJBQVksR0FBVyxDQUFDLENBQUM7SUFxQ3JDLENBQUM7SUFuQ1UsSUFBSTtRQUNQLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQztJQUNoRCxDQUFDO0lBRU0scUJBQXFCO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDNUIsQ0FBQztJQUVNLGVBQWU7UUFDbEIsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQzdCLENBQUM7SUFFTSxJQUFJLENBQUMsSUFBTyxFQUFFLFVBQXdCLEVBQUU7UUFDM0MsSUFBSSxPQUFPLElBQUksT0FBTyxDQUFDLFVBQVUsSUFBSSxPQUFPLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUNsRSxJQUFJLENBQUMsWUFBWSxJQUFJLENBQUMsQ0FBQztZQUN2QixJQUFJLENBQUMsSUFBSSxDQUFDLGtDQUFzQixFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ3hDLFVBQVUsQ0FDTixHQUFHLEVBQUU7Z0JBQ0QsSUFBSSxDQUFDLFlBQVksSUFBSSxDQUFDLENBQUM7Z0JBQ3ZCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNyQixJQUFJLENBQUMsSUFBSSxDQUFDLG9DQUF3QixFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzlDLENBQUMsRUFDRCxDQUFDLE9BQU8sQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQ3BDLENBQUM7U0FDTDthQUFNO1lBQ0gsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDeEI7SUFDTCxDQUFDO0lBRUQsNkZBQTZGO0lBQzdGLGlGQUFpRjtJQUMxRSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzdCLENBQUM7Q0FFSjtBQXhDRCx3QkF3Q0MifQ==