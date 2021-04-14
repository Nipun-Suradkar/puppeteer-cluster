/// <reference types="node" />
import { EventEmitter } from 'events';
interface QueueOptions {
    delayUntil?: number;
}
export default class Queue<T> extends EventEmitter {
    private list;
    private delayedItems;
    size(): number;
    currentJobsToBePicked(): number;
    delayedItemSize(): number;
    push(item: T, options?: QueueOptions): void;
    shift(): T | undefined;
}
export {};
