// tslint:disable-next-line:class-name
interface setOptions {
    timeToLive: number;
}
// options : setOptions
export default class SetTTL<T> {
    private  duplicateCheckUrls: Set<string> = new Set();

    public add(key :string , ttl :number) : void {
        this.duplicateCheckUrls.add(key);
        setTimeout(() => {
            this.duplicateCheckUrls.delete(key);
        },         ttl);
    }

    public delete(key : string) : void {
        this.duplicateCheckUrls.delete(key);
    }

    public isExists(key: string) : boolean {
        return this.duplicateCheckUrls.has(key);
    }

    public size() : number {
        return this.duplicateCheckUrls.size;
    }

    public logSetElements(value1:any, value2:any, set:any) {
        console.log(`s[${value1}] = ${value2}`);
    }

    public print() : void {
        this.duplicateCheckUrls.forEach(this.logSetElements);
        console.log(this.duplicateCheckUrls.size);
    }

}
