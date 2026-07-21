// 共享 Layout mock：把真实的 AppLayout / CleanHeader / App.jsx 全部 stub 成最小 DOM
// Page 组件用 <Layout>...</Layout> 包裹内容，我们只关心 children 渲染 + rightRail 位置

import React from "react";

export function makeLayoutMock() {
  const Layout = ({ children, rightRail, activeNav, pageNotice }) => (
    <div data-testid="layout" data-active-nav={activeNav} data-page-notice={pageNotice}>
      {rightRail && <aside data-testid="right-rail">{rightRail}</aside>}
      <main data-testid="layout-children">{children}</main>
    </div>
  );
  return Layout;
}

// Render 时把 children / rightRail 提取出来以便断言
export function findInTree(node, predicate) {
  const out = [];
  function walk(n) {
    if (!n) return;
    if (predicate(n)) out.push(n);
    if (n.props) {
      walk(n.props.children);
      walk(n.props.rightRail);
    }
  }
  walk(node);
  return out;
}
