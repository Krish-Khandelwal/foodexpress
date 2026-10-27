import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';

export const CartContext = createContext();

export const useCart = () => useContext(CartContext);

const getItemShopId = (item) => {
  if (!item) return null;
  if (typeof item.shop === 'object' && item.shop !== null) {
    return item.shop._id || item.shopId || null;
  }
  return item.shop || item.shopId || null;
};

const getItemShopName = (item) => {
  if (!item) return 'Restaurant';
  if (typeof item.shop === 'object' && item.shop !== null) {
    return item.shop.name || item.shopName || 'Restaurant';
  }
  return item.shopName || 'Restaurant';
};

export const CartProvider = ({ children }) => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('foodexpress_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('foodexpress_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const toggleCart = () => setIsCartOpen((prev) => !prev);

  const addToCart = (item) => {
    const incomingShopId = getItemShopId(item);

    if (cartItems.length > 0) {
      const currentShopId = getItemShopId(cartItems[0]);
      if (
        currentShopId &&
        incomingShopId &&
        String(currentShopId) !== String(incomingShopId)
      ) {
        const currentShopName = getItemShopName(cartItems[0]);
        alert(
          `You can only order food from 1 restaurant at a time! Your cart currently has food from "${currentShopName}". Please complete or clear your current order first.`
        );
        return false;
      }
    }

    setCartItems((prev) => {
      const exists = prev.find((i) => i._id === item._id);
      if (exists) {
        return prev.map((i) =>
          i._id === item._id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          ...item,
          shopId: incomingShopId,
          shopName: getItemShopName(item),
          quantity: item.quantity ? Number(item.quantity) : 1,
        },
      ];
    });
    return true;
  };

  const removeFromCart = (id) => {
    setCartItems((prev) => prev.filter((item) => item._id !== id));
  };

  const updateQuantity = (id, delta) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item._id === id
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => {
    setCartItems([]);
    localStorage.removeItem('foodexpress_cart');
  };

  const cartTotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1),
        0
      ),
    [cartItems]
  );

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.quantity || 1), 0),
    [cartItems]
  );

  return (
    <CartContext.Provider
      value={{
        cartItems,
        isCartOpen,
        setIsCartOpen,
        toggleCart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export default CartContext;