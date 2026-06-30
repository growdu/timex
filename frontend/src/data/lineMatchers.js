// 4 条关系线的匹配器：根据 person.role 关键词 + event.stage 启发式判断一个事件属于哪条线。
// 时间线 / 空间线是结构维度，由 apiAdapter 直接处理（不需要 matcher）。

// 关键词覆盖中英文常见 role 表述。匹配是 OR 关系。
export const LINE_KEYWORDS = {
  emotion:
    /丈夫|妻子|恋人|伴侣|对象|情侣|爱人|前任|未婚夫|未婚妻|spouse|partner|lover|husband|wife|boyfriend|girlfriend|fiancé|fiancée/i,
  career:
    /同事|合伙|投资|导师|老板|经理|上司|下属|cofounder|co-founder|co-founder|investor|mentor|manager|CTO|CEO|founder|co.?founder/i,
  family:
    /家人|父母|父亲|母亲|女儿|儿子|哥|姐|妹|弟|姑|叔|姨|婆|公|爷爷|奶奶|姥爷|姥姥|family|father|mother|son|daughter|child|parent|dad|mom/i,
  friends:
    /朋友|同学|舍友|校友|发小|闺蜜|死党|friend|classmate|roommate|pal|buddy|schoolmate/i,
};

// 把生命阶段映射到一条关系线（兜底，没有合适 role 关键词时使用）
export const STAGE_TO_LINE = {
  student: "career",
  "first-job": "career",
  maker: "career",
  family: "family",
  custom: null,
};

// 从 event.people 抽取 role 字符串数组。event.people 可能是 id 数组或 person 对象数组。
function collectRoles(event, personMap) {
  const roles = [];
  const people = event?.people;
  if (!Array.isArray(people)) return roles;
  for (const p of people) {
    if (!p) continue;
    if (typeof p === "object") {
      if (p.role) roles.push(String(p.role));
    } else {
      const person = personMap.get(p);
      if (person?.role) roles.push(String(person.role));
    }
  }
  return roles;
}

// 判断单个 event 是否属于某条关系线。
// personMap: Map<id, person> 用于解析 people id 数组
export function isInLine(lineId, event, personMap) {
  if (!event || !lineId) return false;
  if (lineId === "time") return true; // 时间线 = 所有事件
  if (lineId === "space") return !!event.placeId; // 空间线 = 有地点

  // 关系线
  const regex = LINE_KEYWORDS[lineId];
  if (!regex) return false;

  const roles = collectRoles(event, personMap);
  if (roles.some((r) => regex.test(r))) return true;

  // 兜底：生命阶段映射
  if (STAGE_TO_LINE[event.stage] === lineId) return true;
  return false;
}

// 提取某个事件命中的所有线（去重）。用于统计"事件出现在几条线"。
export function matchedLines(event, personMap) {
  const result = new Set();
  for (const line of ["time", "space", "emotion", "career", "family", "friends"]) {
    if (isInLine(line, event, personMap)) result.add(line);
  }
  return Array.from(result);
}
