/** Removes nodes, starting from `startNode` (inclusive) to `endMark` (exclusive) */
const remove = (parent, startNode, endMark) => {
  while (startNode && startNode !== endMark) {
    const n = startNode.nextSibling;
    // Is needed in case the child was pulled out the parent before clearing.
    if (parent === startNode.parentNode) {
      parent.removeChild(startNode);
    }
    startNode = n;
  }
};

export {remove };
