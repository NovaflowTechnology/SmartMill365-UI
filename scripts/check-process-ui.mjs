import assert from "node:assert/strict";
import { createServer } from "vite";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const server = await createServer({ server: { middlewareMode: true }, appType: "custom" });
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props));
try {
  const { default: Settings } = await server.ssrLoadModule("/src/components/templateDesigner/StatSettings.jsx");
  const { default: Widget } = await server.ssrLoadModule("/src/widgets/NumStatWidget.jsx");
  const { default: Pipeline, CONNECTION_TYPES, normalizePipeDesignValue } = await server.ssrLoadModule("/src/process/ProcessPipeline.jsx");
  const renderPipeline = (props) => renderToStaticMarkup(React.createElement("svg", null, React.createElement(Pipeline, props)));
  const { roundProcessRoute } = await server.ssrLoadModule("/src/process/ProcessRouteVisual.jsx");
  const { defaultSankeyConfig, normalizeSankeyConfig } = await server.ssrLoadModule("/src/widgets/SankeyWidget.jsx");
  const { normalizeProcessViewConfig } = await server.ssrLoadModule("/src/widgets/ProcessViewWidget.jsx");

  for (const mode of ["number", "valueMapping", "combined"]) {
    for (const mappings of [[], [{ value: 1, text: "RUNNING", color: "green" }]]) {
      const display = { mode, mappings };
      const settings = render(Settings, {
        newType: "bignumber", newBigNumberDisplay: display, setNewBigNumberDisplay() {},
      });
      assert.ok(settings.includes("Stat Display"));
      if (mode !== "number") assert.ok(settings.includes("Add Mapping"));
      for (const style of ["modern", "compact", "simple"]) {
        const markup = render(Widget, { value: mode === "valueMapping" ? 1 : 42, statusValue: 1, display: { ...display, style } });
        assert.ok(markup.length > 0);
        if (mode !== "number" && mappings.length) assert.ok(markup.includes("RUNNING"));
      }
    }
    console.log(`PASS: ${mode} settings and widget styles`);
  }

  const paths = ["M 0 0 L 180 0", "M 0 0 L 120 100 L 260 100", "M 0 0 L 0 120 L 180 120", "M 0 0 L 0 0 L 1 1 L 2 0"];
  for (const path of paths) {
    const rounded = roundProcessRoute(path);
    assert.ok(!/NaN|Infinity/.test(rounded));
    for (const connectorType of CONNECTION_TYPES.map((item) => item.value)) {
      const props = { id: "test", path, connectorType, animateFlow: false };
      const markup = renderPipeline(props);
      assert.ok(markup.includes(`data-connector-type="${connectorType}"`));
      assert.ok(!markup.includes("animateMotion"));
      assert.equal(renderPipeline({ ...props, medium: "oil" }), renderPipeline({ ...props, medium: "steam" }));
    }
  }
  assert.equal(normalizePipeDesignValue("conveyorTrack"), "conveyorTrack");
  assert.equal(normalizePipeDesignValue("conveyor"), "conveyorTrack");
  assert.ok(renderPipeline({ id: "legacy", path: paths[1], pipeDesign: "conveyorTrack" }).includes("animateMotion"));
  assert.ok(roundProcessRoute(paths[1]).includes(" Q "));
  const arrow = renderPipeline({ id: "arrow", path: paths[0], connectorType: "arrow", animateFlow: false });
  assert.ok(arrow.includes("marker-end="), "Static arrows must retain their arrowhead");
  assert.ok(!renderPipeline({ id: "line", path: paths[0], connectorType: "line" }).includes("marker-end="));
  const realisticPipe = renderPipeline({ id: "pipe", path: paths[1], connectorType: "pipeline", animateFlow: true });
  assert.ok(realisticPipe.includes("pipe-metal-"));
  assert.equal((realisticPipe.match(/data-pipe-flange="true"/g) || []).length, 2);
  assert.equal((renderPipeline({ id: "joined-pipe", path: paths[0], connectorType: "pipeline", sourceJoined: true }).match(/data-pipe-flange="true"/g) || []).length, 1);
  assert.equal(defaultSankeyConfig.flowStyle, "continuous");
  assert.equal(normalizeSankeyConfig({ ...defaultSankeyConfig }).flowGap, 4);
  assert.equal(normalizeProcessViewConfig({}).preserveCanvasLayout, true);
  const { reverseConnection, reverseConnectionNetwork } = await import("../src/process/reverseConnection.js");
  const {
    buildConnectionBranchJunctions,
    canConnectionsBranch,
    getBranchPlacement,
    getConnectionKind,
  } = await server.ssrLoadModule("/src/process/connectionBranches.js");
  const connection = {
    id: "parent", source: "a", target: "b", sourcePort: "right", targetPort: "left",
    sourceAnchor: { side: "right", offset: .3 }, targetAnchor: { side: "left", offset: .7 },
    freeSource: { x: 10, y: 20 }, freeTarget: { x: 90, y: 30 },
    sourcePipeJoin: null, targetPipeJoin: null,
    waypoints: [{ x: 30, y: 20 }, { x: 30, y: 30 }], dataKey: "flow",
  };
  assert.deepEqual(reverseConnection(reverseConnection(connection)), connection);
  const reversed = reverseConnectionNetwork([connection, {
    id: "branch", sourcePipeJoin: { connectionId: "parent", segmentIndex: 0, t: .25 },
  }], "parent", 3);
  assert.deepEqual(reversed[1].sourcePipeJoin, { connectionId: "parent", segmentIndex: 2, t: .75 });
  assert.equal(reversed[0].source, "b");
  assert.equal(reversed[0].dataKey, "flow");
  console.log("PASS: permanent arrowheads, reversible endpoints and preserved branch attachments");

  const parentRoute = { ...connection, connectorType: "pipeline", path: "M 0 0 L 200 0" };
  const pipeBranch = {
    id: "pipe-branch", connectorType: "pipeline", path: "M 100 0 L 100 100",
    sourcePipeJoin: { connectionId: "parent", segmentIndex: 0, t: .5 },
  };
  const arrowBranch = { ...pipeBranch, id: "arrow-branch", connectorType: "arrow" };
  assert.equal(getConnectionKind({ connectorType: "pipeline", pipeDesign: "conveyorTrack" }), "conveyor");
  assert.equal(canConnectionsBranch(parentRoute, pipeBranch), true);
  assert.equal(canConnectionsBranch(parentRoute, arrowBranch), false);
  assert.deepEqual(getBranchPlacement({
    segments: [
      {
        index: 0,
        start: { x: 20, y: 20 },
        end: { x: 60, y: 20 },
        midpoint: { x: 40, y: 20 },
        length: 40,
      },
      {
        index: 1,
        start: { x: 60, y: 20 },
        end: { x: 60, y: 220 },
        midpoint: { x: 60, y: 120 },
        length: 200,
      },
    ],
  }, { distance: 80, minX: 12, minY: 12, maxX: 100, maxY: 240 }), {
    source: { x: 60, y: 120 },
    target: { x: 12, y: 120 },
    segmentIndex: 1,
    t: 0.5,
  });
  assert.deepEqual(buildConnectionBranchJunctions([parentRoute, pipeBranch])[0], {
    id: "connection-branch-pipeline:100:0",
    x: 100,
    y: 0,
    connectorType: "pipeline",
    color: "#64748B",
    branches: 1,
  });
  console.log("PASS: compatible connector forks and typed branch junctions");
  console.log("PASS: connector types, diagonal bends, neutral colors, animation toggle and legacy conveyors");
} finally {
  await server.close();
}
