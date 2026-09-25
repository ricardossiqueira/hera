import { describe, expect, it } from "vitest";
import { addChild, deleteNode, depthOf, emptyTree, MAX_DEPTH, toggleCombinator, updateLeaf } from "./mutations";
import type { ConditionTree } from "./types";

function and(tree: ConditionTree) {
  return tree as Extract<ConditionTree, { kind: "and" | "or" }>;
}

describe("condition-flow mutations", () => {
  it("addChild on the empty placeholder replaces the whole tree", () => {
    const root = emptyTree();
    const next = addChild(root, root.id, "comparison");
    expect(next.kind).toBe("comparison");
  });

  it("and/or never exist with fewer than 2 children: addChild seeds two, deleteNode never drops below that without collapsing", () => {
    const root = emptyTree();
    const tree = addChild(root, root.id, "and");
    expect(and(tree).children).toHaveLength(2);
  });

  it("not starts with a default child, never left null by creation", () => {
    const root = emptyTree();
    const tree = addChild(root, root.id, "not");
    expect((tree as Extract<ConditionTree, { kind: "not" }>).child).not.toBeNull();
  });

  it("appending a third child to an and/or extends children instead of replacing", () => {
    const root = emptyTree();
    let tree = addChild(root, root.id, "or");
    tree = addChild(tree, tree.id, "comparison");
    expect(and(tree).children).toHaveLength(3);
  });

  it("deleting a direct child of and/or down to exactly one collapses the wrapper, promoting the remaining child", () => {
    const root = emptyTree();
    const tree = addChild(root, root.id, "and"); // and[c1, c2]
    const [c1, c2] = and(tree).children;
    const collapsed = deleteNode(tree, c1.id);
    expect(collapsed.id).toBe(c2.id);
    expect(collapsed.kind).toBe("comparison");
  });

  it("deleting a nested child collapses only its immediate parent, not the whole tree", () => {
    const root = emptyTree();
    let tree = addChild(root, root.id, "and"); // and[c1, c2]
    tree = addChild(tree, tree.id, "or"); // and[c1, c2, or[c3, c4]]
    const orNode = and(tree).children[2];
    const [c3] = and(orNode).children;
    const next = deleteNode(tree, c3.id);
    expect(and(next).children).toHaveLength(3); // and still has 3 children
    expect(and(next).children[2].kind).toBe("comparison"); // but the or collapsed into its sole remaining child
  });

  it("deleting the root resets to the empty placeholder", () => {
    const root = emptyTree();
    const tree = addChild(root, root.id, "and");
    const next = deleteNode(tree, tree.id);
    expect(next.kind).toBe("empty");
  });

  it("deleting a not's only child leaves the not childless rather than deleting the not itself", () => {
    const root = emptyTree();
    const tree = addChild(root, root.id, "not");
    const child = (tree as Extract<ConditionTree, { kind: "not" }>).child!;
    const next = deleteNode(tree, child.id);
    expect(next.kind).toBe("not");
    expect((next as Extract<ConditionTree, { kind: "not" }>).child).toBeNull();
  });

  it("toggleCombinator flips and<->or by id, leaving children untouched", () => {
    const root = emptyTree();
    const tree = addChild(root, root.id, "and");
    const toggled = toggleCombinator(tree, tree.id);
    expect(toggled.kind).toBe("or");
    expect(and(toggled).children).toBe(and(tree).children);
  });

  it("updateLeaf patches only the targeted comparison, leaving siblings untouched", () => {
    const root = emptyTree();
    const tree = addChild(root, root.id, "and");
    const [c1, c2] = and(tree).children;
    const next = updateLeaf(tree, c1.id, { field: "pressed", value: "true", type: "boolean" });
    const nextC1 = and(next).children[0] as Extract<ConditionTree, { kind: "comparison" }>;
    expect(nextC1.field).toBe("pressed");
    expect(and(next).children[1]).toBe(c2); // untouched sibling is the same object
  });

  it("depthOf matches nesting depth, root is 0", () => {
    const root = emptyTree();
    let tree = addChild(root, root.id, "and"); // depth 1 children
    tree = addChild(tree, tree.id, "or"); // 3rd child of and is depth 1, its own children depth 2
    const orNode = and(tree).children[2];
    expect(depthOf(tree, tree.id)).toBe(0);
    expect(depthOf(tree, orNode.id)).toBe(1);
    expect(depthOf(tree, and(orNode).children[0].id)).toBe(2);
    expect(depthOf(tree, "does-not-exist")).toBeNull();
  });

  it("MAX_DEPTH mirrors internal/automationrule's maxConditionDepth (6)", () => {
    expect(MAX_DEPTH).toBe(6);
  });
});
