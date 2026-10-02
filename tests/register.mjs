// Registers the @/-alias loader for the test run only.
import { register } from "node:module";

register("./alias-loader.mjs", import.meta.url);
