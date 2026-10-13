import { useState } from 'react';
import { FaceTimelineView } from './FaceTimelineView';
import { FacePersonCluster } from './FacePersonCluster';
import { FacePlaceMap } from './FacePlaceMap';

/**
 * 三 Tab 结果视图：时间线 / 人物 / 地点。
 *
 * - hits: 后端 /faces/search 返回的命中数组
 * - allPeople / places: 用于解析 person / place 元数据
 * - onSelectMoment(hit): 用户点击时间线条目
 *
 * tab key 用英文（time / person / place）便于后续扩展。
 */
export function FaceResultTabs({ hits, allPeople, places, onSelectMoment }) {
  const [tab, setTab] = useState('time');

  return (
    <div className="face-tabs">
      <nav className="face-tabs-nav" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'time'}
          className={tab === 'time' ? 'active' : ''}
          onClick={() => setTab('time')}
        >
          时间线
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'person'}
          className={tab === 'person' ? 'active' : ''}
          onClick={() => setTab('person')}
        >
          人物
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'place'}
          className={tab === 'place' ? 'active' : ''}
          onClick={() => setTab('place')}
        >
          地点
        </button>
      </nav>
      {tab === 'time' && (
        <FaceTimelineView hits={hits} onSelect={onSelectMoment} />
      )}
      {tab === 'person' && (
        <FacePersonCluster hits={hits} allPeople={allPeople} />
      )}
      {tab === 'place' && (
        <FacePlaceMap hits={hits} places={places} />
      )}
    </div>
  );
}

export default FaceResultTabs;