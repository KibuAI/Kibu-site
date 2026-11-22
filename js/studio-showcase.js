/* ==========================================================================
   KIBU Live Studio Showcase — Timeline-Synced Choreographed Motion Controller
   Zero layout shift (CLS = 0), true pause/resume on hover/focus/reduced-motion,
   full WAI-ARIA tab keyboard navigation.
   ========================================================================== */
(function () {
  'use strict';

  var SCENE_DURATION_MS = 7800;

  var DRAFT_META = {
    inquiry: {
      bytes: '1,428 / 1,500 Bytes',
      instruction: '선택된 방향: 개념 적용 · 심화 탐구 (실험 활동지 + 발표 PPT 통합 서술)'
    },
    artifact: {
      bytes: '1,446 / 1,500 Bytes',
      instruction: '선택된 방향: 창의 표현 · 산출물 완성 (시각화 의도 및 발표 전달력 연결)'
    },
    partial: {
      bytes: '1,461 / 1,500 Bytes',
      instruction: '한줄 수정 지시 반영: "대조군 설정 이유만 한 문장으로 선명히 다듬고 나머지 문장은 그대로 유지해 주세요"'
    }
  };

  var CAPTIONS = [
    '복합기 60쪽 묶음 스캔본은 페이지별로, 이름 적힌 발표 PPT·한글 묶음(.zip 포함)은 학생별 서랍으로 자동 합산됩니다.',
    '스캔 원본 종이와 읽힌 글자를 나란히 대조하고, 흐린 글자 하나만 고치면 추가 비전 요금 없이 10초 만에 다시 씁니다.',
    '단순 보고서 요약을 배제하고, 학생이 모은 여러 자료(스캔+발표PPT)를 엮어 사고 과정 중심 문단으로 완성합니다.'
  ];

  function initStudioShowcase() {
    var root = document.getElementById('kibu-live-studio');
    if (!root) return;

    var tabButtons = Array.prototype.slice.call(root.querySelectorAll('[data-scene-tab]'));
    var scenes = Array.prototype.slice.call(root.querySelectorAll('[data-scene-panel]'));
    var playbackBtn = root.querySelector('[data-playback-toggle]');
    var playbackText = root.querySelector('[data-playback-label]');
    var statusCaption = root.querySelector('[data-studio-caption]');

    var incomingItems = Array.prototype.slice.call(root.querySelectorAll('[data-incoming-idx]'));
    var streamPills = Array.prototype.slice.call(root.querySelectorAll('[data-stream-idx]'));
    var scanChips = Array.prototype.slice.call(root.querySelectorAll('[data-arrived-group="scan"]'));
    var pptChips = Array.prototype.slice.call(root.querySelectorAll('[data-arrived-group="ppt"]'));
    var hwpChips = Array.prototype.slice.call(root.querySelectorAll('[data-arrived-group="hwp"]'));
    var drawerCards = Array.prototype.slice.call(root.querySelectorAll('[data-drawer-stu]'));
    var badges = {
      s1: root.querySelector('[data-count-badge="s1"]'),
      s2: root.querySelector('[data-count-badge="s2"]'),
      s3: root.querySelector('[data-count-badge="s3"]')
    };

    var ocrToken = root.querySelector('[data-ocr-token]');
    var ocrStatus = root.querySelector('[data-ocr-status]');

    var presetButtons = Array.prototype.slice.call(root.querySelectorAll('[data-preset-key]'));
    var variantLayers = Array.prototype.slice.call(root.querySelectorAll('[data-variant-layer]'));
    var draftBytes = root.querySelector('[data-draft-bytes]');
    var draftInst = root.querySelector('[data-draft-instruction]');

    var prefersReducedMotion = false;
    try {
      prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {}

    var activeSceneIndex = 0;
    var elapsedInScene = 0;
    var appliedStageStep = -1;
    var userPinnedVariant = null;
    var isHoverPaused = false;
    var isFocusPaused = false;
    var isManualPaused = prefersReducedMotion;
    var lastFrameTs = null;

    function setBadge(el, text, bump) {
      if (!el) return;
      if (el.textContent !== text) {
        el.textContent = text;
        if (bump && !prefersReducedMotion) {
          el.classList.add('bump');
          setTimeout(function () { el.classList.remove('bump'); }, 280);
        }
      }
    }

    function applyScene0Phase(phase, allowBump) {
      // phase: 0 = initial, 1 = scan routed, 2 = ppt routed, 3 = hwp/zip merged
      incomingItems.forEach(function (el, idx) {
        var routing = (phase === 1 && idx === 0) ||
                      (phase === 2 && idx === 1) ||
                      (phase === 3 && (idx === 2 || idx === 3));
        el.classList.toggle('is-routing', routing);
      });

      if (streamPills[0]) streamPills[0].classList.toggle('is-lit', phase >= 1);
      if (streamPills[1]) streamPills[1].classList.toggle('is-lit', phase >= 2);
      if (streamPills[2]) streamPills[2].classList.toggle('is-lit', phase >= 3);

      scanChips.forEach(function (c) { c.classList.toggle('is-arrived', phase >= 1); });
      pptChips.forEach(function (c) { c.classList.toggle('is-arrived', phase >= 2); });
      hwpChips.forEach(function (c) { c.classList.toggle('is-arrived', phase >= 3); });

      if (drawerCards[2]) drawerCards[2].classList.toggle('is-complete', phase >= 2);
      if (drawerCards[0]) drawerCards[0].classList.toggle('is-complete', phase >= 3);
      if (drawerCards[1]) drawerCards[1].classList.toggle('is-complete', phase >= 3);

      if (phase === 0) {
        setBadge(badges.s1, '자료 0', false);
        setBadge(badges.s2, '자료 0', false);
        setBadge(badges.s3, '자료 0', false);
      } else if (phase === 1) {
        setBadge(badges.s1, '자료 1', allowBump);
        setBadge(badges.s2, '자료 1', allowBump);
        setBadge(badges.s3, '자료 1', allowBump);
      } else if (phase === 2) {
        setBadge(badges.s1, '자료 2', allowBump);
        setBadge(badges.s2, '자료 2', allowBump);
        setBadge(badges.s3, '자료 2', allowBump);
      } else {
        setBadge(badges.s1, '자료 3', allowBump);
        setBadge(badges.s2, '자료 3', allowBump);
        setBadge(badges.s3, '자료 2', false);
      }
    }

    function applyScene1Phase(phase) {
      if (!ocrToken) return;
      if (phase === 0) {
        ocrToken.textContent = '이산화망간(오독 의심)';
        if (ocrStatus) ocrStatus.textContent = '손글씨 원문 대조 중...';
      } else {
        ocrToken.textContent = '이산화망가니즈(MnO₂) ✓';
        if (ocrStatus) ocrStatus.textContent = '단어 1개 정정 완료 · 이미지 재판독 없이 10초 재작성 준비됨';
      }
    }

    function applyDraftVariant(key) {
      var meta = DRAFT_META[key] || DRAFT_META.inquiry;
      presetButtons.forEach(function (btn) {
        var selected = btn.getAttribute('data-preset-key') === key;
        btn.classList.toggle('is-selected', selected);
        btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
      });
      variantLayers.forEach(function (layer) {
        layer.classList.toggle('is-selected', layer.getAttribute('data-variant-layer') === key);
      });
      if (draftBytes) draftBytes.textContent = meta.bytes + ' · 금지어 0건';
      if (draftInst) draftInst.textContent = meta.instruction;
    }

    function syncTimelineStep() {
      if (activeSceneIndex === 0) {
        var p0 = prefersReducedMotion ? 3 :
                 (elapsedInScene >= 3800 ? 3 : (elapsedInScene >= 2100 ? 2 : (elapsedInScene >= 400 ? 1 : 0)));
        if (p0 !== appliedStageStep) {
          applyScene0Phase(p0, appliedStageStep >= 0);
          appliedStageStep = p0;
        }
      } else if (activeSceneIndex === 1) {
        var p1 = (prefersReducedMotion || elapsedInScene >= 2000) ? 1 : 0;
        if (p1 !== appliedStageStep) {
          applyScene1Phase(p1);
          appliedStageStep = p1;
        }
      } else if (activeSceneIndex === 2) {
        if (userPinnedVariant) {
          if (appliedStageStep !== 99) {
            applyDraftVariant(userPinnedVariant);
            appliedStageStep = 99;
          }
          return;
        }
        var p2 = elapsedInScene >= 5000 ? 2 : (elapsedInScene >= 2500 ? 1 : 0);
        if (p2 !== appliedStageStep) {
          var key = p2 === 0 ? 'inquiry' : (p2 === 1 ? 'artifact' : 'partial');
          applyDraftVariant(key);
          appliedStageStep = p2;
        }
      }
    }

    function activateScene(index, focusTab) {
      activeSceneIndex = (index + scenes.length) % scenes.length;
      elapsedInScene = 0;
      appliedStageStep = -1;
      if (activeSceneIndex !== 2) {
        userPinnedVariant = null;
      }

      tabButtons.forEach(function (btn, idx) {
        var active = idx === activeSceneIndex;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
        btn.setAttribute('tabindex', active ? '0' : '-1');
        btn.style.setProperty('--progress', '0%');
        if (active && focusTab) {
          btn.focus();
        }
      });

      scenes.forEach(function (panel, idx) {
        panel.classList.toggle('is-active', idx === activeSceneIndex);
      });

      if (statusCaption && CAPTIONS[activeSceneIndex]) {
        statusCaption.textContent = CAPTIONS[activeSceneIndex];
      }

      syncTimelineStep();
    }

    function updatePlaybackIndicator() {
      if (!playbackBtn || !playbackText) return;
      var paused = isManualPaused || isHoverPaused || isFocusPaused;
      playbackBtn.classList.toggle('is-paused', paused);
      playbackBtn.setAttribute('aria-pressed', isManualPaused ? 'true' : 'false');
      playbackText.textContent = isManualPaused
        ? '자동 재생 멈춤 (클릭해 재생)'
        : ((isHoverPaused || isFocusPaused) ? '읽는 중 잠시 멈춤' : '실제 작업 흐름 자동 재생 중');
    }

    tabButtons.forEach(function (btn, idx) {
      btn.addEventListener('click', function () {
        userPinnedVariant = null;
        activateScene(idx, false);
      });

      btn.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          userPinnedVariant = null;
          activateScene(idx + 1, true);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          userPinnedVariant = null;
          activateScene(idx - 1, true);
        } else if (e.key === 'Home') {
          e.preventDefault();
          userPinnedVariant = null;
          activateScene(0, true);
        } else if (e.key === 'End') {
          e.preventDefault();
          userPinnedVariant = null;
          activateScene(scenes.length - 1, true);
        }
      });
    });

    presetButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-preset-key');
        userPinnedVariant = key;
        elapsedInScene = 0;
        if (tabButtons[activeSceneIndex]) {
          tabButtons[activeSceneIndex].style.setProperty('--progress', '0%');
        }
        applyDraftVariant(key);
        appliedStageStep = 99;
      });
    });

    if (playbackBtn) {
      playbackBtn.addEventListener('click', function () {
        isManualPaused = !isManualPaused;
        updatePlaybackIndicator();
      });
    }

    root.addEventListener('mouseenter', function () {
      isHoverPaused = true;
      updatePlaybackIndicator();
    });

    root.addEventListener('mouseleave', function () {
      isHoverPaused = false;
      updatePlaybackIndicator();
    });

    root.addEventListener('focusin', function () {
      isFocusPaused = true;
      updatePlaybackIndicator();
    });

    root.addEventListener('focusout', function (e) {
      if (!root.contains(e.relatedTarget)) {
        isFocusPaused = false;
        updatePlaybackIndicator();
      }
    });

    function tick(now) {
      if (lastFrameTs === null) lastFrameTs = now;
      var dt = Math.min(100, Math.max(0, now - lastFrameTs));
      lastFrameTs = now;

      if (!isManualPaused && !isHoverPaused && !isFocusPaused && !document.hidden) {
        elapsedInScene += dt;
        syncTimelineStep();

        var pct = Math.min(100, (elapsedInScene / SCENE_DURATION_MS) * 100);
        if (tabButtons[activeSceneIndex]) {
          tabButtons[activeSceneIndex].style.setProperty('--progress', pct.toFixed(1) + '%');
        }
        if (elapsedInScene >= SCENE_DURATION_MS) {
          userPinnedVariant = null;
          activateScene(activeSceneIndex + 1, false);
        }
      }

      requestAnimationFrame(tick);
    }

    activateScene(0, false);
    updatePlaybackIndicator();
    requestAnimationFrame(tick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStudioShowcase);
  } else {
    initStudioShowcase();
  }
})();
