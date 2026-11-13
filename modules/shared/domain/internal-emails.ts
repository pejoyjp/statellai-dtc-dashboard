export const internalEmailDomains = ["163.com", "satellai.com", "qq.com"];

// Common surnames plus one or two pinyin syllables. This flags candidates for review only.
const surnames = "wang|zhang|li|liu|chen|yang|zhao|huang|zhou|wu|xu|sun|ma|hu|zhu|guo|he|gao|lin|luo|zheng|liang|xie|song|tang|han|deng|cao|peng|xiao|yu|jiang|feng|cai|du|ye|cheng|su|lu|shen|zeng|fan|ren|yuan|pan|ding|wei|fang|shi|qian|jin|qiu|tan|meng|bai|xia|kong|lei|long|tian";
const syllables = "ai|an|ang|bao|bin|bo|chang|chao|chen|cheng|chun|dan|de|dong|fang|fei|feng|fu|gang|guang|guo|hai|hao|hong|hua|hui|jia|jian|jie|jin|jing|jun|kai|ke|lan|lei|li|lian|liang|lin|ling|long|lu|mei|min|ming|na|nan|ning|ping|qi|qian|qiang|qing|qiu|rong|rui|shan|sheng|shu|tao|ting|tong|wei|wen|wu|xi|xia|xian|xiang|xiao|xin|xing|xiu|xuan|xue|ya|yan|yang|yi|ying|yong|yu|yuan|yue|yun|zhen|zheng|zhi|zhong";
const pinyinName = new RegExp(`^(?:${surnames})(?:[._-]?(?:${syllables})){1,2}[0-9]*$`);


export function classifyInternalEmail(value: string, confirmed: string[]) {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email)) return null;
  const [name, domain] = email.split("@");
  if (confirmed.includes(email) || internalEmailDomains.includes(domain)) return "excluded";
  return pinyinName.test(name.split("+")[0]) ? "suspected" : null;
}
