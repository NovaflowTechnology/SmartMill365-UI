export function reverseConnection(connection) {
  return {
    ...connection,
    source: connection.target,
    target: connection.source,
    sourceAnchor: connection.targetAnchor,
    targetAnchor: connection.sourceAnchor,
    sourcePort: connection.targetPort,
    targetPort: connection.sourcePort,
    freeSource: connection.freeTarget,
    freeTarget: connection.freeSource,
    sourcePipeJoin: connection.targetPipeJoin,
    targetPipeJoin: connection.sourcePipeJoin,
    waypoints: [...(connection.waypoints || [])].reverse(),
  };
}

export function reverseConnectionNetwork(connections, id, segmentCount) {
  return connections.map((connection) => {
    const next = connection.id === id ? reverseConnection(connection) : { ...connection };
    // Branches stay at the same physical point when their parent route reverses.
    for (const endpoint of ["sourcePipeJoin", "targetPipeJoin"]) {
      const join = next[endpoint];
      if (join?.connectionId === id) {
        next[endpoint] = { ...join, segmentIndex: segmentCount - 1 - join.segmentIndex, t: 1 - join.t };
      }
    }
    return next;
  });
}
