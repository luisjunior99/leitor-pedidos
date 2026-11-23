// Etiqueta térmica da picklist (mesmo modelo da extensão Quirino Pedidos)
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const PLAT = { tiktok: ['TIKTOK', 'TK'], mercado: ['MERCADO LIVRE', 'ML'], shopee: ['SHOPEE', 'SP'], shein: ['SHEIN', 'SH'], amazon: ['AMAZON', 'AMZ'], magalu: ['MAGALU', 'MG'] };
  const plat = p => PLAT[p] || [String(p || '').toUpperCase(), String(p || '').slice(0, 2).toUpperCase()];
  // "2026-11-20 07:58:26" -> "20/11/2026 07:58"
  function fmtData(s) {
    const m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : (s || '');
  }

  function qrSvg(text) {
    const q = new window.QRCodeLib(-1, window.QRErrorCorrectLevel.L);
    q.addData(text); q.make();
    const n = q.getModuleCount(), m = 1, s = n + m * 2;
    let p = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) p += `M${c + m},${r + m}h1v1h-1z`;
    return `<svg class="qr" viewBox="0 0 ${s} ${s}" shape-rendering="crispEdges"><rect width="${s}" height="${s}" fill="#fff"/><path d="${p}" fill="#000"/></svg>`;
  }
  // ---------- conteúdo do QR: link do app leitor + dados compactos depois do "#" ----------
  // Formato compacto (só A-Z a-z 0-9 . - _ ~) para o QR ficar pequeno.
  // Cada etiqueta leva o cabeçalho do pedido + o produto dela.
  const APP_URL = 'https://luisjunior99.github.io/leitor-pedidos/';
  const MAXH = 160;
  const enc = v => String(v == null ? '' : v).normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
    .replace(/[^A-Za-z0-9.\- ]/g, c => c.charCodeAt(0) < 256 ? '_' + c.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0') : '')
    .replace(/ /g, '__');
  const PCODE = { tiktok: 't', mercado: 'm', shopee: 's' };
  const b64u = hex => btoa(hex.match(/../g).map(h => String.fromCharCode(parseInt(h, 16))).join('')).replace(/\+/g, '-').replace(/\//g, '.').replace(/=+$/, '');
  function imgCode(u) {
    u = String(u || '');
    let m = u.match(/ibyteimg\.com\/tos-alisg-i-aphluv4xwc-sg\/([0-9a-f]{32})~tplv-aphluv4xwc-origin-jpeg\.jpeg/);
    if (m) return 't' + b64u(m[1]);
    m = u.match(/mlstatic\.com\/D_(?:NQ_NP_)?(\d+)-(ML[A-Z])(\d+)_(\d+)-([A-Z])\.(?:jpg|webp)/);
    if (m) return 'm' + [m[1], m[2], m[3], m[4], m[5]].join('.');
    return '';
  }
  function payCode(s) { // "2026-11-20 07:58:26" -> base36 de 2611200758
    const m = String(s || '').match(/\d{2}(\d{2})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
    return m ? parseInt(m.slice(1).join(''), 10).toString(36) : '';
  }
  const idCode = s => /^\d{1,30}$/.test(String(s || '')) ? BigInt(s).toString(36) : enc(s);
  function qrText(o, it, idx, n) {
    const build = (shop, pid, img, attr) => ['3', enc(o.num), pid, PCODE[o.plat] || enc(o.plat).slice(0, 6), shop, payCode(o.pay), (o.dl || 0).toString(36), idx + '.' + n,
      enc(it.sku), attr, it.qty, img].join('~');
    const shopFull = enc(o.shop), shopShort = enc(String(o.shop || '').slice(0, 8)), pid = idCode(o.platId), img = imgCode(it.img), attr = enc(it.attr);
    const tries = [
      [shopFull, pid, img, attr], [shopShort, pid, img, attr], [shopShort, '', img, attr],
      [shopShort, '', img, enc(String(it.attr || '').slice(0, 10))], [shopShort, '', '', attr], ['', '', '', enc(String(it.attr || '').slice(0, 10))]
    ];
    let h = '';
    for (const t of tries) { h = build.apply(null, t); if (h.length <= MAXH) break; }
    return APP_URL + '#' + h;
  }

  // ---------- etiqueta térmica (modelo da picklist do UpSeller) ----------
  function etiqueta(o, it, idx, nItens, seq, totalSeq) {
    const [pNome, pSigla] = plat(o.plat);
    return `<div class="lbl">
      <div class="top">
        <div class="cnt">${idx}/${nItens}</div>
        <div class="bcw">${code128Svg(o.num)}<div class="up">${esc(o.num)}</div></div>
      </div>
      <div class="ln">${esc(o.platId)} — (Loja: ${esc(o.shop)} (${esc(pSigla)}))</div>
      <div class="ln2">
        <span>Pago: ${esc(fmtData(o.pay))}</span>
        <span class="env">Envio: ${esc(o.dlStr || '-')}</span>
        <span class="plat ${pNome.length > 8 ? 'long' : ''}">${esc(pNome)}</span>
      </div>
      <div class="body">
        <img class="ph" src="${esc(it.img)}" referrerpolicy="no-referrer">
        ${qrSvg(qrText(o, it, idx, nItens))}
        <div class="tx ${o.note ? 'hasnote' : ''}">
          <div class="sku ${it.sku.length > 17 ? 'xlong' : it.sku.length > 14 ? 'long' : ''}">${esc(it.sku)}</div>
          <div class="attr">${esc(it.attr)}${it.qty > 1 ? `<span class="qty">× ${it.qty}</span>` : ''}</div>
          <div class="nm">${esc(it.name)}</div>
          ${o.note ? `<div class="note">Obs: ${esc(o.note)}</div>` : ''}
        </div>
      </div>
      <div class="seq">${seq} / ${totalSeq}</div>
    </div>`;
  }

  function termicas(list) {
    const labels = [];
    list.forEach(o => o.items.forEach((it, i) => labels.push([o, it, i + 1, o.items.length])));
    return labels.map((a, k) => etiqueta(a[0], a[1], a[2], a[3], k + 1, labels.length)).join('');
  }

  window.QPLabel = { termicas: termicas };
})();
