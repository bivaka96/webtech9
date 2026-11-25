/* global apiUrl, loadDishes, showNotification, formatPrice */
"use strict";

// Поля заказа с id блюд и их подписи
const ORDER_DISH_FIELDS = [
    ["soup_id", "Суп"],
    ["main_course_id", "Основное блюдо"],
    ["salad_id", "Салат/стартер"],
    ["drink_id", "Напиток"],
    ["dessert_id", "Десерт"]
];

const ASAP_TEXT = "Как можно скорее (с 7:00 до 23:00)";

let dishesById = new Map();
let orders = [];
let currentOrder = null;

function parseDate(value) {
    return new Date(String(value).replace(" ", "T"));
}

function formatDate(value) {
    const date = parseDate(value);
    const pad = (number) => String(number).padStart(2, "0");
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} `
        + `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatTime(value) {
    return value ? String(value).slice(0, 5) : "";
}

function getDeliveryText(order) {
    return order.delivery_type === "by_time" && order.delivery_time
        ? formatTime(order.delivery_time)
        : ASAP_TEXT;
}

// Блюда заказа в виде [подпись, блюдо]
function getOrderDishes(order) {
    return ORDER_DISH_FIELDS
        .filter(([field]) => order[field] && dishesById.has(order[field]))
        .map(([field, label]) => [label, dishesById.get(order[field])]);
}

function getOrderTotal(order) {
    return getOrderDishes(order).reduce((sum, [, dish]) => sum + dish.price, 0);
}

async function request(path, options = {}) {
    const response = await fetch(apiUrl(path), options);
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.error) {
        throw new Error(result.error || `Сервер ответил с кодом ${response.status}`);
    }
    return result;
}

function createActionButton(action, icon, label, orderId) {
    const button = document.createElement("button");
    button.className = "orders-table__action";
    button.type = "button";
    button.dataset.action = action;
    button.dataset.id = orderId;
    button.title = label;
    button.setAttribute("aria-label", label);

    const iconElement = document.createElement("i");
    iconElement.className = `bi ${icon}`;
    button.append(iconElement);
    return button;
}

function renderOrders() {
    const body = document.querySelector(".orders-table__body");
    const status = document.querySelector(".orders__status");
    const tableWrap = document.querySelector(".orders__table-wrap");

    body.replaceChildren();
    orders.forEach((order, index) => {
        const row = document.createElement("tr");
        const cells = [
            index + 1,
            formatDate(order.created_at),
            getOrderDishes(order).map(([, dish]) => dish.name).join(", "),
            formatPrice(getOrderTotal(order)),
            getDeliveryText(order)
        ];

        cells.forEach((value, cellIndex) => {
            const cell = document.createElement("td");
            cell.className = "orders-table__cell";
            if (cellIndex === 2) {
                cell.classList.add("orders-table__cell_left");
            }
            cell.textContent = value;
            row.append(cell);
        });

        const actions = document.createElement("td");
        actions.className = "orders-table__cell orders-table__cell_actions";
        actions.append(
            createActionButton("view", "bi-eye", "Подробнее", order.id),
            createActionButton("edit", "bi-pencil", "Редактирование", order.id),
            createActionButton("delete", "bi-trash", "Удаление", order.id)
        );
        row.append(actions);
        body.append(row);
    });

    tableWrap.hidden = orders.length === 0;
    status.hidden = orders.length > 0;
    status.textContent = "Заказов пока нет. Соберите свой первый ланч на странице «Собрать ланч».";
}

async function loadOrders() {
    const data = await request("/labs/api/orders");
    orders = data.sort((a, b) => parseDate(b.created_at) - parseDate(a.created_at));
    renderOrders();
}

function createRow(label, value) {
    const row = document.createElement("div");
    row.className = "modal__row";
    const labelElement = document.createElement("span");
    labelElement.textContent = label;
    const valueElement = document.createElement("span");
    valueElement.textContent = value;
    row.append(labelElement, valueElement);
    return row;
}

function fillDishes(modal, prefix, order) {
    modal.querySelector(`[data-role="${prefix}-dishes"]`).replaceChildren(
        ...getOrderDishes(order).map(([label, dish]) => {
            return createRow(label, `${dish.name} (${formatPrice(dish.price)})`);
        })
    );
    modal.querySelector(`[data-role="${prefix}-total"]`).textContent = formatPrice(getOrderTotal(order));
}

function openViewModal(order) {
    const modal = document.querySelector("#view-modal");
    const info = modal.querySelector("[data-role='view-info']");
    const deliveryTitle = document.createElement("h4");
    deliveryTitle.className = "modal__subtitle";
    deliveryTitle.textContent = "Доставка";

    info.replaceChildren(
        createRow("Дата оформления", formatDate(order.created_at)),
        deliveryTitle,
        createRow("Имя получателя", order.full_name),
        createRow("Адрес доставки", order.delivery_address),
        createRow("Время доставки", getDeliveryText(order)),
        createRow("Телефон", order.phone),
        createRow("Email", order.email)
    );
    modal.querySelector("[data-role='view-comment']").textContent = order.comment || "Нет комментария";
    fillDishes(modal, "view", order);
    modal.showModal();
}

function toggleEditTime() {
    const form = document.querySelector("#edit-form");
    form.elements.delivery_time.required = form.elements.delivery_type.value === "by_time";
}

function openEditModal(order) {
    const modal = document.querySelector("#edit-modal");
    const form = modal.querySelector("#edit-form");

    modal.querySelector("[data-role='edit-date']").textContent = formatDate(order.created_at);
    form.elements.full_name.value = order.full_name || "";
    form.elements.delivery_address.value = order.delivery_address || "";
    form.elements.delivery_type.value = order.delivery_type || "now";
    form.elements.delivery_time.value = formatTime(order.delivery_time);
    form.elements.phone.value = order.phone || "";
    form.elements.email.value = order.email || "";
    form.elements.comment.value = order.comment || "";
    toggleEditTime();
    fillDishes(modal, "edit", order);
    modal.showModal();
}

async function saveOrder(event) {
    event.preventDefault();
    const form = event.target;
    const data = {
        full_name: form.elements.full_name.value.trim(),
        email: form.elements.email.value.trim(),
        phone: form.elements.phone.value.trim(),
        delivery_address: form.elements.delivery_address.value.trim(),
        delivery_type: form.elements.delivery_type.value,
        comment: form.elements.comment.value.trim()
    };
    if (data.delivery_type === "by_time") {
        data.delivery_time = form.elements.delivery_time.value;
    }

    try {
        await request(`/labs/api/orders/${currentOrder.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });
        document.querySelector("#edit-modal").close();
        await loadOrders();
        showNotification("Заказ успешно изменён");
    } catch (error) {
        showNotification(`Не удалось изменить заказ: ${error.message}`);
    }
}

async function deleteOrder() {
    try {
        await request(`/labs/api/orders/${currentOrder.id}`, { method: "DELETE" });
        document.querySelector("#delete-modal").close();
        await loadOrders();
        showNotification("Заказ успешно удалён");
    } catch (error) {
        showNotification(`Не удалось удалить заказ: ${error.message}`);
    }
}

function handleTableClick(event) {
    const button = event.target.closest(".orders-table__action");
    if (!button) {
        return;
    }

    currentOrder = orders.find((order) => String(order.id) === button.dataset.id);
    if (!currentOrder) {
        return;
    }

    if (button.dataset.action === "view") {
        openViewModal(currentOrder);
    } else if (button.dataset.action === "edit") {
        openEditModal(currentOrder);
    } else {
        document.querySelector("#delete-modal").showModal();
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    document.querySelector(".orders-table__body").addEventListener("click", handleTableClick);

    document.querySelectorAll(".modal").forEach((modal) => {
        modal.addEventListener("click", (event) => {
            if (event.target.closest("[data-close]")) {
                modal.close();
            }
        });
    });

    const editForm = document.querySelector("#edit-form");
    editForm.addEventListener("submit", saveOrder);
    editForm.querySelectorAll("[name='delivery_type']").forEach((radio) => {
        radio.addEventListener("change", toggleEditTime);
    });
    document.querySelector("[data-role='confirm-delete']").addEventListener("click", deleteOrder);

    try {
        const dishes = await loadDishes();
        dishesById = new Map(dishes.map((dish) => [dish.id, dish]));
        await loadOrders();
    } catch (error) {
        document.querySelector(".orders__status").textContent = `Не удалось загрузить заказы: ${error.message}`;
        showNotification(`Не удалось загрузить заказы: ${error.message}`);
    }
});
