/* global CATEGORIES, apiUrl, loadDishes, getStoredOrder, saveStoredOrder, clearStoredOrder,
   getComboMessage, showNotification, formatPrice, createDishCard */
"use strict";

// Текст в форме, если блюдо категории не выбрано
const EMPTY_TEXT = {
    "soup": "Не выбран",
    "main-course": "Не выбрано",
    "salad": "Не выбран",
    "drink": "Не выбран",
    "dessert": "Не выбран"
};

// Названия полей с id блюд для API
const API_FIELDS = {
    "soup": "soup_id",
    "main-course": "main_course_id",
    "salad": "salad_id",
    "drink": "drink_id",
    "dessert": "dessert_id"
};

let dishes = [];

// Блюда текущего заказа: категория -> объект блюда
function getOrderDishes() {
    const stored = getStoredOrder();
    const result = {};

    CATEGORIES.forEach((category) => {
        const dish = dishes.find((item) => item.id === stored[category]);
        if (dish) {
            result[category] = dish;
        }
    });
    return result;
}

function renderOrderCards() {
    const container = document.querySelector(".order-dishes .dishes");
    const emptyMessage = document.querySelector(".order-dishes__empty");
    const orderDishes = getOrderDishes();

    container.replaceChildren();
    CATEGORIES.forEach((category) => {
        const dish = orderDishes[category];
        if (dish) {
            const card = createDishCard(dish, "Удалить");
            card.dataset.category = category;
            container.append(card);
        }
    });

    emptyMessage.hidden = container.children.length > 0;
}

function updateOrderSummary() {
    const orderDishes = getOrderDishes();
    let total = 0;

    CATEGORIES.forEach((category) => {
        const value = document.querySelector(
            `.order-summary__item[data-category="${category}"] .order-summary__value`
        );
        const dish = orderDishes[category];

        if (dish) {
            value.textContent = `${dish.name} ${formatPrice(dish.price)}`;
            total += dish.price;
        } else {
            value.textContent = EMPTY_TEXT[category];
        }
    });

    document.querySelector(".order-summary__value_total").textContent = formatPrice(total);
}

function removeDish(card) {
    const order = getStoredOrder();
    delete order[card.dataset.category];
    saveStoredOrder(order);

    renderOrderCards();
    updateOrderSummary();
}

function toggleDeliveryTime() {
    const byTime = document.querySelector("#delivery-by-time").checked;
    document.querySelector("#delivery-time").required = byTime;
}

function buildOrderData(form) {
    const formData = new FormData(form);
    const deliveryType = formData.get("delivery_type");
    const data = {
        full_name: formData.get("full_name").trim(),
        email: formData.get("email").trim(),
        subscribe: formData.get("subscribe") ? 1 : 0,
        phone: formData.get("phone").trim(),
        delivery_address: formData.get("delivery_address").trim(),
        delivery_type: deliveryType,
        comment: formData.get("comment").trim()
    };

    if (deliveryType === "by_time") {
        data.delivery_time = formData.get("delivery_time");
    }

    Object.entries(getOrderDishes()).forEach(([category, dish]) => {
        data[API_FIELDS[category]] = dish.id;
    });
    return data;
}

async function submitOrder(event) {
    event.preventDefault();
    const form = event.target.closest("form");

    const message = getComboMessage(Object.keys(getOrderDishes()));
    if (message) {
        showNotification(message);
        return;
    }
    if (!form.reportValidity()) {
        return;
    }

    const submitButton = form.querySelector("[type='submit']");
    submitButton.disabled = true;

    try {
        const response = await fetch(apiUrl("/labs/api/orders"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(buildOrderData(form))
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.error) {
            throw new Error(result.error || `Сервер ответил с кодом ${response.status}`);
        }

        clearStoredOrder();
        form.reset();
        toggleDeliveryTime();
        renderOrderCards();
        updateOrderSummary();
        showNotification("Заказ успешно оформлен! Мы скоро свяжемся с вами.");
    } catch (error) {
        showNotification(`Не удалось оформить заказ: ${error.message}`);
    } finally {
        submitButton.disabled = false;
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const form = document.querySelector(".order-form");

    try {
        dishes = await loadDishes();
    } catch (error) {
        showNotification(`Не удалось загрузить данные о блюдах: ${error.message}`);
    }
    renderOrderCards();
    updateOrderSummary();

    document.querySelector(".order-dishes").addEventListener("click", (event) => {
        if (event.target.closest(".dish__button")) {
            removeDish(event.target.closest(".dish"));
        }
    });

    form.querySelectorAll("[name='delivery_type']").forEach((radio) => {
        radio.addEventListener("change", toggleDeliveryTime);
    });
    form.addEventListener("reset", () => setTimeout(toggleDeliveryTime));
    form.querySelector("[type='submit']").addEventListener("click", submitOrder);
    form.addEventListener("submit", submitOrder);
});
