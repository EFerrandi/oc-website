const PLACEHOLDER_AVATAR = '/img/placeholder-avatar.svg';

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

  const addNode = (character, isCenter = false) => {
    if (seen.has(character.id)) {
      if (isCenter) {
        const node = nodes.find((entry) => entry.id === character.id);
        node.isCenter = true;
      }
      return;
    }

    seen.add(character.id);
    nodes.push(nodeFor(character, isCenter));
  };

  if (centerCharacter) addNode(centerCharacter, true);

  const edges = rows.map((row) => {
    addNode(row.from, row.from.id === centerCharacter?.id);
    addNode(row.to, row.to.id === centerCharacter?.id);

    return {
      id: row.id,
      fromId: row.from.id,
      toId: row.to.id,
      fromName: row.from.name,
      toName: row.to.name,
      label: row.label,
      isOneSided: Boolean(row.isOneSided),
    };
  });

  return { nodes, edges };
}
