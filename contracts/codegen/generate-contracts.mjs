import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const registryPath = resolve(root, "contracts/canonical/v1/contracts.json");
const registry = JSON.parse(await readFile(registryPath, "utf8"));
const check = process.argv.includes("--check");

function parse(raw) {
  const optional = raw.endsWith("?");
  const value = optional ? raw.slice(0, -1) : raw;
  const array = value.endsWith("[]");
  return { optional, array, base: array ? value.slice(0, -2) : value };
}

const tsType = (raw) => { const t = parse(raw); const m = { string: "string", int: "number", double: "number", bool: "boolean", instant: "string", date: "string", json: "JsonValue", Payload: "Payload" }; const b = m[t.base] ?? t.base; return `${t.array ? `ReadonlyArray<${b}>` : b}${t.optional ? " | null" : ""}`; };
const ktType = (raw) => { const t = parse(raw); const m = { string: "String", int: "Long", double: "Double", bool: "Boolean", instant: "String", date: "String", json: "JsonValue", Payload: "Payload" }; const b = m[t.base] ?? t.base; return `${t.array ? `List<${b}>` : b}${t.optional ? "?" : ""}`; };
const swiftType = (raw) => { const t = parse(raw); const m = { string: "String", int: "Int", double: "Double", bool: "Bool", instant: "String", date: "String", json: "JSONValue", Payload: "Payload" }; const b = m[t.base] ?? t.base; return `${t.array ? `[${b}]` : b}${t.optional ? "?" : ""}`; };

const header = (comment) => `${comment} Generated from contracts/canonical/v1/contracts.json. Do not edit.\n${comment} schemaVersion=${registry.schemaVersion}\n\n`;
let ts = header("//") + "export type JsonValue = null | boolean | number | string | ReadonlyArray<JsonValue> | { readonly [key: string]: JsonValue };\n\n";
let kt = header("//") + "package com.movefuel.contracts.v1\n\ntypealias JsonValue = Any?\n\n";
let swift = header("//") + "import Foundation\n\npublic indirect enum JSONValue: Codable, Sendable { case null, bool(Bool), number(Double), string(String), array([JSONValue]), object([String: JSONValue]) }\n\n";
for (const [name, values] of Object.entries(registry.enums)) {
  ts += `export type ${name} = ${values.map((v) => JSON.stringify(v)).join(" | ")};\n\n`;
  kt += `enum class ${name} { ${values.join(", ")} }\n\n`;
  swift += `public enum ${name}: String, Codable, Sendable {\n${values.map((v) => `  case ${v.toLowerCase()} = ${JSON.stringify(v)}`).join("\n")}\n}\n\n`;
}
for (const [name, definition] of Object.entries(registry.records)) {
  const generic = definition.generic ? `<${definition.generic}>` : "";
  ts += `export interface ${name}${generic} {\n${Object.entries(definition.fields).map(([k, v]) => `  readonly ${k}: ${tsType(v)};`).join("\n")}\n}\n\n`;
  kt += `data class ${name}${generic}(\n${Object.entries(definition.fields).map(([k, v]) => `  val ${k}: ${ktType(v)}`).join(",\n")}\n)\n\n`;
  const swiftGeneric = definition.generic ? `<${definition.generic}: Codable & Sendable>` : "";
  swift += `public struct ${name}${swiftGeneric}: Codable, Sendable {\n${Object.entries(definition.fields).map(([k, v]) => `  public let ${k}: ${swiftType(v)}`).join("\n")}\n}\n\n`;
}

const outputs = [
  [resolve(root, "contracts/generated/typescript/MoveFuelContractsV1.ts"), ts],
  [resolve(root, "contracts/generated/kotlin/MoveFuelContractsV1.kt"), kt],
  [resolve(root, "contracts/generated/swift/MoveFuelContractsV1.swift"), swift]
];
for (const [path, content] of outputs) {
  if (check) {
    const current = await readFile(path, "utf8").catch(() => "");
    if (current !== content) throw new Error(`generated_contract_drift:${path}`);
  } else await writeFile(path, content);
}
console.log(check ? "canonical contract generation check passed" : "canonical contracts generated");
