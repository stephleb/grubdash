const path = require("path");

const orders = require(path.resolve("src/data/orders-data"));

const nextId = require("../utils/nextId");

function bodyHasDeliverToProperty(req, res, next) {
  const { data = {} } = req.body;

  if (!data.deliverTo) {
    next({
      status: 400,
      message: "Order must include a deliverTo property.",
    });
  }
  
  res.locals.reqBody = data;
  return next();
}

function bodyHasMobileNumProperty(req, res, next) {
  const reqBody = res.locals.reqBody;

  if (!reqBody.mobileNumber) {
    next({
      status: 400,
      message: "Order must include a mobileNumber property.",
    });
  }

  return next();
}

function bodyHasDishesProperty(req, res, next) {
  const reqBody = res.locals.reqBody;

  if (!reqBody.dishes || !reqBody.dishes.length || !Array.isArray(reqBody.dishes)) {
    next({
      status: 400,
      message: "Order must include at least one dish.",
    });
  }

  return next();
}

function bodyHasDishQuantityProperty(req, res, next) {
  const dishes = res.locals.reqBody.dishes;

  const indexesOfDishesWithoutQuantityProperty = dishes.reduce(
    (acc, dish, index) => {
      if (
        !dish.quantity ||
        !dish.quantity > 0 ||
        typeof dish.quantity !== "number"
      ) {
        acc.push(index);
        return acc;
      }
      return acc;
    },
    []
  );

  if (!indexesOfDishesWithoutQuantityProperty.length) {
    return next();
  }

  if (indexesOfDishesWithoutQuantityProperty.length > 1) {
    const stringOfDishIndex = indexesOfDishesWithoutQuantityProperty.join(", ");

    next({
      status: 400,
      message: `Dishes ${stringOfDishIndex} must have a quantity that is an integer greater than 0.`,
    });
  }

  next({
    status: 400,
    message: `Dish ${indexesOfDishesWithoutQuantityProperty} must have a quantity that is an integer greater than 0.`,
  });
}

// Validation Function for Read, Update, and Delete functions:
function orderExists(req, res, next) {
  const { orderId } = req.params;
  const foundOrder = orders.find((order) => order.id === orderId);

  if (foundOrder) {
    res.locals.order = foundOrder;
    res.locals.orderId = orderId;
    return next();
  }

  next({
    status: 404,
    message: `No matching order is found for orderId ${orderId}.`,
  });
}

function bodyIdMatchesRouteId(req, res, next) {
  const orderId = res.locals.orderId;
  const reqBody = res.locals.reqBody;

  if (reqBody.id) {
    if (reqBody.id === orderId) {
      return next();
    }
    next({
      status: 400,
      message: `Order id does not match route id. Order: ${reqBody.id}, Route: ${orderId}`,
    });
  }

  return next();
}

function bodyHasStatusProperty(req, res, next) {
  const reqBody = res.locals.reqBody;

  if (!reqBody.status || reqBody.status === "invalid") {
    next({
      status: 400,
      message:
        "Order must have a status of pending, preparing, out-for-delivery, or delivered.",
    });
  }

  if (reqBody.status === "delivered") {
    next({
      status: 400,
      message: "A delivered order cannot be changed.",
    });
  }

  return next();
}

function orderStatusIsPending(req, res, next) {
  const order = res.locals.order;

  if (order.status !== "pending") {
    next({
      status: 400,
      message: "An order cannot be deleted unless it is pending.",
    });
  }

  return next();
}

function destroy(req, res) {
  const orderId = res.locals.orderId;
  const orderIndex = orders.findIndex((order) => order.id === orderId);
  orders.splice(orderIndex, 1);
  res.sendStatus(204);
}

function update(req, res) {
  const reqBody = res.locals.reqBody;
  const order = res.locals.order;

  const existingOrderProperties = Object.getOwnPropertyNames(order);

  for (let i = 0; i < existingOrderProperties.length; i++) {
    let propName = existingOrderProperties[i];
    if (propName !== "id" && order[propName] !== reqBody[propName]) {
      order[propName] = reqBody[propName];
    }
  }
  res.json({ data: order });
}

function read(req, res) {
  res.json({ data: res.locals.order });
}

function create(req, res) {
  const reqBody = res.locals.reqBody;
  const newOrder = {
    ...reqBody,
    id: nextId(),
  };
  orders.push(newOrder);
  res.status(201).json({ data: newOrder });
}

function list(req, res) {
  res.json({ data: orders });
}

module.exports = {
  create: [
    bodyHasDeliverToProperty,
    bodyHasMobileNumProperty,
    bodyHasDishesProperty,
    bodyHasDishQuantityProperty,
    create,
  ],
  read: [orderExists, read],
  update: [
    orderExists,
    bodyHasDeliverToProperty,
    bodyHasMobileNumProperty,
    bodyHasDishesProperty,
    bodyHasDishQuantityProperty,
    bodyIdMatchesRouteId,
    bodyHasStatusProperty,
    update,
  ],
  delete: [orderExists, orderStatusIsPending, destroy],
  list,
};