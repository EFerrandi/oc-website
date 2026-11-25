const PLACEHOLDER_AVATAR = '/img/placeholder-avatar.svg';
const MIN_NODE_RADIUS = 64;
const MAX_NODE_RADIUS = 104;
const RADIUS_STEP = 4;
const RADIUS_CAP_NEIGHBOR_COUNT = ((MAX_NODE_RADIUS - MIN_NODE_RADIUS) / RADIUS_STEP) ** 2;
const RADIUS_TAIL_SCALE = 10;

function radiusForNeighborCount(count) {
  const radius = MIN_NODE_RADIUS + RADIUS_STEP * Math.sqrt(count);
  if (count < RADIUS_CAP_NEIGHBOR_COUNT) return radius;

  const lastUncappedCount = RADIUS_CAP_NEIGHBOR_COUNT - 1;
  const lastUncappedRadius = MIN_NODE_RADIUS + RADIUS_STEP * Math.sqrt(lastUncappedCount);
  return MAX_NODE_RADIUS - (MAX_NODE_RADIUS - lastUncappedRadius)
    * Math.exp(-(count - lastUncappedCount) / RADIUS_TAIL_SCALE);
}

function nodeFor(character, isCenter = false) {
  const crop = character.crop ?? {};
  const avatar = character.avatar;

  return {
    id: character.id,
    name: character.name,
    slug: character.slug,
    avatarUrl: avatar ? `/media/${avatar.id}` : PLACEHOLDER_AVATAR,
    avatarAlt: avatar?.altText || character.name,
    hasAvatar: Boolean(avatar),
    imageWidth: avatar?.width ?? 0,
    imageHeight: avatar?.height ?? 0,
    cropX: crop.x ?? avatar?.cropX ?? 50,
    cropY: crop.y ?? avatar?.cropY ?? 50,
    cropZoom: crop.zoom ?? avatar?.cropZoom ?? 1,
    visibleNeighborCount: 0,
    r: MIN_NODE_RADIUS,
    isCenter,
  };
}

/**
 * Build the shared server-rendered SVG model from already rating-filtered rows.
 * The optional profile character is included even when it has no visible rows.
 */
export function buildMapModel(rows, centerCharacter = null) {
  const nodes = [];
  const seen = new Set();
  const neighbors = new Map();

  const addNode = (character, isCenter = false) => {
    if (seen.has(character.id)) {
      if (isCenter) {
        const node = nodes.find((entry) => entry.id === character.id);
        node.isCenter = true;
      }
      return;
    }

    seen.add(character.id);
    neighbors.set(character.id, new Set());
    nodes.push(nodeFor(character, isCenter));
  };

  if (centerCharacter) addNode(centerCharacter, true);

  const edges = rows.map((row) => {
    addNode(row.from, row.from.id === centerCharacter?.id);
    addNode(row.to, row.to.id === centerCharacter?.id);
    if (row.from.id !== row.to.id) {
      neighbors.get(row.from.id).add(row.to.id);
      neighbors.get(row.to.id).add(row.from.id);
    }

    return {
      id: row.id,
      fromId: row.from.id,
      toId: row.to.id,
      fromName: row.from.name,
      toName: row.to.name,
      fromSlug: row.from.slug,
      toSlug: row.to.slug,
      label: row.label,
      isOneSided: Boolean(row.isOneSided),
    };
  });

  for (const node of nodes) {
    node.visibleNeighborCount = neighbors.get(node.id).size;
    node.r = radiusForNeighborCount(node.visibleNeighborCount);
  }

  return { nodes, edges };
}
