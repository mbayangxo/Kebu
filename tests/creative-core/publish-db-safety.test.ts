import { describe, expect, it } from "vitest";
import { assertLocalPublishDatabase } from "./publish-db-setup";

describe("publish race test database guard",()=>{
 it.each(["postgres://test@127.0.0.1/postgres","postgresql://test@localhost/postgres","postgres://test@[::1]/postgres"])("accepts an explicit loopback database: %s",value=>expect(assertLocalPublishDatabase(value)).toBeInstanceOf(URL));
 it.each(["postgres://test@db.example.com/postgres","postgres://test@127.0.0.1/postgres?host=db.example.com","https://localhost/postgres","postgres://test@localhost/"])("refuses remote or ambiguous destinations: %s",value=>expect(()=>assertLocalPublishDatabase(value)).toThrow());
});
