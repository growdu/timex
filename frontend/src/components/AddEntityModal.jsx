import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eventsApi, placesApi, peopleApi, memoirsApi } from "../api";

const CONFIGS = {
  event: {
    title: "添加事件",
    fields: [
      { name: "title", label: "标题", type: "text", required: true, ph: "如：女儿出生" },
      { name: "date", label: "日期", type: "date", required: true },
      { name: "location", label: "地点", type: "text", ph: "如：北京协和医院" },
      { name: "stage", label: "阶段", type: "select", opts: [
        { v: "", l: "请选择" }, { v: "student", l: "学生时代" }, { v: "first-job", l: "初入职场" },
        { v: "maker", l: "创作试验" }, { v: "family", l: "家庭时刻" }, { v: "custom", l: "自定义" },
      ]},
      { name: "summary", label: "摘要", type: "textarea", ph: "一两句话概括" },
    ],
    api: eventsApi.create, qk: ["events"],
  },
  place: {
    title: "添加地点",
    fields: [
      { name: "name", label: "名称", type: "text", required: true, ph: "如：北京中关村" },
      { name: "type", label: "类型", type: "select", opts: [
        { v: "city", l: "城市" }, { v: "travel", l: "旅行" }, { v: "family", l: "家庭" }, { v: "daily", l: "日常" },
      ]},
      { name: "summary", label: "简介", type: "text", ph: "一句话描述" },
      { name: "latitude", label: "纬度", type: "number", ph: "39.98" },
      { name: "longitude", label: "经度", type: "number", ph: "116.31" },
    ],
    api: placesApi.create, qk: ["places"],
  },
  person: {
    title: "添加人物",
    fields: [
      { name: "name", label: "姓名", type: "text", required: true, ph: "如：张三" },
      { name: "role", label: "角色", type: "text", ph: "如：家人、同事、朋友" },
      { name: "intro", label: "简介", type: "textarea", ph: "一句话描述" },
    ],
    api: peopleApi.create, qk: ["people"],
  },
  memoir: {
    title: "创建回忆录",
    fields: [
      { name: "title", label: "标题", type: "text", required: true, ph: "如：我的2024" },
      { name: "blurb", label: "简介", type: "textarea", ph: "回忆录的简要描述" },
    ],
    api: memoirsApi.create, qk: ["memoirs"],
  },
};

export default function AddEntityModal({ type, onClose }) {
  const cfg = CONFIGS[type];
  const [vals, setVals] = useState({});
  const [err, setErr] = useState("");
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: cfg.api,
    onSuccess: () => { qc.invalidateQueries({ queryKey: cfg.qk }); qc.invalidateQueries({ queryKey: ["dashboard"] }); onClose(); },
    onError: (e) => setErr(e.response?.data?.message || "创建失败"),
  });

  const submit = (e) => {
    e.preventDefault();
    for (const f of cfg.fields) {
      if (f.required && !vals[f.name]) { setErr(`请填写${f.label}`); return; }
    }
    setErr("");
    mut.mutate(vals);
  };

  const set = (k, v) => setVals((p) => ({ ...p, [k]: v }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{cfg.title}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="modal-form" onSubmit={submit}>
          {cfg.fields.map((f) => (
            <label key={f.name} className="modal-field">
              <span>{f.label}{f.required && " *"}</span>
              {f.type === "select" ? (
                <select value={vals[f.name] || ""} onChange={(e) => set(f.name, e.target.value)}>
                  {f.opts.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              ) : f.type === "textarea" ? (
                <textarea value={vals[f.name] || ""} onChange={(e) => set(f.name, e.target.value)} placeholder={f.ph} rows={3} />
              ) : (
                <input type={f.type} value={vals[f.name] || ""} onChange={(e) => set(f.name, e.target.value)} placeholder={f.ph} />
              )}
            </label>
          ))}
          {err && <p className="auth-error">{err}</p>}
          <div className="modal-actions">
            <button type="button" className="ghost-button" onClick={onClose}>取消</button>
            <button type="submit" className="primary-button" disabled={mut.isPending}>
              {mut.isPending ? "创建中..." : "创建"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
