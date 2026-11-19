const SITE_HEADER = document.querySelector(".site-header");
const BACK_TO_TOP_BUTTON = document.querySelector(".back-to-top");
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");

function UpdateBackToTopVisibility([headerEntry]) {
  BACK_TO_TOP_BUTTON.hidden = headerEntry.isIntersecting;
}

function ScrollToTop() {
  SITE_HEADER.focus({ preventScroll: true });
  window.scrollTo({
    top: 0,
    behavior: REDUCED_MOTION.matches ? "instant" : "smooth",
  });
}

const HEADER_OBSERVER = new IntersectionObserver(UpdateBackToTopVisibility);
HEADER_OBSERVER.observe(SITE_HEADER);
BACK_TO_TOP_BUTTON.addEventListener("click", ScrollToTop);

const DRINKS = [
  { id: "jasmine", name: "茉香綠茶", unitPrice: 35, description: "清香回甘" },
  { id: "spring", name: "四季春青茶", unitPrice: 40, description: "清爽花香" },
  { id: "black", name: "蜜香紅茶", unitPrice: 45, description: "溫潤蜜香" },
  { id: "lemon", name: "冬瓜檸檬", unitPrice: 55, description: "酸甜解渴" },
  { id: "pearl", name: "珍珠鮮奶茶", unitPrice: 65, description: "濃醇奶香" },
  { id: "hojicha", name: "焙茶鮮奶", unitPrice: 75, description: "醇厚焙香" },
];

const DISCOUNT_THRESHOLD = 200;
const DISCOUNT_AMOUNT = 20;
const CART_STORAGE_KEY = "island-tea-cart";
const CART = new Map();
const DRINK_GRID = document.querySelector(".drink-grid");
const DRINK_TEMPLATE = document.querySelector("#drink-template");
const CART_LIST = document.querySelector("#cart-list");
const CART_ITEM_TEMPLATE = document.querySelector("#cart-item-template");
const CART_HEADING = document.querySelector("#cart-heading");
const EMPTY_CART = document.querySelector(".empty-cart");
const TOTAL_QTY = document.querySelector("#cart-total-qty");
const TOTAL_PRICE = document.querySelector("#cart-total-price");
const CART_DISCOUNT = document.querySelector("#cart-discount");
const FINAL_PRICE = document.querySelector("#cart-final-price");
const CHECKOUT_BUTTON = document.querySelector(".checkout-button");
const MOBILE_CART_BUTTON = document.querySelector(".mobile-cart-button");
const CART_KIND_COUNT = document.querySelector("#cart-kind-count");
const CLEAR_BUTTON = document.querySelector(".clear-cart-button");

const CART_DIALOG = document.querySelector(".cart-dialog");
const POP_UP_TITLE = document.querySelector(".pop-up__title");
const ORDER_DETAILS = document.querySelector(".pop-up__text");
const CONFIRM_BUTTON = document.querySelector(".confirm-btn");
const CANCEL_BUTTON = document.querySelector(".cancel-btn");

function FormatPrice(amount) {
  return `NT$ ${amount}`;
}

function RenderMenu() {
  for (const drink of DRINKS) {
    const card = DRINK_TEMPLATE.content.firstElementChild.cloneNode(true);
    const addButton = card.querySelector("button");

    card.classList.add(`drink-${drink.id}`);
    card.querySelector("h3").textContent = drink.name;
    card.querySelector("p").textContent = drink.description;
    card.querySelector("strong").textContent = FormatPrice(drink.unitPrice);
    addButton.setAttribute("aria-label", `加入${drink.name}`);
    addButton.addEventListener("click", () => ChangeQuantity(drink, 1));
    DRINK_GRID.append(card);
  }
}

function CreateCartItem(drink) {
  const row = CART_ITEM_TEMPLATE.content.firstElementChild.cloneNode(true);
  const decreaseButton = row.querySelector(".decrease-quantity");
  const increaseButton = row.querySelector(".increase-quantity");

  row.querySelector("h3").textContent = drink.name;
  row.querySelector(".item-price").textContent = `單價 ${FormatPrice(drink.unitPrice)}`;
  row.querySelector(".quantity-controls").setAttribute("aria-label", `${drink.name}數量`);
  decreaseButton.setAttribute("aria-label", `減少一杯${drink.name}`);
  increaseButton.setAttribute("aria-label", `增加一杯${drink.name}`);
  decreaseButton.addEventListener("click", () => ChangeQuantity(drink, -1));
  increaseButton.addEventListener("click", () => ChangeQuantity(drink, 1));

  CART_LIST.append(row);
  return { ...drink, qty: 0, subTotal: 0, row };
}

function UpdateCartItem(item, qty) {
  item.qty = qty;
  item.subTotal = item.unitPrice * qty;
  item.row.querySelector(".item-quantity").textContent = `${qty} 杯`;
  item.row.querySelector(".item-subtotal").textContent = `小計 ${FormatPrice(item.subTotal)}`;
}

function ChangeQuantity(drink, change) {
  let item = CART.get(drink.id);
  if (!item) {
    if (change < 0) return;
    item = CreateCartItem(drink);
    CART.set(drink.id, item);
  }

  const qty = item.qty + change;
  if (qty === 0) {
    if (item.row.contains(document.activeElement)) {
      const nearbyRow = item.row.nextElementSibling || item.row.previousElementSibling;
      const focusTarget = nearbyRow?.querySelector(".decrease-quantity") || CART_HEADING;
      focusTarget.focus({ preventScroll: true });
    }
    item.row.remove();
    CART.delete(drink.id);
  } else {
    UpdateCartItem(item, qty);
  }

  UpdateCartSummary();
  SaveCart();
}

function GetCartTotals() {
  let totalQty = 0;
  let totalPrice = 0;

  for (const item of CART.values()) {
    totalQty += item.qty;
    totalPrice += item.subTotal;
  }

  const discount = totalPrice >= DISCOUNT_THRESHOLD ? DISCOUNT_AMOUNT : 0;
  return { totalQty, totalPrice, discount, finalPrice: totalPrice - discount };
}

function SaveCart() {
  const items = Array.from(CART.values(), ({ id, qty }) => ({ id, qty }));

  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // 購物車仍可在目前頁面使用。
  }
}

function RestoreCart() {
  let items;
  try {
    items = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY));
  } catch {
    return;
  }

  if (!Array.isArray(items)) return;

  for (const savedItem of items) {
    const drink = DRINKS.find(({ id }) => id === savedItem?.id);
    if (!drink || CART.has(drink.id)) continue;

    const { qty } = savedItem;
    if (!Number.isSafeInteger(qty) || qty <= 0 || !Number.isSafeInteger(qty * drink.unitPrice)) continue;

    const item = CreateCartItem(drink);
    UpdateCartItem(item, qty);
    CART.set(drink.id, item);
  }
}

function UpdateCartSummary() {
  const { totalQty, totalPrice, discount, finalPrice } = GetCartTotals();
  TOTAL_QTY.textContent = `${totalQty} 杯`;
  TOTAL_PRICE.textContent = FormatPrice(totalPrice);
  CART_DISCOUNT.textContent = discount > 0 ? `−${FormatPrice(discount)}` : FormatPrice(0);
  FINAL_PRICE.textContent = FormatPrice(finalPrice);

  const kindCount = CART.size;
  CART_KIND_COUNT.textContent = String(kindCount);
  CART_KIND_COUNT.setAttribute("aria-label", `${kindCount} 種商品`);

  const isEmpty = kindCount === 0;
  EMPTY_CART.hidden = !isEmpty;
  CART_LIST.hidden = isEmpty;
  CHECKOUT_BUTTON.disabled = isEmpty;
  CLEAR_BUTTON.disabled = isEmpty;
}

function ScrollToCart() {
  CART_HEADING.focus({ preventScroll: true });
  CART_HEADING.scrollIntoView({
    behavior: REDUCED_MOTION.matches ? "instant" : "smooth",
    block: "start",
  });
}


function OpenCartDialog(title, confirmAction = null) {
  POP_UP_TITLE.textContent = title;
  CANCEL_BUTTON.hidden = confirmAction === null;
  CART_DIALOG.returnValue = "";
  CONFIRM_BUTTON.textContent = confirmAction ? "確認" : "關閉";

  if (confirmAction) {
    ORDER_DETAILS.replaceChildren();
    ORDER_DETAILS.hidden = true;
  }

  CART_DIALOG.showModal();
  const initialFocus = confirmAction ? CANCEL_BUTTON : POP_UP_TITLE;
  initialFocus.focus();

  CART_DIALOG.addEventListener("close", () => {
    if (CART_DIALOG.returnValue === "confirm") {
      confirmAction?.();
    }
  }, { once: true });
}

function EmptyCart() {
  CART_HEADING.focus({ preventScroll: true });
  CART.clear();
  CART_LIST.replaceChildren();
  SaveCart();
  UpdateCartSummary();
}

function SubmitOrder() {
  const items = document.createElement("ul");

  for (const item of CART.values()) {
    const line = document.createElement("li");
    line.textContent = `${item.name}：${item.qty} 杯 × ${FormatPrice(item.unitPrice)}，小計 ${FormatPrice(item.subTotal)}`;
    items.append(line);
  }

  const { totalQty, totalPrice, discount, finalPrice } = GetCartTotals();
  const summary = document.createElement("p");
  summary.textContent = `總杯數：${totalQty} 杯。折扣前：${FormatPrice(totalPrice)}，折抵：${FormatPrice(discount)}，應付金額：${FormatPrice(finalPrice)}。`;
  ORDER_DETAILS.replaceChildren(items, summary);
  ORDER_DETAILS.hidden = false;

  EmptyCart();
  OpenCartDialog("已送出訂單");
}

function ConfirmClearCart() {
  if (CART.size > 0) OpenCartDialog("確定清空購物車嗎？", EmptyCart);
}

function ConfirmCheckout() {
  if (CART.size > 0) OpenCartDialog("確定送出訂單嗎？", SubmitOrder);
}

RenderMenu();
RestoreCart();
UpdateCartSummary();
CLEAR_BUTTON.addEventListener("click", ConfirmClearCart);
CHECKOUT_BUTTON.addEventListener("click", ConfirmCheckout);
MOBILE_CART_BUTTON.addEventListener("click", ScrollToCart);
CONFIRM_BUTTON.addEventListener("click", () => CART_DIALOG.close("confirm"));
CANCEL_BUTTON.addEventListener("click", () => CART_DIALOG.close("cancel"));
