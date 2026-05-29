/**
 * 计算亮度调整后的颜色
 * @param {string} rgbStr 格式 'rgb(r,g,b)'
 * @param {number} amount 亮度调整，范围 -0.5 ~ 0.5
 * @returns {string} 新的 rgb 颜色字符串
 */
export function adjustLightness(rgbStr, amount) {
  // 解析 rgb(r,g,b)
  const rgb = rgbStr.match(/\d+/g).map(Number);
  if (!rgb || rgb.length !== 3) return rgbStr; // 格式异常直接返回原值

  const adjust = (c) => {
    if (amount < 0) {
      // 变暗，往0方向靠
      return Math.round(c * (1 + amount)); // amount是负数，1+amount <1，变小
    } else {
      // 变亮，往255方向靠
      return Math.round(c + (255 - c) * amount);
    }
  };

  const r = Math.min(255, Math.max(0, adjust(rgb[0])));
  const g = Math.min(255, Math.max(0, adjust(rgb[1])));
  const b = Math.min(255, Math.max(0, adjust(rgb[2])));

  return `rgb(${r},${g},${b})`;
}

export function adjustBrightness(rgbStr, brightness) {
  // rgbStr 格式如 'rgb(35,75,146)'
  const rgb = rgbStr.match(/\d+/g).map(Number);
  if (!rgb || rgb.length !== 3) return rgbStr;

  const r = Math.min(255, Math.max(0, Math.round(rgb[0] * brightness)));
  const g = Math.min(255, Math.max(0, Math.round(rgb[1] * brightness)));
  const b = Math.min(255, Math.max(0, Math.round(rgb[2] * brightness)));

  return `rgb(${r},${g},${b})`;
}

