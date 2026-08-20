/* ============================================
 * 人生养成系统 v5.1 — share.js
 * 分享卡片：生成成长战绩图（Canvas），下载 PNG
 * 适配小红书 / 朋友圈竖版（1080 x 1350）
 * ============================================ */
(function (window) {
  'use strict';
  const LS = (window.LS = window.LS || {});

  function drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  LS.renderShareCard = function (canvas) {
    const W = 1080, H = 1350;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const s = LS.state;
    const h = s.host;

    // 背景渐变（年轻风格）
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#2a1358');
    bg.addColorStop(0.5, '#7c2d92');
    bg.addColorStop(1, '#ec4899');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // 装饰圆
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(950, 150, 180, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(120, 1150, 140, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    // 顶部
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.font = '700 44px "Noto Sans SC", "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('人 生 养 成 系 统', W / 2, 120);
    ctx.font = '400 26px "Noto Sans SC", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.fillText('LIFE SYSTEM · 成长战绩', W / 2, 165);

    // 头像 + 宿主名
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    ctx.beginPath(); ctx.arc(W / 2, 320, 84, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 72px "Noto Serif SC", serif';
    ctx.fillText((h.name || '宿主').charAt(0), W / 2, 348);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 52px "Noto Sans SC", sans-serif';
    ctx.fillText(h.name || '未绑定宿主', W / 2, 470);

    // 主数据卡
    const daysLived = LS.getDaysLived(h.age || 0);
    const lifePct = (daysLived / LS.TOTAL_LIFE_DAYS * 100).toFixed(1);
    const cards = [
      { label: '人生进度', value: lifePct + '%' },
      { label: '连续打卡', value: s.streak + ' 天' },
      { label: '累计任务', value: s.totalTasksCompleted + ' 个' },
      { label: '成就徽章', value: s.achievementsUnlocked.length + ' 枚' }
    ];
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    drawRoundedRect(ctx, 90, 560, W - 180, 230, 32);
    ctx.fill();
    cards.forEach((c, i) => {
      const x = W / 2 + (i - 1.5) * 225;
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.font = '400 26px "Noto Sans SC", sans-serif';
      ctx.fillText(c.label, x, 640);
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 44px "JetBrains Mono", monospace';
      ctx.fillText(c.value, x, 710);
    });

    // 最高属性 & 技能
    let attrLine = '';
    const topAttr = [...s.attributes].sort((a, b) => b.value - a.value)[0];
    if (topAttr) attrLine = topAttr.name + ' Lv.' + LS.getAttrLevel(topAttr.value) + '（' + topAttr.value + '）';
    const topSkill = [...s.skills].sort((a, b) => b.level - a.level)[0];
    ctx.fillStyle = 'rgba(255,255,255,.16)';
    drawRoundedRect(ctx, 90, 860, W - 180, 210, 28);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.font = '400 28px "Noto Sans SC", sans-serif';
    ctx.fillText('最强属性', 140, 930);
    ctx.fillText('核心技能', 140, 1000);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 40px "Noto Sans SC", sans-serif';
    ctx.fillText(attrLine || '——', 360, 935);
    ctx.fillText(topSkill ? topSkill.name + ' Lv.' + topSkill.level : '——', 360, 1005);

    // 底部
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.font = '500 34px "Noto Sans SC", sans-serif';
    ctx.fillText('人生只有 36,500 天，今天也要认真通关。', W / 2, 1170);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.font = '400 24px "Noto Sans SC", sans-serif';
    ctx.fillText('LIFE SYSTEM · 数据仅存本地 · ' + LS.todayKey(), W / 2, 1225);
  };

  LS.openShareCardModal = function () {
    LS.openModal('<div class="modal-title">📤 分享成长战绩</div>' +
      '<div class="share-card-wrap"><canvas id="share-card"></canvas></div>' +
      '<div class="share-actions">' +
      '<button class="btn btn-primary" onclick="LS.downloadShareCard()">⬇ 保存图片</button>' +
      '<button class="btn btn-ghost" onclick="LS.closeModal()">关闭</button>' +
      '</div>');
    LS.renderShareCard(document.getElementById('share-card'));
  };

  LS.downloadShareCard = function () {
    const canvas = document.getElementById('share-card');
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'life-system-share-' + LS.todayKey() + '.png';
    a.click();
    LS.showToast('分享卡片已保存 📤', 'success');
  };

})(window);
