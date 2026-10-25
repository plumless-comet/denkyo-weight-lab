
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR6gB0PX-sSyE_1C7aV7QTUMWPuLarUlLoDetENtCr3kQpiNDRu6MMsrbbBngotQUfZrrlAtQ5MMijJ/pub?gid=0&single=true&output=csv";

let products = [];

const grid = document.getElementById("product-grid");
const count = document.getElementById("product-count");
const filters = document.getElementById("series-filters");
const dialog = document.getElementById("product-dialog");

/* ===== CSVを読み込む ===== */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;

      row.push(cell.trim());

      if (row.some(value => value !== "")) rows.push(row);

      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());

  if (row.some(value => value !== "")) rows.push(row);

  return rows;
}


/* ===== 画像を作る共通処理 ===== */
function createProductImage(
  filename,
  alt,
  className,
  fallbackText = "⚙️"
) {
  const container = document.createElement("div");
  container.className = className;

  if (!filename) {
    container.textContent = fallbackText;
    return container;
  }

  const img = document.createElement("img");

  // 自分でアップロードした画像か、imagesフォルダの画像かを判定
  if (filename.startsWith("data:image/")) {
    img.src = filename;
  } else {
    img.src = `images/${filename}`;
  }

  img.alt = alt || "";
  img.loading = "lazy";

  img.addEventListener("error", () => {
    container.replaceChildren();
    container.textContent = fallbackText;
  }, { once: true });

  container.appendChild(img);
  return container;
}

/* ===== 製品一覧 ===== */
function renderProducts(series = "すべて") {
  if (!grid || !count) return;

  const filtered = products.filter(product =>
    series === "すべて" || product.series === series
  );

  count.textContent = `${filtered.length} ITEMS`;
  grid.replaceChildren();

  if (filtered.length === 0) {
    grid.textContent = "製品データがありません";
    return;
  }

  filtered.forEach(product => {
    const card = document.createElement("button");
    card.className = "product-card";
    card.type = "button";

    const image = createProductImage(
      product.image,
      product.name,
      "product-image"
    );

    const seriesLabel = document.createElement("div");
    seriesLabel.className = "product-series";
    seriesLabel.textContent = product.series;

    const name = document.createElement("h3");
    name.className = "product-name";
    name.textContent = product.name;

    const weight = document.createElement("div");
    weight.className = "product-weight";
    weight.textContent = product.weight
      ? `${product.weight} kg`
      : "重量未確認";

    const status = document.createElement("div");
    status.className = "product-status";
    status.textContent = product.status;

    card.append(image, seriesLabel, name, weight, status);
    card.addEventListener("click", () => showDetails(product));

    grid.appendChild(card);
  });
}

/* ===== 製品詳細 ===== */

/* ===== 製品詳細 ===== */
function showDetails(product) {
  if (!dialog) return;

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  setText("detail-series", product.series);
  setText("detail-name", product.name);

  setText(
    "detail-weight",
    product.weight ? `${product.weight} kg` : "未確認"
  );

  setText(
    "detail-description",
    product.description || "詳細情報は準備中です。"
  );

  setText(
    "detail-source",
    product.source || "公式ソース：未登録"
  );

  // 詳細画面の画像
  const detailImage = document.getElementById("detail-image");

  if (detailImage) {
    const imageSource = product.imageData || product.image;

    const imageElement = createProductImage(
      imageSource,
      product.name,
      "detail-image-content",
      "⚙️ 画像なし"
    );

    detailImage.replaceChildren(...imageElement.childNodes);
  }

  if (!dialog.open) {
    dialog.showModal();
  }
}


/* ===== 分類フィルター ===== */
if (filters) {
  filters.addEventListener("click", event => {
    const button = event.target.closest("button[data-series]");
    if (!button) return;

    filters.querySelectorAll(".filter-button").forEach(item => {
      item.classList.remove("active");
    });

    button.classList.add("active");
    renderProducts(button.dataset.series);
  });
}

/* ===== 詳細ダイアログを閉じる ===== */
const closeDialogButton = document.getElementById("dialog-close");

if (closeDialogButton && dialog) {
  closeDialogButton.addEventListener("click", () => dialog.close());

  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });
}

/* ===== シーソーの要素 ===== */
const leftSelect = document.getElementById("left-product-select");
const rightSelect = document.getElementById("right-product-select");

const leftList = document.getElementById("left-product-list");
const rightList = document.getElementById("right-product-list");

const leftTotal = document.getElementById("left-total");
const rightTotal = document.getElementById("right-total");

const leftItems = document.getElementById("left-items");
const rightItems = document.getElementById("right-items");

const beam = document.getElementById("seesaw-beam");
const seesawMessage = document.getElementById("seesaw-message");

const seesawItems = {
  left: [],
  right: []
};

let animationTimer = null;
let flyingGhosts = [];
let animationRunId = 0;

/* ===== 飛び出したコピーを片付ける ===== */
function clearFlyingGhosts() {
  flyingGhosts.forEach(ghost => {
    ghost.getAnimations().forEach(animation => animation.cancel());
    ghost.remove();
  });

  flyingGhosts = [];
}

/* ===== アニメーション停止 ===== */
function stopSeesawAnimations() {
  animationRunId++;

  if (animationTimer !== null) {
    clearTimeout(animationTimer);
    animationTimer = null;
  }

  clearFlyingGhosts();

  [leftItems, rightItems].forEach(container => {
    if (!container) return;

    container.querySelectorAll(".seesaw-item").forEach(item => {
      item.classList.remove("bounce", "launch", "flight");
    });
  });
}

/* ===== 製品選択欄 ===== */
function populateSeesawSelects() {
  [leftSelect, rightSelect].forEach(select => {
    if (!select) return;

    select.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "製品を選んでね";
    select.appendChild(placeholder);

    products
      .filter(product => product.weightGrams !== null)
      .forEach(product => {
        const option = document.createElement("option");
        option.value = product.number || product.name;
        option.textContent =
          `${product.name}（${product.weightGrams.toLocaleString("ja-JP")} g）`;

        select.appendChild(option);
      });
  });
}

/* ===== 製品を乗せる ===== */
function addProductToSide(side) {
  const select = side === "left" ? leftSelect : rightSelect;
  if (!select) return;

  const product = products.find(item =>
    (item.number || item.name) === select.value &&
    item.weightGrams !== null
  );

  if (!product) {
    if (seesawMessage) seesawMessage.textContent = "まず製品を選んでね！";
    return;
  }

  if (seesawItems[side].length >= 10) {
    if (seesawMessage) {
      seesawMessage.textContent = "片側に乗せられるのは最大10個まで！";
    }
    return;
  }

  stopSeesawAnimations();

  // 同じ製品を複数回乗せられる
  seesawItems[side].push({
    ...product,
    hiddenVisual: false
  });

  renderSeesawSide(side);
}


/* ===== 自由重量を乗せる ===== */
async function addCustomWeight(side) {
  const input = document.getElementById("custom-weight");
  const nameInput = document.getElementById("custom-name");

  if (!input) return;

  const rawValue = input.value.trim();
  const weight = Number(rawValue);

  if (
    rawValue === "" ||
    !Number.isFinite(weight) ||
    weight <= 0
  ) {
    if (seesawMessage) {
      seesawMessage.textContent =
        "1gより大きい重さを入力してね！";
    }
    return;
  }

  if (seesawItems[side].length >= 10) {
    if (seesawMessage) {
      seesawMessage.textContent =
        "片側に乗せられるのは最大10個まで！";
    }
    return;
  }

  try {
    const imageData = await readCustomImage();
    console.log("選択した画像:", imageData ? imageData.slice(0, 50) : "画像なし");
    const customName = nameInput?.value.trim();

    stopSeesawAnimations();

    seesawItems[side].push({
      name: customName ||
        `自由重量 ${weight.toLocaleString("ja-JP")}g`,
      number: "",
      weightGrams: weight,
      weight: String(weight / 1000),
      series: "自由重量",

      // アップロード画像のデータ
      image: "",
      imageData: imageData,

      source: "",
      status: "自由入力",
      description: "実験用に入力した重量です。",
      hiddenVisual: false
    });

    renderSeesawSide(side);

    // 入力欄をクリア
    input.value = "";

    const imageInput =
      document.getElementById("custom-image");

    if (imageInput) imageInput.value = "";

    if (nameInput) nameInput.value = "";

  } catch (error) {
    if (seesawMessage) {
      seesawMessage.textContent = error.message;
    }
  }
}



/* ===== 左右のリスト・合計重量 ===== */
function renderSeesawSide(side) {
  const items = seesawItems[side];
  const list = side === "left" ? leftList : rightList;
  const totalElement = side === "left" ? leftTotal : rightTotal;
  const visual = side === "left" ? leftItems : rightItems;

  if (!list || !totalElement || !visual) return;

  list.replaceChildren();
  visual.replaceChildren();

  let total = 0;

  items.forEach((product, index) => {
    // 見えなくなった製品も重量計算には残す
    total += product.weightGrams;

    const li = document.createElement("li");

    li.appendChild(
      document.createTextNode(
        `${product.name}（${product.weightGrams.toLocaleString("ja-JP")} g） `
      )
    );

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "×";
    removeButton.setAttribute(
      "aria-label",
      `${product.name}を取り除く`
    );

    removeButton.addEventListener("click", () => {
      stopSeesawAnimations();
      seesawItems[side].splice(index, 1);
      renderSeesawSide(side);
    });

    li.appendChild(removeButton);
    list.appendChild(li);

    // アップロード画像を優先し、なければ製品画像を表示
    const imageSource = product.imageData || product.image;

    const itemVisual = createProductImage(
      imageSource,
      product.name,
      "seesaw-item",
      product.name
    );

    itemVisual.title =
      `${product.name}：${product.weightGrams.toLocaleString("ja-JP")} g`;

    // 10倍差で飛び出したものは見た目だけ消す
    if (product.hiddenVisual) {
      itemVisual.style.visibility = "hidden";
    }

    visual.appendChild(itemVisual);
  });

  totalElement.textContent =
    `${total.toLocaleString("ja-JP")} g`;

  updateSeesaw();
}

/* ===== シーソーの角度・メッセージ ===== */
function updateSeesaw() {
  const leftWeight = seesawItems.left.reduce(
    (sum, product) => sum + product.weightGrams, 0
  );

  const rightWeight = seesawItems.right.reduce(
    (sum, product) => sum + product.weightGrams, 0
  );

  const difference = leftWeight - rightWeight;

  if (beam) {
    const angle = Math.max(-25, Math.min(25, -difference / 100));
    beam.style.transform = `rotate(${angle}deg)`;
  }

  if (seesawMessage) {
    if (leftWeight === rightWeight) {
      seesawMessage.textContent = "左右ぴったり同じ重さ！";
    } else {
      const heavier = leftWeight > rightWeight ? "左側" : "右側";
      seesawMessage.textContent =
        `${heavier}が重い！ 重量差 ${Math.abs(difference).toLocaleString("ja-JP")} g`;
    }
  }

  animateSeesaw();
}

/* ===== 重量比に応じたアニメーション ===== */
function animateSeesaw() {
  stopSeesawAnimations();

  const leftWeight = seesawItems.left.reduce(
    (sum, product) => sum + product.weightGrams, 0
  );

  const rightWeight = seesawItems.right.reduce(
    (sum, product) => sum + product.weightGrams, 0
  );

  if (leftWeight <= 0 || rightWeight <= 0 || leftWeight === rightWeight) {
    return;
  }

  const ratio =
    Math.max(leftWeight, rightWeight) /
    Math.min(leftWeight, rightWeight);

  const lighterSide = leftWeight < rightWeight ? "left" : "right";
  const lighterContainer = lighterSide === "left" ? leftItems : rightItems;

  if (!lighterContainer) return;

  const visibleItems = [
    ...lighterContainer.querySelectorAll(".seesaw-item")
  ].filter(item => item.style.visibility !== "hidden");

  if (visibleItems.length === 0) return;

  let className = "";
  let duration = 0;

  if (ratio >= 10) {
    className = "flight";
    duration = 2400;
  } else if (ratio >= 5) {
    className = "launch";
    duration = 1400;
  } else if (ratio >= 2) {
    className = "bounce";
    duration = 800;
  } else {
    return;
  }

  const runId = animationRunId;

  if (className === "flight") {
    visibleItems.forEach(item => {
      const index = [...lighterContainer.children].indexOf(item);
      const product = seesawItems[lighterSide][index];

      if (product) product.hiddenVisual = true;
      item.style.visibility = "hidden";

      const rect = item.getBoundingClientRect();
      const ghost = item.cloneNode(true);

      ghost.classList.remove("bounce", "launch", "flight");

      Object.assign(ghost.style, {
        position: "fixed",
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${Math.max(rect.width, 28)}px`,
        height: `${Math.max(rect.height, 36)}px`,
        margin: "0",
        zIndex: "999999",
        pointerEvents: "none",
        visibility: "visible",
        transform: "none",
        animation: "none"
      });

      document.body.appendChild(ghost);
      flyingGhosts.push(ghost);

      const animation = ghost.animate(
        [
          { transform: "translate(0, 0) rotate(0deg) scale(1)", opacity: 1 },
          { transform: "translate(-40px, -100px) rotate(-25deg) scale(1.2)", opacity: 1 },
          { transform: "translate(80px, -120vh) rotate(720deg) scale(0.5)", opacity: 0 }
        ],
        {
          duration: 2400,
          easing: "ease-in-out",
          fill: "forwards"
        }
      );

      animation.onfinish = () => {
        ghost.remove();
        flyingGhosts = flyingGhosts.filter(entry => entry !== ghost);
      };
    });

    if (seesawMessage) {
      seesawMessage.textContent +=
        "　軽い側が吹っ飛んだ！ ※見えないけど、残るのは仕様です";
    }

    return;
  }

  visibleItems.forEach(item => item.classList.add(className));

  animationTimer = setTimeout(() => {
    if (runId !== animationRunId) return;

    visibleItems.forEach(item => {
      item.classList.remove("bounce", "launch", "flight");
    });

    animationTimer = null;
  }, duration);
}

/* ===== ボタンの動作 ===== */
const addLeftButton = document.getElementById("add-left-product");
const addRightButton = document.getElementById("add-right-product");
const resetButton = document.getElementById("reset-seesaw");
const customLeftButton = document.getElementById("add-custom-left");
const customRightButton = document.getElementById("add-custom-right");

if (addLeftButton) {
  addLeftButton.addEventListener("click", () => addProductToSide("left"));
}

if (addRightButton) {
  addRightButton.addEventListener("click", () => addProductToSide("right"));
}

if (customLeftButton) {
  customLeftButton.addEventListener("click", () => addCustomWeight("left"));
}

if (customRightButton) {
  customRightButton.addEventListener("click", () => addCustomWeight("right"));
}

if (resetButton) {
  resetButton.addEventListener("click", () => {
    stopSeesawAnimations();

    seesawItems.left = [];
    seesawItems.right = [];

    renderSeesawSide("left");
    renderSeesawSide("right");

    if (seesawMessage) {
      seesawMessage.textContent = "リセット完了！ 次の実験をどうぞ。";
    }
  });
}

/* ===== 製品データを読み込む ===== */
async function loadProducts() {
  try {
    const response = await fetch(SHEET_URL);

    if (!response.ok) {
      throw new Error(`CSV読み込み失敗: ${response.status}`);
    }

    const text = await response.text();
    const rows = parseCSV(text);

    if (rows.length < 2) {
      throw new Error("CSVに製品データがありません。");
    }

    const headers = rows[0].map(value =>
      value.replace(/^\uFEFF/, "").trim()
    );

    const column = name => headers.indexOf(name);

    const nameCol = column("製品名");
    const numberCol = column("公式製品番号");
    const weightCol = column("重量(g)");
    const sourceCol = column("公式ソース");
    const imageCol = column("画像ファイル名");
    const seriesCol = column("分類");

    if (nameCol === -1 || weightCol === -1 || seriesCol === -1) {
      throw new Error("CSVの見出しを確認してください。");
    }

    products = rows.slice(1)
      .map(row => {
        const get = index => index === -1 ? "" : (row[index] || "");
        const rawWeight = get(weightCol).replace(/,/g, "");
        const grams = Number(rawWeight);

        const validWeight =
          rawWeight !== "" &&
          Number.isFinite(grams) &&
          grams > 0;

        return {
          name: get(nameCol),
          number: get(numberCol),
          weightGrams: validWeight ? grams : null,
          weight: validWeight
            ? (grams / 1000).toLocaleString("en-US", {
                maximumFractionDigits: 3
              })
            : "",
          source: get(sourceCol)
            ? `公式ソース：${get(sourceCol)}`
            : "",
          image: get(imageCol),
          status: validWeight ? "重量登録済み" : "重量未確認",
          series: get(seriesCol),
          description: get(numberCol)
            ? `公式製品番号：${get(numberCol)}`
            : "公式製品番号：未登録"
        };
      })
      .filter(product =>
        product.name &&
        product.name !== "製品名" &&
        product.series &&
        product.series !== "分類"
      );

    // 分類ボタンを作る
    if (filters) {
      const seriesNames = [
        ...new Set(products.map(product => product.series))
      ];

      filters.replaceChildren();

      const allButton = document.createElement("button");
      allButton.type = "button";
      allButton.className = "filter-button active";
      allButton.dataset.series = "すべて";
      allButton.textContent = "すべて";
      filters.appendChild(allButton);

      seriesNames.forEach(series => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "filter-button";
        button.dataset.series = series;
        button.textContent = series;
        filters.appendChild(button);
      });
    }

    renderProducts();
    renderNearestDietProduct();
    populateSeesawSelects();

    renderSeesawSide("left");
    renderSeesawSide("right");

    console.log("製品データ読み込み完了:", products.length);

  } catch (error) {
    console.error("製品データ読み込みエラー:", error);

    if (grid) {
      grid.textContent =
        "製品データを読み込めませんでした。コンソールを確認してください。";
    }

    if (count) count.textContent = "ERROR";

    if (seesawMessage) {
      seesawMessage.textContent = "製品データの読み込みに失敗しました。";
    }
  }
}

/* ===== 起動 ===== */

/* ===== 自由重量の画像を読み込む ===== */
function readCustomImage() {
  return new Promise((resolve, reject) => {
    const input = document.getElementById("custom-image");
    const file = input?.files?.[0];

    // 画像が選ばれていなければ、画像なし
    if (!file) {
      resolve("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      reject(new Error("画像ファイルを選んでね！"));
      return;
    }

    // 大きすぎる画像を防ぐ
    if (file.size > 3 * 1024 * 1024) {
      reject(new Error("画像は3MB以下にしてね！"));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(
      new Error("画像を読み込めませんでした")
    );

    reader.readAsDataURL(file);
  });
}

loadProducts();


/* 下部メニューの移動 */
const bottomNavButtons = document.querySelectorAll(".bottom-nav button");

const tabTargets = [
  document.body,
  document.getElementById("product-grid"),
  document.getElementById("diet-record"),
  document.querySelector(".login-section")
];

bottomNavButtons.forEach((button, index) => {
  button.addEventListener("click", () => {
    const target = tabTargets[index];

    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

    bottomNavButtons.forEach(item => {
      item.classList.remove("selected");
    });

    button.classList.add("selected");
  });
});

/* ===== 入力した重さに近い製品を探す ===== */
document.querySelectorAll("#weight-search-form").forEach(form => {
  form.addEventListener("submit", event => {
    event.preventDefault();

    const section = form.closest(".weight-search");
    const input = form.querySelector("#weight-input");
    const unit = form.querySelector("#weight-unit");
    const results = section?.querySelector("#weight-results");

    if (!input || !unit || !results) return;

    const value = Number(input.value);

    if (!Number.isFinite(value) || value <= 0) {
      results.textContent = "正しい重さを入力してね！";
      return;
    }

    // kgをgに換算
    const targetGrams = unit.value === "kg"
      ? value * 1000
      : value;

    // 重量が登録されている製品だけを対象にする
    const candidates = products
      .filter(product =>
        Number.isFinite(product.weightGrams) &&
        product.weightGrams > 0
      )
      .sort((a, b) =>
        Math.abs(a.weightGrams - targetGrams) -
        Math.abs(b.weightGrams - targetGrams)
      );

    results.replaceChildren();

    if (candidates.length === 0) {
      results.textContent = "比較できる製品がありません。";
      return;
    }

    const heading = document.createElement("h3");
    heading.textContent = "近い重さの製品はこちら！";
    results.appendChild(heading);

    candidates.slice(0, 5).forEach(product => {
      const item = document.createElement("p");
      item.textContent =
        `${product.name}：${product.weightGrams.toLocaleString("ja-JP")} g`;
      results.appendChild(item);
    });
  });
});
/* 電協ダイエット部：合計を読み込む */
const dietTotalUrl =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRnsyqvgzutY7Ny98J9F00bZvylpZx2e-n3kvhcz5uqa64uD0A3TtzI4jJsKMliDRKAxCKoA1Nan4nI/pub?gid=2147026508&single=true&output=csv";

async function loadDietTotal() {
  const display = document.getElementById("diet-total");
  if (!display) return;

  try {
    const response = await fetch(dietTotalUrl);
    if (!response.ok) throw new Error("読み込みに失敗");

    const csv = await response.text();
    const rows = csv.trim().split(/\r?\n/);
    const cells = rows[1]?.split(",");
    const total = Number(cells?.[0]);

    if (!Number.isFinite(total)) {
      throw new Error("合計値を確認できません");
    }

    display.textContent = `${total.toLocaleString("ja-JP")} kg`;
    dietTotalKg = total;
renderNearestDietProduct();
  } catch (error) {
    console.error("減量合計の読み込みエラー:", error);
    display.textContent = "合計を読み込めませんでした";
  }
}

loadDietTotal();


/* 減量合計に一番近い明和電機製品を表示 */
let dietTotalKg = null;

function renderNearestDietProduct() {
  const display = document.getElementById("diet-nearest-product");

  if (!display || dietTotalKg === null || products.length === 0) {
    return;
  }

  const totalGrams = dietTotalKg * 1000;

  const candidates = products.filter(product =>
    Number.isFinite(product.weightGrams) &&
    product.weightGrams > 0
  );

  if (candidates.length === 0) {
    display.textContent = "比較できる製品がありません。";
    return;
  }

  candidates.sort((a, b) =>
    Math.abs(a.weightGrams - totalGrams) -
    Math.abs(b.weightGrams - totalGrams)
  );

  const nearest = candidates[0];

  display.replaceChildren();

  const heading = document.createElement("h3");
  heading.textContent = "🎉 今の合計に一番近い製品";

  const name = document.createElement("p");
  name.textContent = nearest.name;

  const weight = document.createElement("p");
  weight.textContent =
    `製品の重さ：${nearest.weightGrams.toLocaleString("ja-JP")} g`;

  const difference = document.createElement("p");
  difference.textContent =
    `合計との差：約${Math.abs(nearest.weightGrams - totalGrams).toLocaleString("ja-JP", {
      maximumFractionDigits: 1
    })} g`;

  display.append(heading, name, weight, difference);
}

/* ===== 測定結果共有カード ===== */
const shareGenerateButton = document.getElementById("generate-share-card");
const shareDownloadButton = document.getElementById("download-share-card");
const shareXButton = document.getElementById("share-to-x");
const shareCanvas = document.getElementById("share-card-canvas");
const sharePreview = document.getElementById("share-card-preview");
const shareStatus = document.getElementById("share-status");

let shareCardDataUrl = "";

function createShareCard() {
  if (!shareCanvas || !sharePreview) return;

  const ctx = shareCanvas.getContext("2d");
  if (!ctx) return;

  const width = shareCanvas.width;
  const height = shareCanvas.height;
  const left = seesawItems.left;
  const right = seesawItems.right;

  const leftWeight = left.reduce(
    (sum, item) => sum + item.weightGrams, 0
  );
  const rightWeight = right.reduce(
    (sum, item) => sum + item.weightGrams, 0
  );
  const difference = leftWeight - rightWeight;

  ctx.fillStyle = "#f1eee5";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#252a30";
  ctx.fillRect(0, 0, width, 18);

  ctx.fillStyle = "#252a30";
  ctx.font = "bold 38px sans-serif";
  ctx.fillText("電協重量測定研究所", 60, 85);

  ctx.fillStyle = "#68665f";
  ctx.font = "20px sans-serif";
  ctx.fillText("MEASUREMENT REPORT", 60, 125);

  ctx.strokeStyle = "#b7b2a6";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, 155);
  ctx.lineTo(width - 60, 155);
  ctx.stroke();

  function drawSide(items, total, label, x) {
    ctx.fillStyle = "#68665f";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(label, x, 205);

    ctx.fillStyle = "#252a30";
    ctx.font = "bold 42px sans-serif";
    ctx.fillText(`${total.toLocaleString("ja-JP")} g`, x, 265);

    ctx.font = "20px sans-serif";
    const maxItems = 5;

    items.slice(0, maxItems).forEach((item, index) => {
      const text = `${item.name}: ${item.weightGrams.toLocaleString("ja-JP")} g`;
      ctx.fillText(text.slice(0, 32), x, 315 + index * 36);
    });

    if (items.length > maxItems) {
      ctx.fillText(`ほか ${items.length - maxItems} 点`, x, 315 + maxItems * 36);
    }

    if (items.length === 0) {
      ctx.fillStyle = "#888888";
      ctx.fillText("製品なし", x, 315);
    }
  }

  drawSide(left, leftWeight, "LEFT", 60);
  drawSide(right, rightWeight, "RIGHT", 630);

  ctx.strokeStyle = "#b7b2a6";
  ctx.beginPath();
  ctx.moveTo(600, 185);
  ctx.lineTo(600, 515);
  ctx.stroke();

  ctx.fillStyle = "#252a30";
  ctx.font = "bold 26px sans-serif";
  const result = difference === 0
    ? "左右ぴったり同じ重量！"
    : `${difference > 0 ? "左側" : "右側"}が ${Math.abs(difference).toLocaleString("ja-JP")} g 重い！`;

  ctx.fillText(result.slice(0, 38), 60, 555);

  ctx.fillStyle = "#68665f";
  ctx.font = "18px sans-serif";
  ctx.fillText("DENKYO WEIGHT LAB", 60, 605);

  shareCardDataUrl = shareCanvas.toDataURL("image/png");

  let previewImage = sharePreview.querySelector("img");
  if (!previewImage) {
    previewImage = document.createElement("img");
    previewImage.alt = "シーソー実験の測定結果カード";
    sharePreview.appendChild(previewImage);
  }
  previewImage.src = shareCardDataUrl;

  if (shareDownloadButton) shareDownloadButton.disabled = false;
  if (shareXButton) shareXButton.disabled = false;

  if (shareStatus) {
    shareStatus.textContent = "カードを作成しました！画像を保存してXで共有できます。";
  }
}

if (shareGenerateButton) {
  shareGenerateButton.addEventListener("click", createShareCard);
}

if (shareDownloadButton) {
  shareDownloadButton.addEventListener("click", () => {
    if (!shareCardDataUrl) return;

    const link = document.createElement("a");
    link.href = shareCardDataUrl;
    link.download = "denkyo-measurement-result.png";
    link.click();
  });
}

if (shareXButton) {
  shareXButton.addEventListener("click", () => {
    if (!shareCardDataUrl) return;

    const leftWeight = seesawItems.left.reduce(
      (sum, item) => sum + item.weightGrams, 0
    );
    const rightWeight = seesawItems.right.reduce(
      (sum, item) => sum + item.weightGrams, 0
    );

    const formatItems = items => items.length
      ? items.map(item => `${item.name} ${item.weightGrams.toLocaleString("ja-JP")}g`).join("、")
      : "なし";

    const postText = [
      "【電協重量測定研究所・シーソー実験結果】",
      `左側：${formatItems(seesawItems.left)}`,
      `左側合計：${leftWeight.toLocaleString("ja-JP")} g`,
      `右側：${formatItems(seesawItems.right)}`,
      `右側合計：${rightWeight.toLocaleString("ja-JP")} g`,
      "",
      "#電協重量測定研究所",
      "https://plumless-comet.github.io/denkyo-weight-lab/"
    ].join("\n");

    const intentUrl = "https://twitter.com/intent/tweet?text="
      + encodeURIComponent(postText);

    window.open(intentUrl, "_blank", "noopener,noreferrer");

    if (shareStatus) {
      shareStatus.textContent =
        "Xの投稿画面を開きました。保存したPNG画像を投稿に添付してね！";
    }
  });
}
