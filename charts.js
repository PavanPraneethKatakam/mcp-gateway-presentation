(function () {
  "use strict";
  function num(v, d) { var n = Number(v); return isFinite(n) ? n : d; }
  function alpha(ink, a) {
    var s = String(ink || "#14161c").trim();
    var m = /^#([0-9a-fA-F]{3,8})$/.exec(s);
    if (m) {
      var h = m[1];
      if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
      if (h.length >= 6) {
        var n = parseInt(h.slice(0, 6), 16);
        return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
      }
    }
    return s;
  }
  function wrap(ctx, text, maxW, maxLines) {
    var words = String(text).split(/\s+/), lines = [], cur = "", i, test, last;
    for (i = 0; i < words.length; i++) {
      if (!words[i]) continue;
      test = cur ? cur + " " + words[i] : words[i];
      if (cur && ctx.measureText(test).width > maxW && lines.length < maxLines - 1) { lines.push(cur); cur = words[i]; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    if (lines.length > maxLines) lines = lines.slice(0, maxLines);
    last = lines[lines.length - 1];
    if (last && ctx.measureText(last).width > maxW) {
      while (last.length > 1 && ctx.measureText(last + "\u2026").width > maxW) last = last.slice(0, -1);
      lines[lines.length - 1] = last + "\u2026";
    }
    return lines;
  }
  function head(ctx, spec, k, ink, pl) {
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = ink;
    ctx.font = "500 " + 54 * k + "px Sora, sans-serif";
    ctx.fillText(String(spec.title || ""), pl, 80 * k);
    ctx.font = "400 " + 28 * k + "px Sora, sans-serif";
    ctx.fillStyle = alpha(ink, 0.6);
    ctx.fillText(String(spec.subtitle || ""), pl, 122 * k);
    ctx.fillStyle = ink;
  }
  function axes(ctx, spec, k, ink, pl, pt, pw, ph) {
    var yMin = num(spec.yMin, 0), yMax = num(spec.yMax, 1);
    if (yMax === yMin) yMax = yMin + 1;
    var yFmt = typeof spec.yFormat === "function" ? spec.yFormat : function (v) { return String(Math.round(v * 1e6) / 1e6); };
    var yOf = function (v) { return pt + ph * (yMax - v) / (yMax - yMin); };
    var stepRaw = num(spec.yStep, 0);
    var steps = Math.max(1, Math.round((yMax - yMin) / (stepRaw || (yMax - yMin) / 5)));
    var i, v, y;
    ctx.font = "400 " + 28 * k + "px Sora, sans-serif";
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (i = 0; i <= steps; i++) {
      v = yMin + (yMax - yMin) * i / steps;
      y = yOf(v);
      ctx.strokeStyle = "rgba(20,22,28,.10)";
      ctx.lineWidth = Math.max(1, k);
      ctx.beginPath(); ctx.moveTo(pl, y); ctx.lineTo(pl + pw, y); ctx.stroke();
      ctx.fillStyle = ink;
      ctx.fillText(String(yFmt(v)), pl - 16 * k, y);
    }
    ctx.strokeStyle = ink; ctx.lineWidth = 2 * k;
    ctx.beginPath();
    ctx.moveTo(pl, pt); ctx.lineTo(pl, pt + ph); ctx.lineTo(pl + pw, pt + ph);
    ctx.stroke();
    if (spec.yLabel) {
      ctx.save();
      ctx.translate(pl - 118 * k, pt + ph / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.font = "500 " + 28 * k + "px Sora, sans-serif";
      ctx.fillStyle = ink; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(String(spec.yLabel), 0, 0);
      ctx.restore();
    }
    return { yMin: yMin, yMax: yMax, yOf: yOf, yFmt: yFmt };
  }

  window.drawLineChart = function (ctx, W, H, spec, t) {
    spec = spec || {};
    t = Math.max(0, Math.min(1, num(t, 0)));
    var k = W / 1600, ink = spec.ink || "#14161c";
    var pl = 170 * k, pr = 230 * k, pt = 190 * k, pb = 160 * k;
    var pw = Math.max(1, W - pl - pr), ph = Math.max(1, H - pt - pb);
    ctx.save();
    head(ctx, spec, k, ink, pl);
    var A = axes(ctx, spec, k, ink, pl, pt, pw, ph);
    var xs = Array.isArray(spec.x) ? spec.x.map(function (v) { return num(v, 0); }) : [];
    var xMin = xs.length ? Math.min.apply(null, xs) : 0;
    var xMax = xs.length ? Math.max.apply(null, xs) : 1;
    if (xMax === xMin) xMax = xMin + 1;
    var xOf = function (v) { return pl + pw * (v - xMin) / (xMax - xMin); };
    var i, xp, hX, hx, lx, lw;

    var xt = Array.isArray(spec.xTicks) ? spec.xTicks : [];
    ctx.font = "400 " + 28 * k + "px Sora, sans-serif";
    ctx.fillStyle = ink; ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (i = 0; i < xt.length; i++) {
      xp = (xs.length > 1 && i < xs.length) ? xOf(xs[i]) : pl + pw * (xt.length > 1 ? i / (xt.length - 1) : 0.5);
      ctx.fillText(String(xt[i]), xp, pt + ph + 18 * k);
    }
    if (spec.xLabel) {
      ctx.font = "500 " + 28 * k + "px Sora, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "top"; ctx.fillStyle = ink;
      ctx.fillText(String(spec.xLabel), pl + pw / 2, pt + ph + 78 * k);
    }
    hX = Number(spec.highlightX);
    if (spec.highlightX !== undefined && spec.highlightX !== null && isFinite(hX)) {
      hx = xOf(hX);
      if (hx >= pl - 0.5 && hx <= pl + pw + 0.5) {
        ctx.save();
        ctx.setLineDash([9 * k, 9 * k]);
        ctx.lineWidth = 2 * k; ctx.strokeStyle = alpha(ink, 0.45);
        ctx.beginPath(); ctx.moveTo(hx, pt); ctx.lineTo(hx, pt + ph); ctx.stroke();
        ctx.restore();
        if (spec.highlightLabel) {
          ctx.font = "400 " + 26 * k + "px Sora, sans-serif";
          ctx.fillStyle = ink; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
          lw = ctx.measureText(String(spec.highlightLabel)).width;
          lx = Math.min(Math.max(hx, pl + lw / 2 + 6 * k), pl + pw - lw / 2 - 6 * k);
          ctx.fillText(String(spec.highlightLabel), lx, pt - 18 * k);
        }
      }
    }

    var series = Array.isArray(spec.series) ? spec.series : [];
    var clipX = pl + pw * t, labels = [];
    series.forEach(function (s) {
      s = s || {};
      var color = s.color || ink;
      var vals = Array.isArray(s.values) ? s.values : [];
      var n = Math.min(vals.length, xs.length);
      if (!n) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(pl - 2 * k, pt - 4 * k, Math.max(0, pw * t) + 2 * k, ph + 8 * k);
      ctx.clip();
      ctx.beginPath();
      for (var j = 0; j < n; j++) {
        var px = xOf(xs[j]), py = A.yOf(num(vals[j], A.yMin));
        if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.lineWidth = Math.max(1, num(s.width, 3) * k);
      ctx.strokeStyle = color; ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.stroke();
      ctx.restore();
      for (var m = 0; m < n; m++) {
        var cx = xOf(xs[m]), cy = A.yOf(num(vals[m], A.yMin));
        if (cx > clipX + 0.01 * k) break;
        ctx.beginPath();
        ctx.arc(cx, cy, 9 * k, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
        ctx.lineWidth = 3 * k; ctx.strokeStyle = "#ffffff"; ctx.stroke();
      }
      labels.push({
        x: xOf(xs[n - 1]) + 16 * k,
        y: A.yOf(num(vals[n - 1], 0)),
        text: String(s.name || "") + " " + num(vals[n - 1], 0).toFixed(3),
        color: color
      });
    });
    if (t >= 0.999 && labels.length) {
      labels.sort(function (a, b) { return a.y - b.y; });
      for (i = 1; i < labels.length; i++) {
        if (labels[i].y - labels[i - 1].y < 34 * k) labels[i].y = labels[i - 1].y + 34 * k;
      }
      ctx.font = "500 " + 28 * k + "px Geist Mono, monospace";
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      labels.forEach(function (L) { ctx.fillStyle = L.color; ctx.fillText(L.text, L.x, L.y); });
    }
    ctx.restore();
  };

  window.drawBarChart = function (ctx, W, H, spec, t) {
    spec = spec || {};
    t = Math.max(0, Math.min(1, num(t, 0)));
    var k = W / 1600, ink = spec.ink || "#14161c";
    var pl = 170 * k, pr = 230 * k, pt = 190 * k, pb = 160 * k;
    var pw = Math.max(1, W - pl - pr), ph = Math.max(1, H - pt - pb);
    ctx.save();
    head(ctx, spec, k, ink, pl);
    var A = axes(ctx, spec, k, ink, pl, pt, pw, ph);
    var series = Array.isArray(spec.series) ? spec.series : [];
    var cats = Array.isArray(spec.categories) ? spec.categories : [];
    var ns = series.length, nc = cats.length;
    var slot = pw / Math.max(1, nc);
    var groupW = slot * 0.72;
    var gap = 10 * k;
    var barW = Math.max(1, (groupW - gap * Math.max(0, ns - 1)) / Math.max(1, ns));
    var baseY = Math.min(pt + ph, Math.max(pt, A.yOf(0)));
    var vf = typeof spec.yFormat === "function" ? spec.yFormat : function (v) { return v.toFixed(2); };
    var gi = 0, c, si, q;
    for (c = 0; c < nc; c++) {
      for (si = 0; si < ns; si++, gi++) {
        var se = series[si] || {};
        var vals = Array.isArray(se.values) ? se.values : [];
        var v = num(vals[c], 0);
        var lp = Math.max(0, Math.min(1, (t - gi * 0.04) / 0.5));
        var e = 1 - Math.pow(1 - lp, 3);
        var bx = pl + c * slot + (slot - groupW) / 2 + si * (barW + gap);
        var yv = A.yOf(v);
        var top = baseY + (yv - baseY) * e;
        ctx.fillStyle = se.color || ink;
        ctx.fillRect(bx, Math.min(baseY, top), barW, Math.max(0, Math.abs(baseY - top)));
        if (lp >= 1) {
          ctx.font = "500 " + 24 * k + "px Geist Mono, monospace";
          ctx.fillStyle = ink; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
          ctx.fillText(String(vf(v)), bx + barW / 2, yv - 10 * k);
        }
      }
    }
    ctx.font = "400 " + 26 * k + "px Sora, sans-serif";
    ctx.fillStyle = ink; ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (c = 0; c < nc; c++) {
      var lines = wrap(ctx, String(cats[c] == null ? "" : cats[c]), slot * 0.94, 2);
      for (q = 0; q < lines.length; q++) {
        ctx.fillText(lines[q], pl + c * slot + slot / 2, pt + ph + 18 * k + q * 34 * k);
      }
    }
    ctx.font = "400 " + 26 * k + "px Sora, sans-serif";
    var items = series.map(function (s) {
      s = s || {};
      var name = String(s.name || "");
      return { name: name, color: s.color || ink, w: 38 * k + ctx.measureText(name).width };
    });
    var total = 0;
    for (q = 0; q < items.length; q++) total += items[q].w + (q ? 40 * k : 0);
    var lx = Math.max(pl, W - pr - total), ly = 60 * k;
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    for (q = 0; q < items.length; q++) {
      ctx.fillStyle = items[q].color;
      ctx.fillRect(lx, ly - 13 * k, 26 * k, 26 * k);
      ctx.fillStyle = ink;
      ctx.fillText(items[q].name, lx + 38 * k, ly);
      lx += items[q].w + 40 * k;
    }
    ctx.restore();
  };
})();