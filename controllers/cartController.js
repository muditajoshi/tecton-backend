const Cart = require("../models/cartModel");

exports.addCartItem = async (req, res) => {
  try {
    const { cartItems } = req.body;

    const id = req.params["id"];
    const checkCart = await Cart.find({ user: id });

    const {
      name,
      image,
      qty,
      price,
      countInStock,
      numberOfCans,
      product,
      subscription,
      frequency,
      stripeProductId,
      stripePriceId,
    } = cartItems[0];
    if (checkCart.length < 1) {
      const cartData = new Cart({ user: id, cartItems: cartItems });
      cartData.cartItems[0].itemTotalPrice =
        cartData.cartItems[0].price * cartData.cartItems[0].qty;
      let totalPrice = 0;

      cartData.cartItems.map((item) => (totalPrice += item.itemTotalPrice));
      cartData.subtotal = totalPrice;
      const data = await cartData.save();
      res
        .status(200)
        .json({ cart: data, message: "Cart created successfully" });
    } else {
      if (checkCart[0].cartItems.length >= 0) {
        const checkProduct = await Cart.find({
          user: id,
        });
        const getIndex = checkProduct[0].cartItems.findIndex(
          (productItem) => productItem.product == product
        );
        const checkFreq = checkProduct[0].cartItems.findIndex(
          (productItem) =>
            productItem.product == product && productItem.frequency == frequency
        );

        if (checkProduct.length > 0 && getIndex > -1) {
          if (checkFreq < 0) {
            const checkCart = await Cart.find({ user: id });
            const oldCartData = checkCart[0].cartItems;
            checkCart[0].cartItems = [
              ...oldCartData,
              {
                name,
                image,
                qty,
                price,
                countInStock,
                numberOfCans,
                product,
                subscription,
                frequency,
                stripeProductId,
                stripePriceId,
              },
            ];

            const cartItemsLength = checkCart[0].cartItems.length - 1;
            checkCart[0].cartItems[cartItemsLength].itemTotalPrice =
              checkCart[0].cartItems[cartItemsLength].price *
              checkCart[0].cartItems[cartItemsLength].qty;
            let totalPrice = 0;

            checkCart[0].cartItems.map(
              (item) => (totalPrice += item.itemTotalPrice)
            );
            checkCart[0].subtotal = totalPrice;
            const updatedCart = await checkCart[0].save();
            res.status(200).json({
              cart: updatedCart,
              message: "cart updated",
            });
          } else {
            checkProduct[0].cartItems[checkFreq].qty =
              checkProduct[0].cartItems[checkFreq].qty + qty;
            const saveData = await checkProduct[0].save();
            res.status(200).json({ cart: saveData, message: "cart updated" });
          }
        } else {
          const checkCart = await Cart.find({ user: id });
          const oldCartData = checkCart[0].cartItems;
          checkCart[0].cartItems = [
            ...oldCartData,
            {
              name,
              image,
              qty,
              price,
              countInStock,
              numberOfCans,
              product,
              subscription,
              frequency,
              stripeProductId,
              stripePriceId,
            },
          ];

          const cartItemsLength = checkCart[0].cartItems.length - 1;
          checkCart[0].cartItems[cartItemsLength].itemTotalPrice =
            checkCart[0].cartItems[cartItemsLength].price *
            checkCart[0].cartItems[cartItemsLength].qty;
          let totalPrice = 0;

          checkCart[0].cartItems.map(
            (item) => (totalPrice += item.itemTotalPrice)
          );
          checkCart[0].subtotal = totalPrice;
          const updatedCart = await checkCart[0].save();
          res.status(200).json({ cart: updatedCart, message: "cart updated" });
        }
      }
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getCartById = async (req, res) => {
  try {
    const id = req.params["id"];
    const findCart = await Cart.find({ user: id });
    if (findCart.length < 1) {
      res.status(200).json({ message: "Cart Not Found" });
    } else {
      res.status(200).json({ cart: findCart, message: "Cart found" });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
exports.EmptyCartData = async (req, res) => {
  try {
    const id = req.params["id"];
    const findCart = await Cart.deleteOne({ _id: id });
    res.status(200).json({ message: "Cart Deleted Successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteCartItem = async (req, res) => {
  try {
    const id = req.params["id"];
    const findCart = await Cart.find({ _id: id });
    const objectid = req.params["objid"];
    if (findCart[0].cartItems.length > 0) {
      const removeProduct = findCart[0].cartItems.findIndex(
        (item) => item._id == objectid
      );
      const removed = findCart[0].cartItems.splice(removeProduct, 1);
      let totalPrice = 0;

      findCart[0].cartItems.map((item) => (totalPrice += item.itemTotalPrice));
      findCart[0].subtotal = totalPrice;
      const cart = await findCart[0].save();
      res.status(200).json({ cart: cart, message: "Product removed" });
    } else {
      res.status(200).json({ message: "cart is already empty" });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateQuantity = async (req, res) => {
  try {
    const { plus, minus } = req.body;
    const id = req.params["id"];
    const objectId = req.params["objid"];
    const findCart = await Cart.find({ _id: id });

    const getIndex = findCart[0].cartItems.findIndex(
      (item) => item._id == objectId
    );
    const oldQuantity = findCart[0].cartItems[getIndex].qty;
    if (plus) {
      findCart[0].cartItems[getIndex].qty = oldQuantity + 1;
      findCart[0].cartItems[getIndex].itemTotalPrice =
        findCart[0].cartItems[getIndex].price *
        findCart[0].cartItems[getIndex].qty;

      let totalPrice = 0;

      findCart[0].cartItems.map((item) => (totalPrice += item.itemTotalPrice));
      findCart[0].subtotal = totalPrice;
      const updatedQuantity = await findCart[0].save();

      res
        .status(200)
        .json({ cart: updatedQuantity, message: "Quantity increased" });
    } else if (minus && oldQuantity > 1) {
      findCart[0].cartItems[getIndex].qty = oldQuantity - 1;
      findCart[0].cartItems[getIndex].itemTotalPrice =
        findCart[0].cartItems[getIndex].price *
        findCart[0].cartItems[getIndex].qty;
      let totalPrice = 0;

      findCart[0].cartItems.map((item) => (totalPrice += item.itemTotalPrice));
      findCart[0].subtotal = totalPrice;
      const updatedQuantity = await findCart[0].save();
      res
        .status(200)
        .json({ cart: updatedQuantity, message: "Quantity decreased" });
    } else {
      res
        .status(200)
        .json({ message: "cannot decrease the quantity less than one" });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getCartFromLocal = async (req, res) => {
  try {
    const { cartItems } = req.body;

    const id = req.params["id"];
    const checkCart = await Cart.find({ user: id });

    const {
      name,
      image,
      qty,
      price,
      countInStock,
      numberOfCans,
      product,
      subscription,
      frequency,
      stripeProductId,
      stripePriceId,
    } = cartItems[0];
    if (checkCart.length < 1) {
      const cartData = new Cart({ user: id, cartItems: cartItems });
      // console.log(cartData);
      // cartData.cartItems[0].itemTotalPrice =
      //   cartData.cartItems[0].price * cartData.cartItems[0].qty;
      let totalPrice = 0;

      cartData.cartItems.map((item) => {
        console.log(item);
        item.itemTotalPrice = item.price * item.qty;

        totalPrice += item.itemTotalPrice;
      });
      const saveData = await cartData.save();
      cartData.subtotal = totalPrice;
      const data = await cartData.save();
      res
        .status(200)
        .json({ cart: data, message: "Cart created successfully" });
    } else {
      cartItems.map(async (item) => {
        if (checkCart[0].cartItems.length >= 0) {
          const checkProduct = await Cart.find({
            user: id,
          });
          const getIndex = checkProduct[0].cartItems.findIndex(
            (productItem) => productItem.product == item.product
          );

          const checkFreq = checkProduct[0].cartItems.findIndex(
            (productItem) =>
              productItem.product == item.product &&
              productItem.frequency == item.frequency
          );

          if (checkProduct.length > 0 && getIndex > -1) {
            if (checkFreq < 0) {
              const checkCart = await Cart.find({ user: id });
              const oldCartData = checkCart[0].cartItems;
              checkCart[0].cartItems = [
                ...oldCartData,
                {
                  name: item.name,
                  image: item.image,
                  qty: item.qty,
                  price: item.price,
                  countInStock: item.countInStock,
                  numberOfCans: item.numberOfCans,
                  product: item.product,
                  subscription: item.subscription,
                  frequency: item.frequency,
                  stripeProductId: item.stripeProductId,
                  stripePriceId: item.stripePriceId,
                },
              ];

              const cartItemsLength = checkCart[0].cartItems.length - 1;
              checkCart[0].cartItems[cartItemsLength].itemTotalPrice =
                checkCart[0].cartItems[cartItemsLength].price *
                checkCart[0].cartItems[cartItemsLength].qty;
              let totalPrice = 0;

              checkCart[0].cartItems.map(
                (item) => (totalPrice += item.itemTotalPrice)
              );
              checkCart[0].subtotal = totalPrice;
              const updatedCart = await checkCart[0].save();
            } else {
              const checkCart = await Cart.find({ user: id });
              checkCart[0].cartItems[checkFreq].qty =
                checkCart[0].cartItems[checkFreq].qty + item.qty;

              const updatedCart = await checkCart[0].save();
              checkCart[0].cartItems[checkFreq].itemTotalPrice =
                checkCart[0].cartItems[checkFreq].qty *
                checkCart[0].cartItems[checkFreq].price;
              const saveData = await checkCart[0].save();

              const checkCartToUpdate = await Cart.find({ user: id });
              let totalPrice = 0;

              const addTotalPrice = checkCartToUpdate[0].cartItems.map(
                (item) => (totalPrice += item.itemTotalPrice)
              );
              checkCartToUpdate[0].subtotal = totalPrice;
              const changedCartPrice = await checkCartToUpdate[0].save();
            }
          }
        }
      });

      res.status(200).json({ message: "cart updated successfully" });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
