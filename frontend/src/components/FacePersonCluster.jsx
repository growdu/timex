import { groupByPerson } from '../data/faceAdapter';

/**
 * 人物聚类：fan-out 命中到人物桶。
 * person 解析不到的桶（hits 里有 personIds 但 allPeople 没收录）依然会展示，标「匿名」。
 */
export function FacePersonCluster({ hits, allPeople, onSelectPerson }) {
  const groups = groupByPerson(hits || [], allPeople || []);
  if (groups.length === 0) {
    return <div className="face-empty">暂无人物关联</div>;
  }
  return (
    <ul className="person-cluster">
      {groups.map((b) => (
        <li key={b.person?.id ?? 'anon'}>
          <button
            type="button"
            onClick={() => onSelectPerson && onSelectPerson(b.person)}
          >
            {b.person?.name ?? '匿名'} · {b.items.length}
          </button>
        </li>
      ))}
    </ul>
  );
}

export default FacePersonCluster;