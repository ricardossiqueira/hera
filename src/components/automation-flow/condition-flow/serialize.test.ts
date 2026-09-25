import { describe, expect, it } from "vitest";
import { addChild, deleteNode, emptyTree } from "./mutations";
import { isComplete, parseCondition, serializeCondition } from "./serialize";

// These mirror internal/automationrule's validateConditionNode grammar
// (iot-gateway) exactly - and/or with 2+ operands, ! with 1, comparisons
// as {op: [{var}, literal]} - so a mismatch here means a rule built in
// this editor would fail the backend's own ValidateCondition.
describe("condition-flow serialize/parse", () => {
  it("serializes an empty tree as no condition at all", () => {
    expect(serializeCondition(emptyTree())).toBe("");
  });

  it("round-trips a bare comparison", () => {
    const json = '{"==":[{"var":"pressed"},true]}';
    const tree = parseCondition(json);
    expect(tree.kind).toBe("comparison");
    expect(serializeCondition(tree)).toBe(json);
  });

  it("builds and serializes a tree nested only through the real addChild API (and[cmp, cmp, or[cmp,cmp], not(cmp)])", () => {
    let tree = emptyTree();
    tree = addChild(tree, tree.id, "and"); // and[cmp, cmp]
    tree = addChild(tree, tree.id, "or"); // and[cmp, cmp, or[cmp, cmp]]
    tree = addChild(tree, tree.id, "not"); // and[cmp, cmp, or[cmp, cmp], not(cmp)]

    expect(isComplete(tree)).toBe(true);
    const parsed = JSON.parse(serializeCondition(tree));
    expect(parsed.and).toHaveLength(4);
    expect(parsed.and[2]).toHaveProperty("or");
    expect(parsed.and[2].or).toHaveLength(2);
    expect(parsed.and[3]).toHaveProperty("!");

    // parseCondition is serializeCondition's exact inverse for anything
    // this editor itself can produce.
    const json = serializeCondition(tree);
    expect(serializeCondition(parseCondition(json))).toBe(json);
  });

  it("parses every comparison operator and literal type the backend accepts", () => {
    for (const op of ["==", "!=", "<", "<=", ">", ">="]) {
      expect(parseCondition(`{"${op}":[{"var":"x"},1]}`).kind).toBe("comparison");
    }
    expect(parseCondition('{"==":[{"var":"on"},true]}').kind).toBe("comparison");
    expect(parseCondition('{"==":[{"var":"name"},"led-1"]}').kind).toBe("comparison");
  });

  it("treats a not left childless by deletion as incomplete, not serializable", () => {
    let tree = emptyTree();
    tree = addChild(tree, tree.id, "not");
    const notId = tree.id;
    const childId = (tree as Extract<typeof tree, { kind: "not" }>).child!.id;
    tree = deleteNode(tree, childId); // not's only child removed -> child: null

    expect(tree.id).toBe(notId);
    expect(isComplete(tree)).toBe(false);
    expect(serializeCondition(tree)).toBe("");
  });

  it("rejects garbage JSON and out-of-grammar shapes without throwing", () => {
    expect(() => parseCondition("not json")).not.toThrow();
    expect(() => parseCondition('{"xor":[1,2]}')).not.toThrow();
    expect(() => parseCondition('{"and":[{"==":[{"var":"a"},1]}]}')).not.toThrow(); // and with < 2 operands
  });
});
