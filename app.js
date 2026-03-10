const setupSection = document.getElementById("setup");
const quizSection = document.getElementById("quiz");
const resultSection = document.getElementById("result");

const questionCountInput = document.getElementById("questionCount");
const startBtn = document.getElementById("startBtn");
const openExamplesBtn = document.getElementById("openExamplesBtn");
const speakBtn = document.getElementById("speakBtn");
const showAnswerBtn = document.getElementById("showAnswerBtn");
const nextBtn = document.getElementById("nextBtn");

const progressEl = document.getElementById("progress");
const devanagariEl = document.getElementById("devanagari");
const romanEl = document.getElementById("roman");
const japaneseEl = document.getElementById("japanese");
const resultTextEl = document.getElementById("resultText");

let quizCards = [];
let currentIndex = 0;

function parseSectionRows(lines, sectionTitle) {
  const start = lines.findIndex((line) => line.trim() === sectionTitle);
  if (start < 0) return [];

  const rows = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith("## ")) break;
    if (!line.startsWith("| ")) continue;
    if (line.includes("ディーバナーガリー") || line.includes("|---|")) continue;

    const cols = line
      .split("|")
      .map((v) => v.trim())
      .filter(Boolean);

    if (cols.length >= 3) {
      rows.push({ devanagari: cols[0], roman: cols[1], japanese: cols[2] });
    }
  }
  return rows;
}

function pickRandom(items, count) {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list.slice(0, count);
}

function renderCurrentCard() {
  const card = quizCards[currentIndex];
  progressEl.textContent = `問題 ${currentIndex + 1} / ${quizCards.length}`;
  devanagariEl.textContent = card.devanagari;
  romanEl.textContent = card.roman;
  japaneseEl.textContent = card.japanese;
  japaneseEl.classList.add("hidden");
  nextBtn.classList.add("hidden");
  showAnswerBtn.classList.remove("hidden");
}

async function startQuiz() {
  const requested = Number(questionCountInput.value) || 20;
  const total = Math.max(1, Math.floor(requested));

  const mdText = await fetch("./phrases.md").then((r) => r.text());
  const lines = mdText.split(/\r?\n/);

  const dailyRows = parseSectionRows(lines, "## 日常会話でよく使うフレーズ（500）");
  const officeRows = parseSectionRows(lines, "## オフィスでよく使うフレーズ（500）");

  const dailyCount = Math.floor(total / 2);
  const officeCount = total - dailyCount;

  const chosenDaily = pickRandom(dailyRows, Math.min(dailyCount, dailyRows.length));
  const chosenOffice = pickRandom(officeRows, Math.min(officeCount, officeRows.length));

  quizCards = pickRandom([...chosenDaily, ...chosenOffice], chosenDaily.length + chosenOffice.length);

  if (!quizCards.length) {
    alert("問題を作成できませんでした。phrases.md を確認してください。");
    return;
  }

  currentIndex = 0;
  setupSection.classList.add("hidden");
  resultSection.classList.add("hidden");
  quizSection.classList.remove("hidden");
  renderCurrentCard();
}

function speakCurrent() {
  if (!("speechSynthesis" in window)) {
    alert("このブラウザは読み上げ機能に対応していません。");
    return;
  }

  const text = devanagariEl.textContent;
  if (!text) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "hi-IN";
  utter.rate = 1;
  window.speechSynthesis.speak(utter);
}

function showAnswer() {
  japaneseEl.classList.remove("hidden");
  showAnswerBtn.classList.add("hidden");
  nextBtn.classList.remove("hidden");
}

function goNext() {
  currentIndex += 1;
  if (currentIndex >= quizCards.length) {
    quizSection.classList.add("hidden");
    resultSection.classList.remove("hidden");
    resultTextEl.textContent = `${quizCards.length}問を完了しました！`;
    setupSection.classList.remove("hidden");
    return;
  }
  renderCurrentCard();
}

function toPrettyHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const dailyRows = parseSectionRows(lines, "## 日常会話でよく使うフレーズ（500）");
  const officeRows = parseSectionRows(lines, "## オフィスでよく使うフレーズ（500）");

  const tableHtml = (rows) =>
    rows
      .map(
        (r) =>
          `<tr><td>${r.devanagari}</td><td>${r.roman}</td><td>${r.japanese}</td></tr>`
      )
      .join("");

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<title>例文集</title>
<style>
body{font-family:system-ui,sans-serif;padding:16px;line-height:1.5}
h1{margin-top:0}
table{width:100%;border-collapse:collapse;margin-bottom:24px}
th,td{border:1px solid #ddd;padding:8px;vertical-align:top}
th{background:#f1f5f9}
</style>
</head>
<body>
<h1>例文集</h1>
<h2>日常会話</h2>
<table><thead><tr><th>ディーバナーガリー</th><th>アルファベット表記</th><th>日本語訳</th></tr></thead><tbody>${tableHtml(
    dailyRows
  )}</tbody></table>
<h2>オフィス会話</h2>
<table><thead><tr><th>ディーバナーガリー</th><th>アルファベット表記</th><th>日本語訳</th></tr></thead><tbody>${tableHtml(
    officeRows
  )}</tbody></table>
</body>
</html>`;
}

async function openExamples() {
  const mdText = await fetch("./phrases.md").then((r) => r.text());
  const win = window.open("", "_blank");
  if (!win) {
    alert("ポップアップがブロックされました。");
    return;
  }
  win.document.open();
  win.document.write(toPrettyHtml(mdText));
  win.document.close();
}

startBtn.addEventListener("click", () => {
  startQuiz().catch((e) => {
    console.error(e);
    alert("問題の読み込みに失敗しました。HTTPサーバー経由で開いてください。");
  });
});

speakBtn.addEventListener("click", speakCurrent);
showAnswerBtn.addEventListener("click", showAnswer);
nextBtn.addEventListener("click", goNext);
openExamplesBtn.addEventListener("click", () => {
  openExamples().catch((e) => {
    console.error(e);
    alert("例文集の表示に失敗しました。");
  });
});
