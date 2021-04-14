"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const Cluster_1 = require("./Cluster");
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
            // @ts-ignore
            this.emit(Cluster_1.constants.addingDelayedItemEvent);
            setTimeout(() => {
                this.delayedItems -= 1;
                this.list.push(item);
                this.emit(Cluster_1.constants.removingDelayedItemEvent);
                // @ts-ignore
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUXVldWUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvUXVldWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxtQ0FBc0M7QUFDdEMsdUNBQXNEO0FBTXRELE1BQXFCLEtBQVMsU0FBUSxxQkFBWTtJQUFsRDs7UUFFWSxTQUFJLEdBQVEsRUFBRSxDQUFDO1FBQ2YsaUJBQVksR0FBVyxDQUFDLENBQUM7SUF1Q3JDLENBQUM7SUFyQ1UsSUFBSTtRQUNQLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQztJQUNoRCxDQUFDO0lBRU0scUJBQXFCO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDNUIsQ0FBQztJQUVNLGVBQWU7UUFDbEIsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQzdCLENBQUM7SUFFTSxJQUFJLENBQUMsSUFBTyxFQUFFLFVBQXdCLEVBQUU7UUFDM0MsSUFBSSxPQUFPLElBQUksT0FBTyxDQUFDLFVBQVUsSUFBSSxPQUFPLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUNsRSxJQUFJLENBQUMsWUFBWSxJQUFJLENBQUMsQ0FBQztZQUN2QixhQUFhO1lBQ2IsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBUyxDQUFDLHNCQUFzQixDQUFDLENBQUM7WUFDNUMsVUFBVSxDQUNOLEdBQUcsRUFBRTtnQkFDRCxJQUFJLENBQUMsWUFBWSxJQUFJLENBQUMsQ0FBQztnQkFDdkIsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3JCLElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO2dCQUM5QyxhQUFhO1lBQ2pCLENBQUMsRUFDRCxDQUFDLE9BQU8sQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQ3BDLENBQUM7U0FDTDthQUFNO1lBQ0gsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDeEI7SUFDTCxDQUFDO0lBRUQsNkZBQTZGO0lBQzdGLGlGQUFpRjtJQUMxRSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzdCLENBQUM7Q0FFSjtBQTFDRCx3QkEwQ0MifQ==