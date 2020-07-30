"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//options : setOptions
class SetTTL {
    constructor() {
        this.duplicateCheckUrls = new Set();
    }
    add(key, ttl) {
        this.duplicateCheckUrls.add(key);
        setTimeout(() => {
            this.duplicateCheckUrls.delete(key);
        }, 1000);
    }
    delete(key) {
        this.duplicateCheckUrls.delete(key);
    }
    isExists(key) {
        return this.duplicateCheckUrls.has(key);
    }
    size() {
        return this.duplicateCheckUrls.size;
    }
    logSetElements(value1, value2, set) {
        console.log(`s[${value1}] = ${value2}`);
    }
    print() {
        this.duplicateCheckUrls.forEach(this.logSetElements);
        console.log(this.duplicateCheckUrls.size);
    }
}
exports.default = SetTTL;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2V0VFRMLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL1NldFRUTC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUdBLHNCQUFzQjtBQUN0QixNQUFxQixNQUFNO0lBQTNCO1FBQ2EsdUJBQWtCLEdBQWdCLElBQUksR0FBRyxFQUFFLENBQUM7SUE4QnpELENBQUM7SUE1QmMsR0FBRyxDQUFDLEdBQVcsRUFBRyxHQUFXO1FBQ2hDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDakMsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUNaLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDeEMsQ0FBQyxFQUFDLElBQUksQ0FBQyxDQUFDO0lBQ1osQ0FBQztJQUVNLE1BQU0sQ0FBQyxHQUFZO1FBQ3RCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVNLFFBQVEsQ0FBQyxHQUFXO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRU0sSUFBSTtRQUNQLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQztJQUN4QyxDQUFDO0lBRU0sY0FBYyxDQUFDLE1BQVUsRUFBRSxNQUFVLEVBQUUsR0FBTztRQUNqRCxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssTUFBTSxPQUFPLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVNLEtBQUs7UUFDUixJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNyRCxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5QyxDQUFDO0NBRVI7QUEvQkQseUJBK0JDIn0=