/* ============================================
 * 人生养成系统 v3.0 — skills.js
 * 技能面板：学习技能 / 经验 / 等级
 * ============================================ */
(function (window) {
  'use strict';
  const LS = (window.LS = window.LS || {});

  // ---------- 技能渲染 ----------
  LS.renderSkills = function () {
    const slot = document.getElementById('skills-slot');
    if (!slot) return;
    slot.innerHTML = buildSkillsHtml();
  };

  function buildSkillsHtml() {
    let html = '<div class="section-header"><span class="section-title">技能面板</span>' +
      '<button class="btn-icon" onclick="LS.openLearnSkillModal()" title="学习新技能"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button></div>' +
      '<div class="skill-list">';
    const skills = LS.state.skills;
    if (!skills.length) {
      html += '<div class="empty-state"><div class="empty-state-icon">⌘</div>' +
        '<div class="empty-state-text">尚未学习任何技能<br>点击 + 学习第一项技能</div></div>';
    } else {
      skills.forEach(skill => {
        const xpNeed = LS.xpToNext(skill.level);
        const xpPct = Math.min(100, Math.round(skill.xp / xpNeed * 100));
        html += '<div class="skill-item">' +
          '<div class="skill-top"><div class="skill-name-wrap">' +
          '<span class="skill-icon">' + skill.icon + '</span>' +
          '<span class="skill-name">' + LS.escapeHtml(skill.name) + '</span></div>' +
          '<span class="skill-level">Lv.<span class="lv-num">' + skill.level + '</span></span></div>' +
          '<div class="skill-xp-bar"><div class="skill-xp-fill" style="width:' + xpPct + '%"></div></div>' +
          '<div class="skill-bottom"><span>经验 ' + skill.xp + ' / ' + xpNeed + '</span><span>' + xpPct + '%</span></div>' +
          (skill.description ? '<div class="skill-desc">' + LS.escapeHtml(skill.description) + '</div>' : '') +
          '</div>';
      });
    }
    html += '</div>';
    return html;
  }

  // ---------- 学习新技能 ----------
  LS.openLearnSkillModal = function () {
    const iconOptions = LS.SKILL_ICONS.map(ic => '<option value="' + ic + '">' + ic + '</option>').join('');
    LS.openModal('<div class="modal-title">学习新技能</div>' +
      '<div class="form-group"><label class="form-label">技能名称</label>' +
      '<input type="text" class="form-input" id="modal-skill-name" placeholder="如：编程、绘画、外语..." maxlength="10"></div>' +
      '<div class="form-group"><label class="form-label">技能图标</label>' +
      '<select class="select-input" id="modal-skill-icon">' + iconOptions + '</select></div>' +
      '<div class="form-group"><label class="form-label">技能描述（可选）</label>' +
      '<input type="text" class="form-input" id="modal-skill-desc" placeholder="简要说明这项技能..." maxlength="40"></div>' +
      '<button class="btn btn-primary btn-block" onclick="LS.learnSkill()">确认学习</button>');
  };

  LS.learnSkill = function () {
    const name = document.getElementById('modal-skill-name').value.trim();
    if (!name) { LS.showToast('请输入技能名称', 'error'); return; }
    // 免费版数量限制
    const limit = LS.checkCustomLimit('skill');
    if (!limit.ok) { LS.showToast(limit.msg, 'error'); LS.openUpgradeModal('attrLimit'); return; }
    if (LS.state.skills.some(s => s.name === name)) { LS.showToast('该技能已存在', 'error'); return; }
    const icon = document.getElementById('modal-skill-icon').value;
    const desc = document.getElementById('modal-skill-desc').value.trim();
    LS.state.skills.push({
      id: LS.uid('skill'), name: name, icon: icon, level: 1, xp: 0,
      description: desc || null, unlockedAt: Date.now()
    });
    LS.saveState(); LS.closeModal(); LS.renderAll();
    LS.showToast('技能「' + name + '」已学习，等级 Lv.1', 'success');
  };

  // ---------- 技能经验奖励 ----------
  /** 给技能增加经验，处理升级 */
  LS.gainSkillXp = function (skillId, xp) {
    const skill = LS.state.skills.find(s => s.id === skillId);
    if (!skill || !xp) return;
    skill.xp += xp;
    let leveledUp = false;
    // 循环处理多级连升
    while (skill.xp >= LS.xpToNext(skill.level)) {
      skill.xp -= LS.xpToNext(skill.level);
      skill.level += 1;
      leveledUp = true;
    }
    if (leveledUp) {
      LS.showToast('💎 技能「' + skill.name + '」升级至 Lv.' + skill.level + '！', 'success');
    }
  };

})(window);
