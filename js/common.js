/* exported CATEGORIES, apiUrl, loadDishes, getStoredOrder, saveStoredOrder, clearStoredOrder,
   getComboMessage, showNotification, formatPrice, createDishCard */
"use strict";

// Адрес API для Netlify / GitHub Pages
const API_BASE = "https://edu.std-900.ist.mospolytech.ru";
// Персональный ключ из СДО Московского Политеха
const API_KEY = "ВСТАВЬТЕ_СВОЙ_API_KEY";

const STORAGE_KEY = "foodConstructOrder";

// Категории блюд в порядке отображения
const CATEGORIES = ["soup", "main-course", "salad", "drink", "dessert"];

// Приведение названий категорий из API к значениям data-category на странице
const CATEGORY_ALIASES = {
    "soup": "soup",
    "soups": "soup",
    "main-course": "main-course",
    "main_course": "main-course",
    "main": "main-course",
    "salad": "salad",
    "salads": "salad",
    "drink": "drink",
    "drinks": "drink",
    "beverages": "drink",
    "dessert": "dessert",
    "desserts": "dessert"
};

// Доступные комбо (наборы обязательных категорий). Десерт можно добавить к любому
const COMBOS = [
    ["soup", "main-course", "salad", "drink"],
    ["soup", "main-course", "drink"],
    ["soup", "salad", "drink"],
    ["main-course", "salad", "drink"],
    ["main-course", "drink"]
];

function apiUrl(path) {
    const url = new URL(path, API_BASE);
    url.searchParams.set("api_key", API_KEY);
    return url.toString();
}

function formatPrice(value) {
    return `${value}₽`;
}

async function loadDishes() {
    const response = await fetch(new URL("/labs/api/dishes", API_BASE));
    if (!response.ok) {
        throw new Error(`Сервер ответил с кодом ${response.status}`);
    }
    const data = await response.json();
    return data.map((dish) => ({
        ...dish,
        category: CATEGORY_ALIASES[dish.category] || dish.category
    }));
}

// В localStorage хранится объект вида {"soup": 3, "drink": 21} — только id блюд
function getStoredOrder() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return data && typeof data === "object" ? data : {};
    } catch {
        return {};
    }
}

function saveStoredOrder(order) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
}

function clearStoredOrder() {
    localStorage.removeItem(STORAGE_KEY);
}

// Возвращает текст уведомления, если состав заказа не подходит ни под одно комбо
function getComboMessage(categories) {
    const has = (category) => categories.includes(category);
    const chosen = ["soup", "main-course", "salad", "drink"].filter(has);

    if (categories.length === 0) {
        return "Ничего не выбрано. Выберите блюда для заказа";
    }

    const isCombo = COMBOS.some((combo) => {
        return combo.length === chosen.length && combo.every((category) => chosen.includes(category));
    });
    if (isCombo) {
        return null;
    }

    if (has("soup") && !has("main-course") && !has("salad")) {
        return "Выберите главное блюдо/салат/стартер";
    }
    if (has("salad") && !has("soup") && !has("main-course")) {
        return "Выберите суп или главное блюдо";
    }
    if (!has("soup") && !has("main-course") && !has("salad")) {
        return "Выберите главное блюдо";
    }
    return "Выберите напиток";
}

function showNotification(message) {
    document.querySelectorAll(".notification").forEach((item) => item.remove());

    const overlay = document.createElement("div");
    overlay.className = "notification";
    overlay.setAttribute("role", "alertdialog");

    const text = document.createElement("p");
    text.className = "notification__text";
    text.textContent = message;

    const button = document.createElement("button");
    button.className = "notification__button";
    button.type = "button";
    button.textContent = "Окей 👌";
    button.addEventListener("click", () => overlay.remove());

    overlay.append(text, button);
    // Если открыто модальное окно, уведомление должно быть поверх него
    (document.querySelector("dialog[open]") || document.body).append(overlay);
    button.focus();
}

function createDishCard(dish, buttonText) {
    const card = document.createElement("div");
    card.className = "dish";
    card.dataset.dish = dish.keyword;
    card.dataset.kind = dish.kind;

    const image = document.createElement("img");
    image.className = "dish__image";
    image.src = dish.image;
    image.alt = dish.name;

    const price = document.createElement("p");
    price.className = "dish__price";
    price.textContent = formatPrice(dish.price);

    const name = document.createElement("p");
    name.className = "dish__name";
    name.textContent = dish.name;

    const count = document.createElement("p");
    count.className = "dish__count";
    count.textContent = dish.count;

    const button = document.createElement("button");
    button.className = "dish__button";
    button.type = "button";
    button.textContent = buttonText;

    card.append(image, price, name, count, button);
    return card;
}
