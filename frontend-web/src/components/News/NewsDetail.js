import React, { useMemo } from 'react';
import { X } from 'lucide-react';

/**
 * 智能分段函数：
 * 1. 删除结尾大写比例过高的标题堆积块；
 * 2. 避免 Mr./Dr. 等误切；
 * 3. 返回自然段落数组。
 */
function smartSplitParagraphs(text = '') {
  const skipAbbr = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Sr.', 'Jr.'];
  if (!text) return [];

  let trimmed = text.trim();

  // 🧠 Step 1: 查找“第一个标题块起始点”，以大写率+没有标点为判断
  const tokens = trimmed.split(/\s+/);
  const threshold = 0.85;

  let cutIndex = -1;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens.slice(i, i + 10).join(' ');
    const letters = t.replace(/[^A-Za-z]/g, '');
    const upper = (letters.match(/[A-Z]/g) || []).length;
    const ratio = letters.length ? upper / letters.length : 0;
    if (ratio > threshold && !/[.?!]/.test(t)) {
      cutIndex = trimmed.indexOf(t);
      break;
    }
  }

  if (cutIndex > -1) {
    trimmed = trimmed.slice(0, cutIndex).trim();
  }

  // 🧠 Step 2: 正常分段
  const raw = trimmed.split(/(?<=[.?!])\s+(?=[A-Z])/g);

  const result = [];
  for (let i = 0; i < raw.length; i++) {
    const current = raw[i];
    const prev = result[result.length - 1] || '';
    const lastWord = prev.trim().split(' ').slice(-1)[0];
    if (skipAbbr.includes(lastWord)) {
      result[result.length - 1] = prev + ' ' + current;
    } else {
      result.push(current);
    }
  }

  return result.map(p => p.trim()).filter(Boolean);
}

/**
 * 新闻详情页面（段落自动处理 + 大写块排除）
 */
const NewsDetailPage = ({ selectedNews, onBack }) => {
  const rawText = selectedNews?.content || selectedNews?.text || '';
  const paragraphs = useMemo(() => smartSplitParagraphs(rawText), [rawText]);

  if (!selectedNews) return null;
  const { header, img } = selectedNews;

  return (
    <div className="w-full h-full p-[5rem] overflow-y-auto relative text-white">
      {/* 返回按钮 */}
      <button
        onClick={onBack}
        className="absolute top-[1.5rem] left-[1.5rem] text-white"
        aria-label="Close"
      >
        <X size={28} />
      </button>

      {/* 封面图（如有） */}
      {img && (
        <img
          src={img}
          alt={header}
          className="w-full max-h-[20rem] object-contain mb-[1.5rem]"
        />
      )}

      {/* 新闻标题 */}
      <h1 className="text-[2.2rem] font-bold mb-[2rem]">{header}</h1>

      {/* 正文内容段落 */}
      <div className="text-[1.3rem] leading-[2.1rem] space-y-[1.5rem] text-white/90">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </div>
  );
};

export default NewsDetailPage;
