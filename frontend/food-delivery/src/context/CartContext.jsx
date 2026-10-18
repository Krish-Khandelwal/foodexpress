import React, { createContext, useContext, useState, useEffect } from 'react';

export const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('foodexpress_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('foodexpress_cart', JSON.stringify(cart));
  }, [cart]);

  // Allows adding items from multiple different restaurants in the same order
  const addToCart = (item) => {
    setCart((prevCart) => {
      const existingItemIndex = prevCart.findIndex((i) => i.menuItem === item.menuItem);

      if (existingItemIndex > -1) {
        const newCart = [...prevCart];
        newCart[existingItemIndex] = {
          ...newCart[existingItemIndex],
          quantity: newCart[existingItemIndex].quantity + (item.quantity || 1),
        };
        return newCart;
      }

      return [...prevCart, { ...item, quantity: item.quantity || 1 }];
    });
  };

  const updateQuantity = (menuItemId, delta) => {
    setCart((prevCart) =>
      prevCart
        .map((item) =>
          item.menuItem === menuItemId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (menuItemId) => {
    setCart((prevCart) => prevCart.filter((item) => item.menuItem !== menuItemId));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('foodexpress_cart');
  };

  const cartTotal = cart.reduce(
    (total, item) => total + Number(item.price) * Number(item.quantity),
    0
  );
  const cartCount = cart.reduce((count, item) => count + Number(item.quantity), 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        cartItems: cart,
        cartCount,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};