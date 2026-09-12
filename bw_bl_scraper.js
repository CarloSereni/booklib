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
  // ダミーのセレクタ例。実際のクラス名に置き換える必要があります。
  const items = document.querySelectorAll('.o-tile, .p-book-shelf-item, li.book-item');
  const entries = [];
  items.forEach(function (el) {
    const linkEl = el.querySelector('a[href*="bookwalker.jp/de"]');
    const imgEl = el.querySelector('img');
    const titleEl = el.querySelector('.title, .p-book-shelf-item__title') || imgEl;
    if (!linkEl) return;
    const m = linkEl.href.match(/bookwalker\.jp\/(de[0-9a-f-]+)/i);
    entries.push({
      store: 'bw',
      bwId: m ? m[1] : '',
      title: (titleEl && (titleEl.alt || titleEl.textContent) || '').trim(),
      coverUrl: imgEl ? imgEl.src : '',
      author: ''
    });
  });
  console.log('BOOK☆WALKER: ' + entries.length + '件抽出');
  console.table(entries);
  return entries;
}

function scrapeBookLiveShelf() {
  // ダミーのセレクタ例。実際のクラス名に置き換える必要があります。
  const items = document.querySelectorAll('.bookshelf-item, li.book-list-item');
  const entries = [];
  items.forEach(function (el) {
    const linkEl = el.querySelector('a[href*="title_id"]');
    const imgEl = el.querySelector('img');
    const titleEl = el.querySelector('.title, .book-title') || imgEl;
    if (!linkEl) return;
    const m = linkEl.href.match(/title_id\/(\d+)\/vol_no\/(\d+)/);
    entries.push({
      store: 'bl',
      blTitleId: m ? m[1] : '',
      blVolNo: m ? m[2] : '',
      title: (titleEl && (titleEl.alt || titleEl.textContent) || '').trim(),
      coverUrl: imgEl ? imgEl.src : '',
      author: ''
    });
  });
  console.log('BookLive: ' + entries.length + '件抽出');
  console.table(entries);
  return entries;
}

// GASのWeb App URLに送信する(setupSheet実行後、Web Appとしてデプロイしたexec URLを設定)
async function sendToGas(entries) {
  const GAS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbxYkOEGfLsHuXJ2MOfbU0IG5boxQEBKs209w57F77MHSckLcgPKOdB4IQr5rrEP1REKrw/exec';
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
