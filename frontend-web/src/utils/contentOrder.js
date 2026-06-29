export function shuffleArray(items) {
  const result = Array.isArray(items) ? [...items] : [];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function shouldKeepOriginalOrder(node) {
  if (!node) return true;

  const name = typeof node.name === \"string\" ? node.name.trim().toLowerCase() : \"\";
  const layoutStyle = typeof node.layoutStyle === \"string\" ? node.layoutStyle.trim().toLowerCase() : \"\";

  return name === \"nearby\" || layoutStyle === \"map\";
}

export function sortContentChildrenForDisplay(node) {
  const children = Array.isArray(node?.attributes) ? [...node.attributes] : [];
  if (shouldKeepOriginalOrder(node)) {
    return children;
  }

  const pinned = [];
  const regular = [];

  children.forEach((child) => {
    if (child?.pinToTop) {
      pinned.push(child);
    } else {
      regular.push(child);
    }
  });

  return [...pinned, ...shuffleArray(regular)];
}
