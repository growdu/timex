import { groupByPlace } from '../data/faceAdapter';

/**
 * 地点视图：按 placeId 聚合命中。
 * moment 没 placeId 的直接被 groupByPlace 过滤掉，所以这里不会渲染空桶。
 */
export function FacePlaceMap({ hits, places, onSelectPlace }) {
  const groups = groupByPlace(hits || [], places || []);
  if (groups.length === 0) {
    return <div className="face-empty">暂无地点命中</div>;
  }
  return (
    <ul className="place-list">
      {groups.map((b) => (
        <li key={b.place.id}>
          <button
            type="button"
            onClick={() => onSelectPlace && onSelectPlace(b.place)}
          >
            {b.place.name} · {b.items.length}
          </button>
        </li>
      ))}
    </ul>
  );
}

export default FacePlaceMap;