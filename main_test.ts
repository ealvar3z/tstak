import { assertEquals } from "@std/assert";
import { hello } from "./main.ts";

Deno.test(function helloTest() {
  assertEquals(hello(), "hello deno");
});
