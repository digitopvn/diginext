// import { ObjectId } from "mongodb"
import { PlatformTools } from "../platform/PlatformTools";
export function isValidObjectId(id) {
    const ObjectId = PlatformTools.load("mongodb").ObjectId;
    try {
        return new ObjectId(id).toString() === id;
    }
    catch (e) {
        return false;
    }
}

//# sourceMappingURL=MongoUtils.js.map
