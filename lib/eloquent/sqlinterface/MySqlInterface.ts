
import { SqlInterface } from "../SqlInterface";

export class MySqlInterface implements SqlInterface {

    database(): String {
        return "mysql";
    }

}
