/* global CATEGORIES, loadDishes, getStoredOrder, saveStoredOrder, getComboMessage,
   formatPrice, createDishCard, showNotification */
"use strict";

// Все блюда, загруженные с сервера
let dishes = [];

function renderDishes() {
    const sorted = [...dishes].sort((a, b) => a.name.localeCompare(b.name, "ru"));

    sorted.forEach((dish) => {
        const container = document.querySelector(
            `.menu-section[data-category="${dish.category}"] .dishes`
        );
        if (container) {
            container.append(createDishCard(dish, "Добавить"));
        }
    });
}

// Выбранные блюда из localStorage: категория -> объект блюда
function getSelectedDishes() {
    const stored = getStoredOrder();
    const selected = {};

    CATEGORIES.forEach((category) => {
        const dish = dishes.find((item) => item.id === stored[category]);
        if (dish) {
            selected[category] = dish;
        }
    });
    return selected;
}

function highlightSelected() {
    const selected = getSelectedDishes();
    document.querySelectorAll(".dish").forEach((card) => {
        const isSelected = Object.values(selected).some((dish) => dish.keyword === card.dataset.dish);
        card.classList.toggle("dish_selected", isSelected);
    });
}

function updateCheckoutPanel() {
    const selected = getSelectedDishes();
    const categories = Object.keys(selected);
    const total = Object.values(selected).reduce((sum, dish) => sum + dish.price, 0);

    const panel = document.querySelector(".checkout-panel");
    const link = panel.querySelector(".checkout-panel__link");
    const isAvailable = getComboMessage(categories) === null;

    panel.hidden = categories.length === 0;
    panel.querySelector(".checkout-panel__sum").textContent = formatPrice(total);
    link.classList.toggle("checkout-panel__link_disabled", !isAvailable);
    link.setAttribute("aria-disabled", String(!isAvailable));
}

function selectDish(keyword) {
    const dish = dishes.find((item) => item.keyword === keyword);
    if (!dish) {
        return;
    }

    const order = getStoredOrder();
    order[dish.category] = dish.id;
    saveStoredOrder(order);

    highlightSelected();
    updateCheckoutPanel();
}

function applyFilter(button) {
    const section = button.closest(".menu-section");
    const isActive = button.classList.contains("active");

    section.querySelectorAll(".filters__button").forEach((item) => {
        item.classList.remove("active");
    });
    if (!isActive) {
        button.classList.add("active");
    }

    const kind = isActive ? null : button.dataset.kind;
    section.querySelectorAll(".dish").forEach((card) => {
        card.hidden = kind !== null && card.dataset.kind !== kind;
    });
}

function showLoadError(error) {
    const message = document.createElement("p");
    message.className = "load-error";
    message.textContent = `Не удалось загрузить меню: ${error.message}. Попробуйте обновить страницу позже.`;
    document.querySelector(".main").prepend(message);
}

document.addEventListener("DOMContentLoaded", async () => {
    try {
        dishes = await loadDishes();
        renderDishes();
        highlightSelected();
        updateCheckoutPanel();
    } catch (error) {
        showLoadError(error);
    }

    document.querySelector(".main").addEventListener("click", (event) => {
        const filterButton = event.target.closest(".filters__button");
        if (filterButton) {
            applyFilter(filterButton);
            return;
        }

        const card = event.target.closest(".dish");
        if (card) {
            selectDish(card.dataset.dish);
        }
    });

    document.querySelector(".checkout-panel__link").addEventListener("click", (event) => {
        const message = getComboMessage(Object.keys(getSelectedDishes()));
        if (message) {
            event.preventDefault();
            showNotification(message);
        }
    });
});
