/**
 * 使い方:
 * 1. Chromeでbookwalker.jp または booklive.jp の「本棚」ページを開き、ログインした状態にする
 * 2. F12(または右クリック→検証)でデベロッパーツールを開き、"Console"タブを選ぶ
 * 3. このファイルの中身を丸ごとコピーして貼り付け、Enter
 * 4. 抽出結果がコンソールに表示される(件数が正しいか確認する)
 * 5. 問題なければ sendToGas() を実行してGASのWeb Appに送信する
 *
 * ※ 注意: このファイルはあくまで「雛形」です。
 *   bookwalker.jp / booklive.jp の本棚ページの実際のHTML構造(クラス名など)を
 *   まだ確認できていないため、下記のセレクタはダミーです。
 *   実際のページで動かして結果がおかしければ、
 *   本棚ページで1冊分の要素を右クリック→「検証」して出てきたHTMLを
 *   共有してください。セレクタを実物に合わせて修正します。
 */

function scrapeBookWalkerShelf() {
  const items = document.querySelectorAll('section.book-item');
  const entries = [];
  items.forEach(function (el) {
    const linkEl = el.querySelector('.book-tl h2 a');
    if (!linkEl) return;
    const href = linkEl.getAttribute('href') || '';
    const m = href.match(/bookwalker\.jp\/(de[0-9a-f-]+)/i);
    if (!m) return;
    const imgEl = el.querySelector('.book-img img');
    const authorEl = el.querySelector('.book-meta-item-author');
    entries.push({
      store: 'bw',
      bwId: m[1],
      title: linkEl.textContent.trim(),
      author: authorEl ? authorEl.textContent.trim() : '',
      coverUrl: imgEl ? imgEl.src : ''
    });
  });
  console.log('BOOK☆WALKER: ' + entries.length + '件抽出(このページ分)');
  console.table(entries);
  return entries;
}

function scrapeBookLiveShelf() {
  const items = document.querySelectorAll('li.item');
  const entries = [];
  items.forEach(function (el) {
    const linkEl = el.querySelector('.title a.sl-title1');
    if (!linkEl) return;
    const href = linkEl.getAttribute('href') || '';
    const m = href.match(/title_id\/(\d+)\/vol_no\/(\d+)/);
    if (!m) return;
    const imgEl = el.querySelector('.picture img');
    const authorEl = el.querySelector('a[href*="/focus/author/"]');
    // レーベル(雑誌名)らしきリンク。k_idsのリンクテキストがCode.gsのLABEL_FOLDER_RULESと一致する
    const labelEl = el.querySelector('a[href*="/search/keyword/k_ids/"]');
    entries.push({
      store: 'bl',
      blTitleId: m[1],
      blVolNo: m[2],
      // alt属性に「タイトル: 巻数」の形で入っているのでそのまま使う(無ければリンクの文字を使う)
      title: (imgEl && imgEl.alt) ? imgEl.alt.trim() : linkEl.textContent.trim(),
      author: authorEl ? authorEl.textContent.trim() : '',
      coverUrl: imgEl ? imgEl.src : '',
      label: labelEl ? labelEl.textContent.trim() : ''
    });
  });
  console.log('BookLive: ' + entries.length + '件抽出(このページ分)');
  console.table(entries);
  return entries;
}

// GASのWeb App URLに送信する(setupSheet実行後、Web Appとしてデプロイしたexec URLを設定)
async function sendToGas(entries) {
  const GAS_WEBAPP_URL = 'https://script.google.com/macros/s/XXXXXXXXXXXXXXXX/exec';
  const res = await fetch(GAS_WEBAPP_URL, {
    method: 'POST',
    body: JSON.stringify({ entries: entries })
  });
  const json = await res.json();
  console.log('送信結果:', json);
  return json;
}

// 実行例(本棚ページで):
// const entries = scrapeBookWalkerShelf();  // または scrapeBookLiveShelf();
// sendToGas(entries);
