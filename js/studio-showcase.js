/* ==========================================================================
   KIBU Live Studio Showcase — Timeline-Synced Choreographed Motion Controller
   - Center semi-transparent video-style Play / Pause (▶ / ❚❚) overlay button
   - No surprise auto-freeze on mouse hover; crystal-clear explicit play/pause
   - Zero layout shift (CLS = 0) across all scenes & presets
   ========================================================================== */
(function () {
  'use strict';

  var SCENE_DURATION_MS = 7600;

  var DRAFT_META = {
    inquiry: {
      bytes: '585 / 1,500 Bytes',
      instruction: '개념 적용 · 심화 탐구 (실험 활동지 + 발표 PPT 통합)'
    },
    artifact: {
      bytes: '549 / 1,500 Bytes',
      instruction: '창의 표현 · 산출물 완성 (시각화 의도 · 발표 전달력 연결)'
    },
    partial: {
      bytes: '612 / 1,500 Bytes',
      instruction: '한줄 수정 지시 반영: "대조군 설정 이유만 선명히 다듬고 앞뒤 문장은 유지"'
    }
  };

  var CAPTIONS = [
    '60쪽 묶음 스캔본은 페이지별로, 이름 적힌 PPT·한글·ZIP 묶음은 학생별 서랍으로 자동 합산됩니다.',
    '손글씨 원본과 읽힌 글자를 나란히 대조하고, 흐린 단어만 고치면 추가 요금 없이 다시 씁니다.',
    '모아 둔 여러 자료를 엮어 탐구 과정을 서술하고, 원하는 한 문장만 부분 수정합니다.'
  ];

  function initStudioShowcase() {
    var root = document.getElementById('kibu-live-studio');
    if (!root) return;

    var viewport = root.querySelector('.studio-viewport');
    var tabButtons = Array.prototype.slice.call(root.querySelectorAll('[data-scene-tab]'));
    var scenes = Array.prototype.slice.call(root.querySelectorAll('[data-scene-panel]'));
    var playbackBtn = root.querySelector('[data-playback-toggle]');
    var playbackText = root.querySelector('[data-playback-label]');
    var centerTransportBtn = root.querySelector('[data-center-transport]');
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
    var isPaused = prefersReducedMotion;
    var controlsHideTimer = null;
    var pulseTimer = null;
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
        if (ocrStatus) ocrStatus.textContent = '단어 1개 정정 완료 · 즉시 반영';
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
                 (elapsedInScene >= 3600 ? 3 : (elapsedInScene >= 1950 ? 2 : (elapsedInScene >= 350 ? 1 : 0)));
        if (p0 !== appliedStageStep) {
          applyScene0Phase(p0, appliedStageStep >= 0);
          appliedStageStep = p0;
        }
      } else if (activeSceneIndex === 1) {
        var p1 = (prefersReducedMotion || elapsedInScene >= 1900) ? 1 : 0;
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

    function updatePlaybackUI(pulseCenter) {
      if (viewport) {
        viewport.classList.toggle('is-paused', isPaused);
      }

      if (playbackBtn && playbackText) {
        playbackBtn.classList.toggle('is-paused', isPaused);
        playbackText.textContent = isPaused ? '일시정지됨 · 재생하기' : '자동 재생 중';
      }

      if (centerTransportBtn) {
        centerTransportBtn.setAttribute('aria-label', isPaused ? '자동 재생 시작' : '자동 재생 일시정지');
        centerTransportBtn.setAttribute('title', isPaused ? '클릭하여 자동 재생' : '클릭하여 일시정지');
        if (pulseCenter && !prefersReducedMotion) {
          if (pulseTimer) clearTimeout(pulseTimer);
          centerTransportBtn.classList.add('is-pulsing');
          pulseTimer = setTimeout(function () {
            centerTransportBtn.classList.remove('is-pulsing');
          }, 240);
        }
      }
    }

    function togglePaused() {
      isPaused = !isPaused;
      if (!isPaused) {
        revealHoverControlsTemporarily();
      }
      updatePlaybackUI(true);
    }

    function revealHoverControlsTemporarily() {
      if (!viewport) return;
      viewport.classList.add('is-controls-visible');
      if (controlsHideTimer) {
        clearTimeout(controlsHideTimer);
      }
      controlsHideTimer = setTimeout(function () {
        if (!isPaused && viewport) {
          viewport.classList.remove('is-controls-visible');
        }
      }, 1900);
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
      playbackBtn.addEventListener('click', togglePaused);
    }

    if (centerTransportBtn) {
      centerTransportBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        togglePaused();
      });
    }

    if (viewport) {
      viewport.addEventListener('mouseenter', revealHoverControlsTemporarily);
      viewport.addEventListener('mousemove', revealHoverControlsTemporarily);
      viewport.addEventListener('mouseleave', function () {
        if (controlsHideTimer) clearTimeout(controlsHideTimer);
        viewport.classList.remove('is-controls-visible');
      });
    }

    function tick(now) {
      if (lastFrameTs === null) lastFrameTs = now;
      var dt = Math.min(100, Math.max(0, now - lastFrameTs));
      lastFrameTs = now;

      if (!isPaused && !document.hidden) {
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
    updatePlaybackUI(false);
    requestAnimationFrame(tick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStudioShowcase);
  } else {
    initStudioShowcase();
  }
})();
